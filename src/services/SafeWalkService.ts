/**
 * SafeWalkService.ts
 * ---------------------------------------------------------------------------
 * Guardian MAYURI — Environmental Risk Sentinel (pre-computed VIIRS + OSM
 *                    dark-zone lookup — NOT a live phone sensor)
 * Guardian RIYA   — Emergency Dispatch & Escalation Daemon
 *
 * ARCHITECTURE LOCK (supersedes the original phone-sensor design): Guardian
 * Mayuri no longer reads the device's ambient light sensor. The locked
 * architecture sources dark-zone data from NASA VIIRS night-radiance +
 * OpenStreetMap street-lighting tags, pre-computed server-side into the
 * `dark_zone_samples` geohash grid by a scheduled backend job — never by
 * the client. This file's job is simpler and more useful than the old
 * design: periodically check the walker's live GPS position against that
 * precomputed grid and surface a warning if they enter a flagged zone.
 * There is no sensor to throttle, no iOS capability gap, and no client
 * write path into a public trust signal to abuse.
 *
 * ROLE-SWAP NOTE: per the locked architecture, RIYA owns the 30s heartbeat
 * + missed-heartbeat escalation logic originally drafted under "Pushpa."
 * PUSHPA owns the peer-accompaniment / stealth-companion role (the
 * disguised-calculator screen that calls `SafeWalkService.endSession()`
 * below) originally drafted under "Riya." This file implements Mayuri's
 * live zone-check + the new Riya; the calculator UI belongs in
 * `guardians/pushpa/`.
 * ---------------------------------------------------------------------------
 * Non-negotiable design constraints:
 *
 * 1. Heartbeat "escalation" is never decided on-device. This file only ever
 *    reports `last_heartbeat_at`. The timeout detection and contact
 *    notification happen server-side (pg_cron + Edge Function — see
 *    `check_missed_heartbeats()` in the schema), because a dead, seized, or
 *    powered-off phone can never be trusted to escalate on itself.
 *
 * 2. The client has a read-only relationship with `dark_zone_samples`. RLS
 *    on that table blocks every client insert/update outright — the grid is
 *    populated exclusively by a scheduled VIIRS/OSM sync job using the
 *    service role. This closes the exact "unauthenticated write corrupts a
 *    public trust signal" bug found in the MVP audit's `community_adjustment`
 *    logic, and removes it as a class of problem entirely rather than just
 *    patching it.
 * ---------------------------------------------------------------------------
 */

import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import { supabase } from "./supabaseClient";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LOCATION_TASK_NAME = "narix-mayuri-location-task";
const HEARTBEAT_INTERVAL_MS = 30_000;

// Degrees, not meters — a cheap bounding-box margin for the dark-zone grid
// lookup. ~0.003° latitude is roughly 300m, wide enough to catch the grid
// cell the walker is currently in without needing a client-side geohash
// implementation that has to stay byte-for-byte identical to the backend's.
const ZONE_CHECK_MARGIN_DEG = 0.003;

// How often, in heartbeat ticks, Mayuri re-checks the precomputed grid
// against the current position. Every tick would be wasteful; every 2nd
// tick (60s) is frequent enough for a walking pace.
const ZONE_CHECK_EVERY_N_HEARTBEATS = 2;

const SAFE_PIN_KEY = "narix_safe_pin_hash";
const DURESS_PIN_KEY = "narix_duress_pin_hash";

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------
// `expo-task-manager` invokes LOCATION_TASK_NAME outside of any React
// component's lifecycle, so shared session state has to live at module
// scope rather than inside a class instance the task can't see.

let activeSessionId: string | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let heartbeatTickCount = 0;

export interface ZoneWarning {
  lat: number;
  lng: number;
  avgLux: number;
  sampleCount: number;
}

// UI registers here to receive a live "you've entered a flagged dark zone"
// event. Kept as a plain callback rather than an event-emitter dependency to
// keep this file dependency-light.
let zoneWarningCallback: ((warning: ZoneWarning) => void) | null = null;

// ---------------------------------------------------------------------------
// Background location task (module scope — required by expo-task-manager)
// ---------------------------------------------------------------------------

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error("[Riya] Location task error:", error.message);
    return;
  }
  if (!activeSessionId) return; // stray update with no active Safe Walk session

  const { locations } = data as { locations: Location.LocationObject[] };
  const latest = locations?.[locations.length - 1];
  if (!latest) return;

  // Mayuri's live role: periodically check the precomputed VIIRS+OSM grid
  // against the current position. This is a read-only lookup — nothing is
  // sensed or written on-device.
  heartbeatTickCount += 1;
  if (heartbeatTickCount % ZONE_CHECK_EVERY_N_HEARTBEATS === 0) {
    await checkZoneRisk(latest.coords.latitude, latest.coords.longitude);
  }
});

/**
 * Guardian Mayuri — read-only lookup against the pre-computed dark-zone
 * grid. `dark_zone_samples` is populated exclusively by a scheduled
 * VIIRS/OSM sync job using the service role; RLS blocks every client write,
 * so this function only ever selects.
 */
async function checkZoneRisk(lat: number, lng: number): Promise<void> {
  try {
    const { data, error } = await supabase
      .from("dark_zone_samples")
      .select("center_lat, center_lng, avg_lux, sample_count")
      .gte("center_lat", lat - ZONE_CHECK_MARGIN_DEG)
      .lte("center_lat", lat + ZONE_CHECK_MARGIN_DEG)
      .gte("center_lng", lng - ZONE_CHECK_MARGIN_DEG)
      .lte("center_lng", lng + ZONE_CHECK_MARGIN_DEG)
      .order("avg_lux", { ascending: true })
      .limit(1);

    if (error) {
      console.warn("[Mayuri] Zone risk lookup failed:", error.message);
      return;
    }

    const flaggedZone = data?.[0];
    if (flaggedZone && zoneWarningCallback) {
      zoneWarningCallback({
        lat: flaggedZone.center_lat,
        lng: flaggedZone.center_lng,
        avgLux: flaggedZone.avg_lux,
        sampleCount: flaggedZone.sample_count,
      });
    }
  } catch (err) {
    // Non-fatal — the next tick retries naturally as the user keeps moving.
    console.warn("[Mayuri] Zone risk lookup threw:", err);
  }
}

// ---------------------------------------------------------------------------
// Heartbeat (Guardian Riya)
// ---------------------------------------------------------------------------

async function emitHeartbeat() {
  if (!activeSessionId) return;

  const { error: heartbeatError } = await supabase
    .from("safe_walk_sessions")
    .update({ last_heartbeat_at: new Date().toISOString() })
    .eq("id", activeSessionId);

  if (heartbeatError) {
    // Deliberately not thrown — a transient network blip should not tear
    // down the session. The server-side watchdog has a 90s grace window
    // (3 missed beats) specifically to absorb this.
    console.warn(
      "[Riya] Heartbeat write failed, will retry in",
      HEARTBEAT_INTERVAL_MS / 1000,
      "s:",
      heartbeatError.message
    );
  }

  const lastKnown = await Location.getLastKnownPositionAsync();
  if (lastKnown) {
    const { error: pingError } = await supabase.from("safe_walk_pings").insert({
      session_id: activeSessionId,
      lat: lastKnown.coords.latitude,
      lng: lastKnown.coords.longitude,
      recorded_at: new Date().toISOString(),
    });
    if (pingError) {
      console.warn("[Riya] Telemetry ping insert failed:", pingError.message);
    }
  }
}

// ---------------------------------------------------------------------------
// Public service
// ---------------------------------------------------------------------------

class SafeWalkServiceImpl {
  /** True while a Safe Walk session is active on this device. */
  get isActive(): boolean {
    return activeSessionId !== null;
  }

  get currentSessionId(): string | null {
    return activeSessionId;
  }

  /**
   * Requests the permissions Safe Walk needs. Background permission is
   * required for `startLocationUpdatesAsync` to survive the screen locking.
   */
  async requestPermissions(): Promise<boolean> {
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== "granted") return false;

    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    return bgStatus === "granted";
  }

  /**
   * Starts a Safe Walk session: creates the DB row, subscribes to the light
   * sensor, starts foreground-service location tracking, and begins the
   * 30s heartbeat loop.
   */
  async startSession(destination: {
    lat: number;
    lng: number;
    label?: string;
  }): Promise<string> {
    if (activeSessionId) {
      throw new Error("A Safe Walk session is already active on this device.");
    }

    const hasPermissions = await this.requestPermissions();
    if (!hasPermissions) {
      throw new Error(
        'NariX needs location access, including "Allow all the time," to run Safe Walk.'
      );
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("Not authenticated — cannot start a Safe Walk session.");
    }

    const { data, error } = await supabase
      .from("safe_walk_sessions")
      .insert({
        user_id: user.id,
        destination_lat: destination.lat,
        destination_lng: destination.lng,
        destination_label: destination.label ?? null,
        status: "active",
        last_heartbeat_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error || !data) {
      throw new Error(`Could not start Safe Walk session: ${error?.message ?? "unknown error"}`);
    }

    activeSessionId = data.id as string;
    heartbeatTickCount = 0;

    await this.startLocationTracking();
    this.startHeartbeatLoop();

    return activeSessionId;
  }

  /** UI calls this to receive a live warning when Mayuri's grid lookup
   * flags the walker's current position as a precomputed dark zone. */
  onZoneWarning(callback: (warning: ZoneWarning) => void): void {
    zoneWarningCallback = callback;
  }

  private async startLocationTracking(): Promise<void> {
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 10_000,
      distanceInterval: 15,
      showsBackgroundLocationIndicator: true,
      pausesUpdatesAutomatically: false,
      foregroundService: {
        notificationTitle: "NariX Safe Walk is active",
        notificationBody:
          "Sharing your live location with your trusted contacts until you arrive.",
        notificationColor: "#f95a47",
      },
    });
  }

  private startHeartbeatLoop(): void {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    void emitHeartbeat(); // fire immediately, then every 30s
    heartbeatTimer = setInterval(() => {
      void emitHeartbeat();
    }, HEARTBEAT_INTERVAL_MS);
  }

  /**
   * Ends the active session — OR silently escalates — depending on which
   * PIN was entered. The caller (UI) always receives the same `{ ok: true }`
   * shape, so a phone screen glanced at by an attacker shows no visible
   * difference between a real cancellation and a duress trigger.
   */
  async endSession(enteredPin: string): Promise<{ ok: true }> {
    const [safePinHash, duressPinHash] = await Promise.all([
      SecureStore.getItemAsync(SAFE_PIN_KEY),
      SecureStore.getItemAsync(DURESS_PIN_KEY),
    ]);

    const enteredHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      enteredPin
    );

    if (duressPinHash && enteredHash === duressPinHash) {
      await this.triggerSilentEscalation("duress_pin");
    } else if (!safePinHash || enteredHash === safePinHash) {
      // No PIN configured yet, or the correct safe PIN — end normally.
      await this.gracefulShutdown();
    }
    // Wrong PIN entirely: fail closed — the session keeps running, but we
    // still return `ok: true` so nothing on-screen hints that anything
    // failed to an onlooker.

    return { ok: true };
  }

  private async gracefulShutdown(): Promise<void> {
    if (activeSessionId) {
      const { error } = await supabase
        .from("safe_walk_sessions")
        .update({ status: "completed", ended_at: new Date().toISOString() })
        .eq("id", activeSessionId);
      if (error) console.warn("[Riya] Graceful session close failed:", error.message);
    }
    await this.teardown();
  }

  private async triggerSilentEscalation(triggerType: "duress_pin"): Promise<void> {
    if (!activeSessionId) return;

    const lastKnown = await Location.getLastKnownPositionAsync();

    const { error: sessionError } = await supabase
      .from("safe_walk_sessions")
      .update({ status: "escalated" })
      .eq("id", activeSessionId);
    if (sessionError) console.error("[Riya] Failed to mark session escalated:", sessionError.message);

    const { error: incidentError } = await supabase.from("sos_incidents").insert({
      session_id: activeSessionId,
      trigger_type: triggerType,
      lat: lastKnown?.coords.latitude ?? null,
      lng: lastKnown?.coords.longitude ?? null,
      status: "active",
    });
    if (incidentError) console.error("[Riya] Failed to file duress incident:", incidentError.message);

    // Intentionally do NOT tear down tracking here. The phone is still
    // moving with the person (or their attacker) — that live signal is now
    // the highest-value data Central Command has, so Mayuri and the
    // heartbeat loop both keep running after a duress trigger.
  }

  private async teardown(): Promise<void> {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }

    const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    if (isRegistered) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }

    activeSessionId = null;
    heartbeatTickCount = 0;
    zoneWarningCallback = null;
  }
}

export const SafeWalkService = new SafeWalkServiceImpl();
