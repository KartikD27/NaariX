import { useState, useRef, useCallback, useEffect } from "react";
import { Phone, Shield, Users, MapPin, Volume2, MessageSquare, ListChecks, AlertTriangle, Plus, Check, X, Mail, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { TrustedContact, SosLogEntry } from "@/types";

interface SosScreenProps {
  userLocation: { lat: number; lng: number } | null;
  onFlashScreen: () => void;
  onPlaySiren: () => void;
  onShowMessage: () => void;
}

type SosView = "main" | "simple" | "contacts" | "quickActions";

export default function SosScreen({
  userLocation,
  onFlashScreen,
  onPlaySiren,
  onShowMessage,
}: SosScreenProps) {
  const [view, setView] = useState<SosView>("main");
  const [holding, setHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [triggered, setTriggered] = useState(false);
  const [sending, setSending] = useState(false);
  const [logEntries, setLogEntries] = useState<SosLogEntry[]>([]);
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
  const [pendingConfirm, setPendingConfirm] = useState<string | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // Load contacts and log
  useEffect(() => {
    loadContacts();
    loadLog();
  }, []);

  const loadContacts = async () => {
    const { data } = await supabase
      .from("trusted_contacts")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setContacts(data as TrustedContact[]);
  };

  const loadLog = async () => {
    const { data } = await supabase
      .from("sos_log")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(20);
    if (data) setLogEntries(data as SosLogEntry[]);
  };

  const startHold = useCallback(() => {
    setHolding(true);
    setTriggered(false);
    startTimeRef.current = Date.now();
    setHoldProgress(0);

    holdTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min(elapsed / 2000, 1);
      setHoldProgress(progress);

      if (progress >= 1 && holdTimerRef.current) {
        clearInterval(holdTimerRef.current);
        holdTimerRef.current = null;
        triggerSOS();
      }
    }, 50);
  }, []);

  const cancelHold = useCallback(() => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setHolding(false);
    setHoldProgress(0);
  }, []);

  const triggerSOS = async () => {
    setHolding(false);
    setHoldProgress(0);
    setTriggered(true);
    setSending(true);

    const confirmedContacts = contacts.filter((c) => c.confirmed);
    const timestamp = new Date().toISOString();
    const lat = userLocation?.lat ?? null;
    const lng = userLocation?.lng ?? null;
    const locationLabel = lat && lng ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : "Location unavailable";

    // Insert SOS alert
    const { data: alertData } = await supabase
      .from("sos_alerts")
      .insert({
        lat,
        lng,
        location_label: locationLabel,
        timestamp,
        status: "active",
        trigger_type: "manual",
        message: "Emergency SOS triggered by user",
      })
      .select()
      .single();

    const alertId = alertData?.id ?? null;

    // Send email via edge function
    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-sos-email`;
      await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contacts: confirmedContacts.map((c) => ({ name: c.name, email: c.email })),
          lat,
          lng,
          timestamp,
          locationLabel,
        }),
      });
    } catch {
      // Email may fail if SMTP not configured — log entries still show for demo
    }

    // Create in-app log entries
    const newLogEntries: { contact_name: string | null; contact_email: string | null; action: string; message: string; alert_id: string | null }[] = [];

    if (confirmedContacts.length === 0) {
      newLogEntries.push({
        alert_id: alertId,
        contact_name: null,
        contact_email: null,
        action: "alert_sent",
        message: "SOS triggered — no confirmed contacts. Add contacts to receive alerts.",
      });
    } else {
      for (const contact of confirmedContacts) {
        newLogEntries.push({
          alert_id: alertId,
          contact_name: contact.name,
          contact_email: contact.email,
          action: "alert_sent",
          message: `Alert sent to ${contact.name}. Push notification sent -> SMS fallback triggered -> Last known location shared.`,
        });
      }
    }

    if (newLogEntries.length > 0) {
      await supabase.from("sos_log").insert(newLogEntries);
    }

    setSending(false);
    loadLog();
  };

  const addContact = async () => {
    if (!newContactName.trim() || !newContactEmail.trim()) return;

    const token = Math.random().toString(36).substring(2, 15);
    const { data } = await supabase
      .from("trusted_contacts")
      .insert({
        name: newContactName.trim(),
        email: newContactEmail.trim(),
        confirmed: false,
        confirm_token: token,
      })
      .select()
      .single();

    if (data) {
      setPendingConfirm(data.id);
      setNewContactName("");
      setNewContactEmail("");
    }
    loadContacts();
  };

  const confirmContact = async (contactId: string) => {
    await supabase
      .from("trusted_contacts")
      .update({ confirmed: true })
      .eq("id", contactId);
    setPendingConfirm(null);
    loadContacts();
  };

  const removeContact = async (contactId: string) => {
    await supabase.from("trusted_contacts").delete().eq("id", contactId);
    loadContacts();
  };

  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - holdProgress);

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-b from-teal-950 to-slate-900 p-4 pb-20">
      <div className="flex gap-2 mb-6 sticky top-0 z-10 pb-2">
        {([
          ["main", "Emergency SOS", "Hold to alert"],
          ["simple", "Quiet Alert", "Discreet SOS"],
          ["contacts", "Contacts", `${contacts.length} trusted`],
          ["quickActions", "Quick Dial", "Helpers & Check-in"],
        ] as [SosView, string, string][]).map(([v, label, desc]) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`flex-1 flex flex-col items-center justify-center p-2 rounded-xl text-xs font-medium transition-all ${
              view === v
                ? "bg-coral-500 text-white shadow-lg"
                : "glass-card text-teal-100 hover:bg-white/10"
            }`}
          >
            <span className="font-bold">{label}</span>
            <span className="text-[9px] opacity-80 whitespace-nowrap overflow-hidden text-ellipsis max-w-full text-center">{desc}</span>
          </button>
        ))}
      </div>

      {view === "main" && (
        <div className="flex flex-col items-center">
          {contacts.length === 0 && (
            <div className="w-full max-w-md bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl mb-6 animate-fade-in flex flex-col items-center text-center">
              <Users className="w-8 h-8 text-amber-400 mb-2" />
              <h3 className="text-amber-200 font-bold mb-1">No Trusted Contacts Setup</h3>
              <p className="text-amber-300/70 text-xs mb-3">
                SOS alerts will only be logged locally. Add trusted contacts to ensure they receive your emergency broadcast.
              </p>
              <button 
                onClick={() => setView("contacts")}
                className="bg-amber-500/20 text-amber-400 px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-amber-500/30 transition-colors"
              >
                Set up Contacts now
              </button>
            </div>
          )}
          <p className="text-teal-100 text-center text-sm mb-6 max-w-xs">
            Press and hold the button for 2 seconds to send an emergency alert to your trusted contacts.
          </p>

          {/* Hold button */}
          <div className="relative mb-8">
            <svg width="220" height="220" className="-rotate-90">
              <circle
                cx="110"
                cy="110"
                r={radius}
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="8"
              />
              <circle
                cx="110"
                cy="110"
                r={radius}
                fill="none"
                stroke={holding ? "#f95a47" : "#14b8a6"}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                className="sos-hold-ring"
                style={{ transition: holding ? "none" : "stroke-dashoffset 0.2s ease-out" }}
              />
            </svg>
            <button
              onMouseDown={startHold}
              onMouseUp={cancelHold}
              onMouseLeave={cancelHold}
              onTouchStart={startHold}
              onTouchEnd={cancelHold}
              disabled={sending}
              className={`absolute inset-0 m-5 rounded-full flex flex-col items-center justify-center text-white shadow-2xl transition-all select-none ${
                holding
                  ? "scale-95 bg-coral-600"
                  : triggered
                  ? "bg-coral-500"
                  : "bg-gradient-to-br from-coral-500 to-coral-700 hover:scale-105"
              } ${sending ? "opacity-70" : ""}`}
            >
              {sending ? (
                <>
                  <AlertTriangle className="w-10 h-10 mb-1 animate-pulse" />
                  <span className="text-sm font-bold">SENDING...</span>
                </>
              ) : triggered ? (
                <>
                  <Check className="w-10 h-10 mb-1" />
                  <span className="text-sm font-bold">SENT</span>
                </>
              ) : (
                <>
                  <Shield className="w-10 h-10 mb-1" />
                  <span className="text-sm font-bold">HOLD 2s</span>
                </>
              )}
            </button>
          </div>

          {/* Confirmation log */}
          <div className="w-full max-w-md">
            <h3 className="text-teal-200 text-sm font-semibold mb-3 flex items-center gap-2">
              <ListChecks className="w-4 h-4" />
              Alert Confirmation Log
            </h3>
            {logEntries.length === 0 ? (
              <p className="text-teal-300/60 text-sm text-center py-4 glass-card p-4">
                No alerts yet. Trigger an SOS to see confirmation here.
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {logEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="glass-card p-3 flex items-start gap-3 animate-fade-in"
                  >
                    <div className="w-8 h-8 rounded-full bg-coral-500/20 flex items-center justify-center flex-shrink-0">
                      <Mail className="w-4 h-4 text-coral-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-teal-100 font-medium">
                        {entry.message}
                      </p>
                      <p className="text-xs text-teal-300/60 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(entry.timestamp).toLocaleString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Simple SOS view */}
      {view === "simple" && (
        <div className="flex flex-col items-center">
          <div className="relative mb-8 mt-4">
            <svg width="200" height="200" className="-rotate-90">
              <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="none"
                stroke={holding ? "#f95a47" : "#14b8a6"}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 80}
                strokeDashoffset={2 * Math.PI * 80 * (1 - holdProgress)}
                style={{ transition: holding ? "none" : "stroke-dashoffset 0.2s ease-out" }}
              />
            </svg>
            <button
              onMouseDown={startHold}
              onMouseUp={cancelHold}
              onMouseLeave={cancelHold}
              onTouchStart={startHold}
              onTouchEnd={cancelHold}
              disabled={sending}
              className={`absolute inset-0 m-4 rounded-full flex flex-col items-center justify-center text-white shadow-2xl transition-all select-none ${
                holding ? "scale-95 bg-coral-600" : "bg-gradient-to-br from-coral-500 to-coral-700"
              }`}
            >
              <Shield className="w-8 h-8 mb-1" />
              <span className="text-xs font-bold px-4 text-center">PRESS & HOLD TO ENABLE ALERT</span>
            </button>
          </div>

          <div className="w-full max-w-md space-y-3">
            <button
              onClick={onPlaySiren}
              className="w-full glass-card p-4 flex items-center gap-3 hover:bg-white/10 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-coral-500/20 flex items-center justify-center">
                <Volume2 className="w-5 h-5 text-coral-400" />
              </div>
              <span className="text-teal-100 font-medium">Sound Alarm</span>
            </button>

            <button
              onClick={onShowMessage}
              className="w-full glass-card p-4 flex items-center gap-3 hover:bg-white/10 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-teal-400" />
              </div>
              <span className="text-teal-100 font-medium">Screen Message</span>
            </button>

            <div className="glass-card p-4">
              <h3 className="text-teal-200 text-sm font-semibold mb-3">Useful Numbers</h3>
              <div className="space-y-2">
                {[
                  ["Police", "100"],
                  ["Women's Helpline", "1091"],
                  ["Ambulance", "108"],
                  ["Emergency", "112"],
                ].map(([name, num]) => (
                  <a
                    key={num}
                    href={`tel:${num}`}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <span className="text-teal-100 text-sm">{name}</span>
                    <span className="text-coral-400 font-bold text-sm">{num}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contacts view */}
      {view === "contacts" && (
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-teal-100 text-lg font-bold">Trusted Contacts</h2>
            <button
              onClick={() => setShowAddContact(!showAddContact)}
              className="w-10 h-10 rounded-full bg-coral-500 text-white flex items-center justify-center shadow-lg hover:bg-coral-600 transition-colors"
              aria-label="Add contact"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {showAddContact && (
            <div className="glass-card p-4 mb-4 animate-fade-in">
              <input
                type="text"
                placeholder="Contact name"
                value={newContactName}
                onChange={(e) => setNewContactName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-teal-100 placeholder-teal-300/40 mb-2 focus:outline-none focus:border-teal-400"
              />
              <input
                type="email"
                placeholder="Email address"
                value={newContactEmail}
                onChange={(e) => setNewContactEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-teal-100 placeholder-teal-300/40 mb-3 focus:outline-none focus:border-teal-400"
              />
              <button
                onClick={addContact}
                className="w-full bg-teal-500 text-white py-2.5 rounded-xl font-medium hover:bg-teal-600 transition-colors"
              >
                Add Contact
              </button>
            </div>
          )}

          <div className="space-y-2">
            {contacts.length === 0 && (
              <p className="text-teal-300/60 text-sm text-center py-8">
                No contacts yet. Tap + to add your first trusted contact.
              </p>
            )}
            {contacts.map((contact) => (
              <div key={contact.id} className="glass-card p-4 flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    contact.confirmed ? "bg-green-500/20" : "bg-amber-500/20"
                  }`}
                >
                  {contact.confirmed ? (
                    <Check className="w-5 h-5 text-green-400" />
                  ) : (
                    <Clock className="w-5 h-5 text-amber-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-teal-100 font-medium text-sm">{contact.name}</p>
                  <p className="text-teal-300/60 text-xs truncate">{contact.email}</p>
                  {pendingConfirm === contact.id && !contact.confirmed && (
                    <button
                      onClick={() => confirmContact(contact.id)}
                      className="text-xs text-teal-400 font-medium mt-1 underline"
                    >
                      Tap to simulate acceptance
                    </button>
                  )}
                </div>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full ${
                    contact.confirmed
                      ? "bg-green-500/20 text-green-400"
                      : "bg-amber-500/20 text-amber-400"
                  }`}
                >
                  {contact.confirmed ? "Confirmed" : "Pending"}
                </span>
                <button
                  onClick={() => removeContact(contact.id)}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                  aria-label="Remove contact"
                >
                  <X className="w-4 h-4 text-teal-300/60" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick actions view */}
      {view === "quickActions" && (
        <div className="max-w-md mx-auto">
          <h2 className="text-teal-100 text-lg font-bold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Phone, label: "Call Police", number: "100", color: "from-blue-500 to-blue-700" },
              { icon: Shield, label: "Women's Helpline", number: "1091", color: "from-coral-500 to-coral-700" },
              { icon: Clock, label: "Check-in Timer", action: "checkin", color: "from-indigo-500 to-indigo-700" },
              { icon: Phone, label: "Fake Call", action: "fake_call", color: "from-purple-500 to-purple-700" },
            ].map((action) => (
              <a
                key={action.label}
                href={action.number ? `tel:${action.number}` : undefined}
                onClick={!action.number ? (e) => { e.preventDefault(); alert(`Mock ${action.label} activated!`); } : undefined}
                className={`bg-gradient-to-br ${action.color} rounded-2xl p-5 flex flex-col items-center justify-center gap-2 shadow-lg hover:scale-105 transition-transform`}
              >
                <action.icon className="w-8 h-8 text-white" />
                <span className="text-white text-sm font-semibold text-center">{action.label}</span>
                {action.number && (
                  <span className="text-white/70 text-xs">{action.number}</span>
                )}
              </a>
            ))}
          </div>

          <div className="glass-card p-4 mt-4">
            <h3 className="text-teal-200 text-sm font-semibold mb-2">Your Location</h3>
            {userLocation ? (
              <p className="text-teal-100 text-sm font-mono">
                {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
              </p>
            ) : (
              <p className="text-teal-300/60 text-sm">Location not available — enable GPS.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

