import { useState, useEffect, useCallback } from "react";
import { BatteryLow, WifiOff, Wifi, HeartOff, X, Send, Clock, AlertTriangle, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface DemoControlPanelProps {
  userLocation: { lat: number; lng: number } | null;
  onClose: () => void;
}

export default function DemoControlPanel({ userLocation, onClose }: DemoControlPanelProps) {
  const [lastKnownLocation, setLastKnownLocation] = useState<{ lat: number; lng: number; timestamp: string } | null>(null);
  const [deadManTimer, setDeadManTimer] = useState<number | null>(null);
  const [deadManSeconds, setDeadManSeconds] = useState(300);
  const [signalLostQueue, setSignalLostQueue] = useState<{ lat: number; lng: number; timestamp: string } | null>(null);
  const [log, setLog] = useState<string[]>([]);

  // Load cached location from localStorage
  useEffect(() => {
    const cached = localStorage.getItem("narix_last_location");
    if (cached) {
      setLastKnownLocation(JSON.parse(cached));
    }
  }, []);

  // Cache location every 1-2 minutes
  useEffect(() => {
    if (!userLocation) return;
    const cache = () => {
      const entry = {
        lat: userLocation.lat,
        lng: userLocation.lng,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem("narix_last_location", JSON.stringify(entry));
      setLastKnownLocation(entry);
    };
    cache();
    const interval = setInterval(cache, 90000);
    return () => clearInterval(interval);
  }, [userLocation]);

  // Dead man's switch countdown
  useEffect(() => {
    if (deadManTimer === null) return;
    if (deadManSeconds <= 0) {
      triggerDeadMan();
      setDeadManTimer(null);
      setDeadManSeconds(300);
      return;
    }
    const t = setTimeout(() => setDeadManSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [deadManTimer, deadManSeconds]);

  const addLog = (msg: string) => {
    setLog((prev) => [`${new Date().toLocaleTimeString("en-IN")} — ${msg}`, ...prev].slice(0, 10));
  };

  const triggerLowBattery = async () => {
    const loc = lastKnownLocation || userLocation;
    if (!loc) {
      addLog("No cached location available");
      return;
    }
    const timestamp = lastKnownLocation?.timestamp || new Date().toISOString();

    const { data: alertData } = await supabase
      .from("sos_alerts")
      .insert({
        lat: loc.lat,
        lng: loc.lng,
        location_label: `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`,
        timestamp,
        original_timestamp: timestamp,
        status: "active",
        trigger_type: "low_battery",
        message: "Auto-alert: Low battery detected, last known location sent",
      })
      .select()
      .single();

    // Send email
    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-sos-email`;
      await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contacts: [],
          lat: loc.lat,
          lng: loc.lng,
          timestamp,
          locationLabel: `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)} (last known)`,
          customMessage: "Low battery alert: The user's phone is running low on power. Last known location shared automatically.",
        }),
      });
    } catch {
      // Demo continues even if email fails
    }

    await supabase.from("sos_log").insert({
      alert_id: alertData?.id ?? null,
      action: "low_battery_alert",
      message: `Low battery → auto-sent last location (${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)})`,
    });

    addLog(`Low battery: auto-sent last location at ${timestamp}`);
  };

  const triggerSignalLost = () => {
    const loc = lastKnownLocation || userLocation;
    if (!loc) {
      addLog("No cached location available");
      return;
    }
    const timestamp = new Date().toISOString();
    setSignalLostQueue({ lat: loc.lat, lng: loc.lng, timestamp });
    addLog(`Signal lost: queued alert at ${timestamp} (preserving original timestamp)`);
  };

  const restoreSignal = async () => {
    if (!signalLostQueue) return;
    const { lat, lng, timestamp } = signalLostQueue;

    const { data: alertData } = await supabase
      .from("sos_alerts")
      .insert({
        lat,
        lng,
        location_label: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        timestamp,
        original_timestamp: timestamp,
        status: "active",
        trigger_type: "signal_lost",
        message: "Signal restored: queued alert sent with original timestamp",
      })
      .select()
      .single();

    await supabase.from("sos_log").insert({
      alert_id: alertData?.id ?? null,
      action: "signal_restored",
      message: `Signal restored → sent queued alert (original time: ${new Date(timestamp).toLocaleTimeString("en-IN")})`,
    });

    addLog(`Signal restored: sent queued alert with original timestamp ${new Date(timestamp).toLocaleTimeString("en-IN")}`);
    setSignalLostQueue(null);
  };

  const startDeadMan = () => {
    setDeadManSeconds(300);
    setDeadManTimer(1);
    addLog("Dead man's switch activated: 5-minute countdown started");
  };

  const cancelDeadMan = () => {
    setDeadManTimer(null);
    setDeadManSeconds(300);
    addLog("Dead man's switch cancelled within grace window");
  };

  const triggerDeadMan = async () => {
    const loc = lastKnownLocation || userLocation;
    if (!loc) return;
    const timestamp = new Date().toISOString();

    const { data: alertData } = await supabase
      .from("sos_alerts")
      .insert({
        lat: loc.lat,
        lng: loc.lng,
        location_label: `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`,
        timestamp,
        status: "active",
        trigger_type: "dead_man",
        message: "No check-in: dead man's switch triggered after grace window",
      })
      .select()
      .single();

    await supabase.from("sos_log").insert({
      alert_id: alertData?.id ?? null,
      action: "dead_man_triggered",
      message: `No check-in → dead man's switch fired (last location: ${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)})`,
    });

    addLog("Dead man's switch: alert sent — no check-in received within 5 minutes");
  };

  const formatTime = (s: number): string => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-slate-950/95 overflow-y-auto p-4 animate-fade-in">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white text-lg font-bold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            Demo Control Panel
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <p className="text-slate-400 text-xs mb-6">
          Hidden dev panel to simulate poor-connectivity scenarios. GPS is cached locally every 90 seconds.
        </p>

        {/* Last known location */}
        <div className="glass-card p-4 mb-4">
          <h3 className="text-slate-300 text-sm font-semibold mb-2">Last Known Location (Cached)</h3>
          {lastKnownLocation ? (
            <div className="text-sm">
              <p className="text-teal-400 font-mono">
                {lastKnownLocation.lat.toFixed(4)}, {lastKnownLocation.lng.toFixed(4)}
              </p>
              <p className="text-slate-500 text-xs mt-1">
                Cached at {new Date(lastKnownLocation.timestamp).toLocaleString("en-IN")}
              </p>
            </div>
          ) : (
            <p className="text-slate-500 text-sm">No location cached yet.</p>
          )}
        </div>

        {/* Scenario triggers */}
        <div className="space-y-3 mb-4">
          {/* Low battery */}
          <div className="glass-card p-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <BatteryLow className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-white text-sm font-semibold">Low Battery</h3>
                <p className="text-slate-400 text-xs">Auto-sends last known location via email</p>
              </div>
            </div>
            <button
              onClick={triggerLowBattery}
              className="w-full bg-amber-500/20 text-amber-400 py-2 rounded-lg text-sm font-medium hover:bg-amber-500/30 transition-colors flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              Simulate Low Battery
            </button>
          </div>

          {/* Signal lost */}
          <div className="glass-card p-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-coral-500/20 flex items-center justify-center flex-shrink-0">
                <WifiOff className="w-5 h-5 text-coral-400" />
              </div>
              <div>
                <h3 className="text-white text-sm font-semibold">Signal Lost</h3>
                <p className="text-slate-400 text-xs">Queue alert, then send on restore with original timestamp</p>
              </div>
            </div>
            {signalLostQueue ? (
              <button
                onClick={restoreSignal}
                className="w-full bg-green-500/20 text-green-400 py-2 rounded-lg text-sm font-medium hover:bg-green-500/30 transition-colors flex items-center justify-center gap-2"
              >
                <Wifi className="w-4 h-4" />
                Restore Signal & Send
              </button>
            ) : (
              <button
                onClick={triggerSignalLost}
                className="w-full bg-coral-500/20 text-coral-400 py-2 rounded-lg text-sm font-medium hover:bg-coral-500/30 transition-colors flex items-center justify-center gap-2"
              >
                <WifiOff className="w-4 h-4" />
                Simulate Signal Lost
              </button>
            )}
          </div>

          {/* Dead man's switch */}
          <div className="glass-card p-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <HeartOff className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-white text-sm font-semibold">Dead Man's Switch</h3>
                <p className="text-slate-400 text-xs">5-minute countdown with cancel grace window</p>
              </div>
            </div>
            {deadManTimer !== null ? (
              <div>
                <div className="text-center mb-2">
                  <span className="text-2xl font-bold text-red-400 font-mono">
                    {formatTime(deadManSeconds)}
                  </span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full bg-red-500 rounded-full transition-all duration-1000"
                    style={{ width: `${(deadManSeconds / 300) * 100}%` }}
                  />
                </div>
                <button
                  onClick={cancelDeadMan}
                  className="w-full bg-green-500/20 text-green-400 py-2 rounded-lg text-sm font-medium hover:bg-green-500/30 transition-colors flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Cancel (Grace Window)
                </button>
              </div>
            ) : (
              <button
                onClick={startDeadMan}
                className="w-full bg-red-500/20 text-red-400 py-2 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors flex items-center justify-center gap-2"
              >
                <HeartOff className="w-4 h-4" />
                Start Dead Man's Switch
              </button>
            )}
          </div>
        </div>

        {/* Log */}
        <div className="glass-card p-4">
          <h3 className="text-slate-300 text-sm font-semibold mb-2 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Event Log
          </h3>
          {log.length === 0 ? (
            <p className="text-slate-500 text-xs">No events triggered yet.</p>
          ) : (
            <div className="space-y-1">
              {log.map((entry, i) => (
                <p key={i} className="text-slate-400 text-xs font-mono">{entry}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

