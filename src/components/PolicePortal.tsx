import { useState, useEffect, useCallback } from "react";
import {
  Shield,
  AlertTriangle,
  Check,
  Clock,
  MapPin,
  BarChart3,
  Activity,
  Phone,
  Radio,
  Flag,
  Zap,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Zone, SosAlert, AuthorityAck } from "@/types";
import { computeScore, scoreColor, scoreLabel } from "@/lib/safetyScore";

interface PolicePortalProps {
  zones: Zone[];
}

// Bengaluru authority contacts (static)
const BENGALURU_CONTACTS = [
  { label: "Koramangala Police Station", number: "080-2294 2570", icon: "police" },
  { label: "Bengaluru City Police CP Office", number: "080-2294 2222", icon: "police" },
  { label: "PCR (Police Control Room)", number: "100", icon: "pcr" },
  { label: "Bowring Hospital (Emergency)", number: "080-2559 1362", icon: "hospital" },
  { label: "Women Helpline (Vanitha Sahayavani)", number: "1091", icon: "helpline" },
];

// Dummy recent incidents per zone name (for demo)
const DUMMY_INCIDENTS: Record<string, { text: string; time: string }[]> = {
  "Kopri Bridge Area": [
    { text: "Unlit underbridge reported", time: "Today, 11:20 PM" },
    { text: "Suspicious vehicle parked", time: "Yesterday, 10:45 PM" },
  ],
  "Navi Pada / Balkum": [
    { text: "Street light outage — 3 poles", time: "Today, 9:00 PM" },
    { text: "Harassment complaint filed", time: "2 days ago" },
  ],
  "Parsik Nagar": [
    { text: "Dark alley near school reported", time: "Yesterday, 8:30 PM" },
  ],
  "Cadbury Junction": [
    { text: "All clear — increased patrol", time: "Today, 8:00 PM" },
  ],
};

// Zones with score < 4.5 flagged for patrol
const PATROL_THRESHOLD = 4.5;

export default function PolicePortal({ zones }: PolicePortalProps) {
  const [alerts, setAlerts] = useState<SosAlert[]>([]);
  const [acks, setAcks] = useState<AuthorityAck[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);

  const loadAlerts = useCallback(async () => {
    const { data } = await supabase
      .from("sos_alerts")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(20);
    
    if (data && data.length > 0) {
      setAlerts(data as SosAlert[]);
    } else {
      // Seed demo data if empty
      setAlerts([
        {
          id: "demo-alert-1",
          lat: 12.9352,
          lng: 77.6245,
          location_label: "Koramangala 5th Block",
          timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
          original_timestamp: null,
          status: "active",
          trigger_type: "manual",
          message: "Emergency SOS triggered by user",
          created_at: new Date(Date.now() - 15 * 60000).toISOString(),
        },
        {
          id: "demo-alert-2",
          lat: 12.9279,
          lng: 77.6271,
          location_label: "Madiwala Checkpost",
          timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
          original_timestamp: null,
          status: "acknowledged",
          trigger_type: "low_battery",
          message: "Auto-alert: Device battery critical (5%)",
          created_at: new Date(Date.now() - 45 * 60000).toISOString(),
        }
      ]);
    }
    setLoading(false);
  }, []);

  const loadAcks = useCallback(async () => {
    const { data } = await supabase
      .from("authority_acknowledgements")
      .select("*")
      .order("timestamp", { ascending: false });
    if (data) setAcks(data as AuthorityAck[]);
  }, []);

  useEffect(() => {
    // Initial load
    loadAlerts();
    loadAcks();

    // ── Supabase Realtime subscription (replaces setInterval polling) ──
    const channel = supabase
      .channel("police-portal-sos")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sos_alerts" },
        () => {
          loadAlerts();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "authority_acknowledgements" },
        () => {
          loadAcks();
        }
      )
      .subscribe((status) => {
        setIsLive(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadAlerts, loadAcks]);

  const acknowledge = async (alertId: string) => {
    await supabase.from("authority_acknowledgements").insert({
      alert_id: alertId,
      officer_name: "Inspector Sharma",
    });
    await supabase
      .from("sos_alerts")
      .update({ status: "acknowledged" })
      .eq("id", alertId);
    loadAlerts();
    loadAcks();
  };

  // Aggregate zone scores sorted lowest-first
  const zoneScores = zones
    .map((zone) => {
      const dayScore = computeScore(zone, "day");
      const nightScore = computeScore(zone, "night");
      const avgScore =
        Math.round(((dayScore.total + nightScore.total) / 2) * 10) / 10;
      return {
        zone,
        dayScore: dayScore.total,
        nightScore: nightScore.total,
        avgScore,
        patrolRequired: avgScore < PATROL_THRESHOLD,
      };
    })
    .sort((a, b) => a.avgScore - b.avgScore);

  const activeAlerts = alerts.filter((a) => a.status === "active");
  const ackedAlertIds = new Set(acks.map((a) => a.alert_id));

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-b from-slate-900 to-slate-950 p-4 pb-20">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center">
              <Shield className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-white text-lg font-bold">Authority Portal</h2>
              <p className="text-slate-400 text-xs">
                Aggregated safety data — no personal info
              </p>
            </div>
          </div>
          {/* Live badge */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
              isLive
                ? "bg-green-500/20 text-green-400"
                : "bg-slate-700/60 text-slate-500"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isLive ? "bg-green-400 animate-pulse" : "bg-slate-500"
              }`}
            />
            {isLive ? "Live" : "Connected (Demo)"}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <div className="glass-card p-3 text-center">
            <p className="text-2xl font-bold text-coral-400">
              {activeAlerts.length}
            </p>
            <p className="text-xs text-slate-400 mt-1">Active Alerts</p>
          </div>
          <div className="glass-card p-3 text-center">
            <p className="text-2xl font-bold text-yellow-400">
              {zoneScores.filter((z) => z.avgScore < PATROL_THRESHOLD).length}
            </p>
            <p className="text-xs text-slate-400 mt-1">High-Risk Zones</p>
          </div>
          <div className="glass-card p-3 text-center">
            <p className="text-2xl font-bold text-teal-400">{acks.length}</p>
            <p className="text-xs text-slate-400 mt-1">Acknowledged</p>
          </div>
        </div>

        {/* Bengaluru authority contacts */}
        <div className="mb-6">
          <h3 className="text-slate-300 text-sm font-semibold mb-3 flex items-center gap-2">
            <Phone className="w-4 h-4" />
            Bengaluru Authority Contacts
          </h3>
          <div className="glass-card divide-y divide-white/5">
            {BENGALURU_CONTACTS.map((c) => (
              <div key={c.label} className="flex items-center justify-between px-3 py-2.5">
                <div className="flex items-center gap-2">
                  {c.icon === "pcr" ? (
                    <Radio className="w-3.5 h-3.5 text-blue-400" />
                  ) : c.icon === "hospital" ? (
                    <Shield className="w-3.5 h-3.5 text-green-400" />
                  ) : c.icon === "helpline" ? (
                    <Zap className="w-3.5 h-3.5 text-coral-400" />
                  ) : (
                    <Shield className="w-3.5 h-3.5 text-blue-400" />
                  )}
                  <span className="text-slate-300 text-xs">{c.label}</span>
                </div>
                <a
                  href={`tel:${c.number.replace(/[^0-9]/g, "")}`}
                  className="text-teal-400 text-xs font-mono font-semibold hover:text-teal-300 transition-colors"
                >
                  {c.number}
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Zone rankings with patrol flag + incidents */}
        <div className="mb-6">
          <h3 className="text-slate-300 text-sm font-semibold mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Zone Safety Rankings (Lowest First)
          </h3>
          <div className="space-y-2">
            {zoneScores.map((zs, i) => {
              const color = scoreColor(zs.avgScore);
              const incidents = DUMMY_INCIDENTS[zs.zone.name] ?? [];
              return (
                <div key={zs.zone.id} className="glass-card p-3">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500 font-bold text-sm w-6">
                      #{i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white text-sm font-medium truncate">
                          {zs.zone.name}
                        </p>
                        {zs.patrolRequired && (
                          <span className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 shrink-0">
                            <Flag className="w-2.5 h-2.5" />
                            Patrol
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-amber-500">
                          Day: {zs.dayScore}
                        </span>
                        <span className="text-xs text-indigo-400">
                          Night: {zs.nightScore}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: color }}
                      >
                        {zs.avgScore}
                      </div>
                      <span className="text-xs text-slate-400 mt-0.5 block">
                        {scoreLabel(zs.avgScore)}
                      </span>
                    </div>
                  </div>

                  {/* Hotspot incidents for this zone */}
                  {incidents.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
                      {incidents.map((inc, ii) => (
                        <div
                          key={ii}
                          className="flex items-center justify-between"
                        >
                          <p className="text-slate-400 text-xs">{inc.text}</p>
                          <span className="text-slate-600 text-[10px] shrink-0 ml-2">
                            {inc.time}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Live SOS feed */}
        <div>
          <h3 className="text-slate-300 text-sm font-semibold mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Live SOS Alert Feed
          </h3>
          {loading ? (
            <p className="text-slate-500 text-sm text-center py-4">
              Loading alerts…
            </p>
          ) : alerts.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-4 glass-card p-4">
              No alerts in the system. Trigger an SOS from the app to see it
              here in real time.
            </p>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert) => {
                const isAcked =
                  ackedAlertIds.has(alert.id) ||
                  alert.status === "acknowledged";
                return (
                  <div
                    key={alert.id}
                    className={`glass-card p-3 border-l-4 ${
                      isAcked
                        ? "border-l-green-500 opacity-60"
                        : "border-l-coral-500"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {isAcked ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-coral-400 animate-pulse" />
                        )}
                        <span className="text-white text-sm font-medium">
                          {alert.trigger_type === "manual"
                            ? "SOS Alert"
                            : alert.trigger_type.replace("_", " ")}
                        </span>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          isAcked
                            ? "bg-green-500/20 text-green-400"
                            : "bg-coral-500/20 text-coral-400"
                        }`}
                      >
                        {isAcked ? "Acknowledged" : "Active"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(alert.timestamp).toLocaleString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                      {alert.location_label && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {alert.location_label}
                        </span>
                      )}
                    </div>
                    {!isAcked && (
                      <button
                        onClick={() => acknowledge(alert.id)}
                        className="mt-2 w-full bg-blue-600/20 text-blue-400 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-600/30 transition-colors flex items-center justify-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Acknowledge Alert
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <p className="text-xs text-slate-500 text-center mt-4">
          No personal user data or identity shown — aggregate scores and alert
          metadata only.
        </p>
      </div>
    </div>
  );
}
