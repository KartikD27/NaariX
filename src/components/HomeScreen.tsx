"use client";

import { Shield, Navigation, Share2, PhoneCall, AlertTriangle, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import type { Zone } from "@/types";
import { computeScore, scoreColor } from "@/lib/safetyScore";

interface HomeScreenProps {
  nearbyZone: Zone | null;
  userLocation: { lat: number; lng: number } | null;
  onNavigate: (tab: string) => void;
  onSOS: () => void;
  onFakeCall: () => void;
}

export default function HomeScreen({ nearbyZone, userLocation, onNavigate, onSOS, onFakeCall }: HomeScreenProps) {
  const currentHour = new Date().getHours();
  const timeMode = currentHour >= 20 || currentHour < 6 ? "night" : "day";
  
  let score = 0;
  let color = "#14b8a6"; // default teal
  let label = "Unknown";
  let status = "Getting location...";

  if (nearbyZone) {
    const s = computeScore(nearbyZone, timeMode);
    score = s.total;
    color = scoreColor(score);
    if (score >= 7) {
      label = "Safe Area";
      status = "You are in a well-lit, active zone.";
    } else if (score >= 4.5) {
      label = "Moderate";
      status = "Stay alert. Moderate activity here.";
    } else {
      label = "Caution";
      status = "Low safety score. Avoid walking alone.";
    }
  }

  return (
    <div className="h-full w-full bg-slate-950/80 backdrop-blur-md overflow-y-auto p-4 pb-24 flex flex-col items-center z-10 pointer-events-auto">
      <div className="w-full max-w-md mt-6 mb-8 flex flex-col items-center">
        <motion.h1 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-white mb-2 text-center"
        >
          Hi, are you feeling safe right now?
        </motion.h1>
        <p className="text-sm text-slate-400 text-center">NaariX is actively monitoring your location.</p>
      </div>

      {/* SOS Button */}
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="mb-8"
      >
        <button
          onClick={onSOS}
          className="relative group flex items-center justify-center w-40 h-40 rounded-full bg-gradient-to-br from-coral-500 to-red-600 shadow-[0_0_40px_rgba(244,63,94,0.4)] hover:shadow-[0_0_60px_rgba(244,63,94,0.6)] transition-all active:scale-95"
        >
          <div className="absolute inset-2 rounded-full border-4 border-white/20 group-hover:border-white/30 transition-colors" />
          <div className="flex flex-col items-center gap-2">
            <Shield className="w-12 h-12 text-white" strokeWidth={2.5} />
            <span className="text-white font-bold text-xl tracking-wider">SOS</span>
          </div>
        </button>
      </motion.div>

      {/* Safety Score Card */}
      <div className="w-full max-w-md glass-card p-5 mb-6 rounded-2xl border border-white/10 relative overflow-hidden">
        <div 
          className="absolute top-0 left-0 w-1.5 h-full" 
          style={{ backgroundColor: color }}
        />
        <div className="flex justify-between items-start pl-2">
          <div>
            <div className="flex items-center gap-1.5 text-slate-400 mb-1">
              <MapPin className="w-3.5 h-3.5" />
              <span className="text-xs uppercase tracking-wider font-semibold">Current Location</span>
            </div>
            <h2 className="text-lg font-bold text-white mb-1">
              {nearbyZone ? nearbyZone.name : "Locating..."}
            </h2>
            <p className="text-sm text-slate-300">{status}</p>
          </div>
          {nearbyZone && (
            <div className="flex flex-col items-end">
              <span className="text-3xl font-black" style={{ color }}>{score}</span>
              <span className="text-[10px] uppercase font-bold text-slate-500">Score</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="w-full max-w-md grid grid-cols-3 gap-3">
        <button 
          onClick={() => onNavigate("routes")}
          className="glass-card-light p-4 rounded-xl flex flex-col items-center gap-2 hover:bg-white/10 transition-colors"
        >
          <div className="bg-teal-500/20 p-2.5 rounded-full">
            <Navigation className="w-5 h-5 text-teal-400" />
          </div>
          <span className="text-xs font-medium text-slate-300 text-center">Plan Safe Route</span>
        </button>

        <button 
          onClick={() => {
            if (navigator.share && userLocation) {
              navigator.share({
                title: 'Emergency: My Location',
                text: 'I need help! Here is my current location:',
                url: `https://maps.google.com/?q=${userLocation.lat},${userLocation.lng}`
              }).catch(console.error);
            } else {
              alert("Location sharing is not supported on this device or location is unavailable.");
            }
          }}
          className="glass-card-light p-4 rounded-xl flex flex-col items-center gap-2 hover:bg-white/10 transition-colors"
        >
          <div className="bg-indigo-500/20 p-2.5 rounded-full">
            <Share2 className="w-5 h-5 text-indigo-400" />
          </div>
          <span className="text-xs font-medium text-slate-300 text-center">Share Location</span>
        </button>

        <button 
          onClick={onFakeCall}
          className="glass-card-light p-4 rounded-xl flex flex-col items-center gap-2 hover:bg-white/10 transition-colors"
        >
          <div className="bg-amber-500/20 p-2.5 rounded-full">
            <PhoneCall className="w-5 h-5 text-amber-400" />
          </div>
          <span className="text-xs font-medium text-slate-300 text-center">Fake Call</span>
        </button>
      </div>
    </div>
  );
}
