"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Image from "next/image";
import { Map as MapIcon, Route as RouteIcon, Shield, MessageSquare, Scale, Navigation, Sun, Moon, Volume2, VolumeX, Settings, MapPin, User, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { findNearbyZone } from "@/lib/geoUtils";
import MapView from "@/components/MapView";
import ZoneDetailPanel from "@/components/ZoneDetailPanel";
import SosScreen from "@/components/SosScreen";
import RoutePlanner from "@/components/RoutePlanner";
import PolicePortal from "@/components/PolicePortal";
import CommunityFeed from "@/components/CommunityFeed";
import SafetyTips from "@/components/SafetyTips";
import HomeScreen from "@/components/HomeScreen";
import DemoControlPanel from "@/components/DemoControlPanel";
import { supabase } from "@/lib/supabase";
import { useSiren } from "@/lib/useSiren";
import type { Zone, Landmark, TimeMode } from "@/types";
import { computeScore, scoreColor, scoreLabel } from "@/lib/safetyScore";

type Tab = "home" | "map" | "routes" | "sos" | "community" | "portal" | "tips";

export default function App() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [timeMode, setTimeMode] = useState<TimeMode>("day");
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [routeLines, setRouteLines] = useState<{ coordinates: [number, number][]; color: string; label: string }[]>([]);
  const [flyToTarget, setFlyToTarget] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);
  const [alarmActive, setAlarmActive] = useState(false);
  const [showScreenMessage, setShowScreenMessage] = useState(false);
  const [showDemoPanel, setShowDemoPanel] = useState(false);
  const [devToggleCount, setDevToggleCount] = useState(0);
  const devTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const siren = useSiren();

  // Load zones and landmarks
  const loadData = useCallback(async () => {
    const { data: zoneData } = await supabase.from("zones").select("*");
    if (zoneData) setZones(zoneData as Zone[]);

    const { data: landmarkData } = await supabase.from("landmarks").select("*");
    if (landmarkData) setLandmarks(landmarkData as Landmark[]);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Get user location on mount
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          // Fallback: use Bengaluru center if GPS denied
          setUserLocation({ lat: 12.9716, lng: 77.6412 });
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setUserLocation({ lat: 12.9716, lng: 77.6412 });
    }
  }, []);

  const handleSelectZone = useCallback((zoneId: string) => {
    setSelectedZoneId(zoneId);
  }, []);

  const handleUseMyLocation = () => {
    if (userLocation) {
      setFlyToTarget({ lat: userLocation.lat, lng: userLocation.lng, zoom: 15 });
    }
  };

  const toggleAlarm = () => {
    if (alarmActive) {
      siren.stop();
      setAlarmActive(false);
    } else {
      siren.play();
      setAlarmActive(true);
    }
  };

  const handleFlashScreen = () => {
    setAlarmActive(true);
    siren.play();
  };

  // Hidden dev toggle: tap the header logo 5 times
  const handleDevToggle = () => {
    setDevToggleCount((c) => c + 1);
    if (devTimerRef.current) clearTimeout(devTimerRef.current);
    devTimerRef.current = setTimeout(() => setDevToggleCount(0), 2000);
  };

  useEffect(() => {
    if (devToggleCount >= 5) {
      setShowDemoPanel(true);
      setDevToggleCount(0);
    }
  }, [devToggleCount]);

  const selectedZone = zones.find((z) => z.id === selectedZoneId);

  // Detect nearest zone for the map chip
  const nearbyZone = useMemo(() => {
    if (!userLocation || zones.length === 0) return null;
    return findNearbyZone(userLocation, zones);
  }, [userLocation, zones]);

  const tabs: { id: Tab; label: string; icon: typeof MapIcon }[] = [
    { id: "home", label: "Home", icon: Shield },
    { id: "map", label: "Map", icon: MapIcon },
    { id: "routes", label: "Routes", icon: RouteIcon },
    { id: "sos", label: "SOS", icon: Shield },
    { id: "community", label: "Feed", icon: MessageSquare },
    { id: "portal", label: "Portal", icon: Scale },
  ];

  return (
    <div className={`h-[100dvh] w-[100dvw] flex flex-col bg-slate-950 overflow-hidden ${alarmActive ? "screen-flash" : ""}`}>
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-teal-900 to-slate-900 z-10 border-b border-white/5">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-1.5 bg-white/5 rounded-lg hover:bg-white/10 transition-colors text-teal-300">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2 cursor-pointer" onClick={handleDevToggle}>
            <Image
              src="/logo.jpg"
              alt="NariX Logo"
              width={32}
              height={32}
              className="rounded-lg object-contain"
            />
          </div>
          <div className="hidden sm:flex flex-col ml-2 border-l border-white/10 pl-3">
             <span className="text-white text-sm font-bold">{tabs.find(t => t.id === activeTab)?.label || "NaariX"}</span>
             {nearbyZone ? (
               <span className="text-teal-400 text-xs flex items-center gap-1">
                 <MapPin className="w-3 h-3"/> {nearbyZone.name}
               </span>
             ) : (
               <span className="text-slate-400 text-xs">Locating...</span>
             )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Alarm toggle */}
          <button
            onClick={toggleAlarm}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
              alarmActive ? "bg-coral-500 text-white" : "bg-white/5 text-teal-300 hover:bg-white/10"
            }`}
            aria-label="Toggle sound alarm"
            title="Sound Alarm"
          >
            {alarmActive ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Demo panel trigger (hidden, shows after 5 taps) */}
          {showDemoPanel && (
            <button
              onClick={() => setShowDemoPanel(true)}
              className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center"
              aria-label="Demo control panel"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}

          {/* Profile icon */}
          <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center border border-teal-500/30">
            <User className="w-4 h-4" />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 relative overflow-hidden">
        {/* Persistent Map Background */}
        <div className="absolute inset-0 z-0">
          <MapView
            zones={zones}
            landmarks={landmarks}
            timeMode={timeMode}
            selectedZoneId={selectedZoneId}
            onSelectZone={handleSelectZone}
            userLocation={userLocation}
            routeLines={routeLines}
            flyToTarget={flyToTarget}
          />
        </div>

        {/* Home Tab Overlay */}
        {activeTab === "home" && (
          <div className="absolute inset-0 z-10 pointer-events-none md:pointer-events-auto md:left-4 md:top-4 md:w-[400px] md:h-[calc(100dvh-140px)] md:bottom-auto md:right-auto md:rounded-3xl md:overflow-hidden md:border md:border-white/10 md:shadow-2xl">
            <HomeScreen
              nearbyZone={nearbyZone}
              onNavigate={(tab) => setActiveTab(tab as Tab)}
              onSOS={() => setActiveTab("sos")}
            />
          </div>
        )}

        {/* Map tab controls */}
        {activeTab === "map" && (
          <div className="absolute inset-0 z-10 pointer-events-none">
            {/* Map overlay controls */}
            <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2 pointer-events-none">
              {/* Day/Night toggle */}
              <div className="glass-card-light p-1 flex items-center gap-0.5 pointer-events-auto shadow-lg group relative">
                <button
                  onClick={() => setTimeMode("day")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    timeMode === "day" ? "bg-amber-100 text-amber-600 shadow-sm" : "text-slate-500"
                  }`}
                >
                  <Sun className="w-4 h-4" />
                  Day
                </button>
                <button
                  onClick={() => setTimeMode("night")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    timeMode === "night" ? "bg-indigo-100 text-indigo-600 shadow-sm" : "text-slate-500"
                  }`}
                >
                  <Moon className="w-4 h-4" />
                  Night
                </button>
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
                  Scores adjust for lighting
                </div>
              </div>

              {/* GPS button */}
              <button
                onClick={handleUseMyLocation}
                className="glass-card-light p-2.5 rounded-xl shadow-lg pointer-events-auto flex items-center gap-1.5 text-teal-600 hover:bg-teal-50 transition-colors"
                aria-label="Use my current location"
              >
                <Navigation className="w-5 h-5" />
                <span className="text-sm font-medium hidden sm:inline">My Location</span>
              </button>
            </div>

            {/* You are near chip */}
            {nearbyZone && (
              <div className="absolute top-16 left-3 pointer-events-none">
                <div className="glass-card-light flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-md">
                  <MapPin className="w-3.5 h-3.5 text-teal-600" />
                  <span className="text-xs font-medium text-slate-700">
                    You are near:{" "}
                    <span className="font-semibold text-teal-700">
                      {nearbyZone.name}
                    </span>
                  </span>
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="absolute bottom-3 left-3 glass-card-light p-3 shadow-lg max-w-[200px] pointer-events-auto">
              <h3 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Safety Legend</h3>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: "#22c55e" }} />
                  <span className="text-xs text-slate-600"><b>Safe</b> (7-10)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: "#eab308" }} />
                  <span className="text-xs text-slate-600"><b>Moderate</b> (4.5-7)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: "#ef4444" }} />
                  <span className="text-xs text-slate-600"><b>Caution</b> (0-4.5)</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-2">
                Tap any zone for score breakdown
              </p>
            </div>

            {/* Zone detail panel */}
            {selectedZone && (
              <div className="pointer-events-auto">
                <ZoneDetailPanel
                  zone={selectedZone}
                  timeMode={timeMode}
                  onClose={() => setSelectedZoneId(null)}
                  onToggleTimeMode={() => setTimeMode(timeMode === "day" ? "night" : "day")}
                />
              </div>
            )}
          </div>
        )}

        {/* Routes tab */}
        {activeTab === "routes" && (
          <div className="absolute inset-0 z-10 pointer-events-none md:left-4 md:top-4 md:w-[400px] md:h-[calc(100dvh-140px)] md:bottom-auto md:right-auto md:rounded-3xl md:overflow-hidden md:border md:border-white/10 md:shadow-2xl">
            <div className="pointer-events-auto h-full">
              <RoutePlanner
                userLocation={userLocation}
                zones={zones}
                onRouteSelect={setRouteLines}
                onFlyTo={(target) => {
                  setFlyToTarget(target);
                }}
              />
            </div>
          </div>
        )}

        {/* SOS tab */}
        {activeTab === "sos" && (
          <div className="absolute inset-0 z-10 md:left-4 md:top-4 md:w-[400px] md:h-[calc(100dvh-140px)] md:bottom-auto md:right-auto md:rounded-3xl md:overflow-hidden md:border md:border-white/10 md:shadow-2xl">
            <SosScreen
              userLocation={userLocation}
              onFlashScreen={handleFlashScreen}
              onPlaySiren={toggleAlarm}
              onShowMessage={() => setShowScreenMessage(true)}
            />
          </div>
        )}

        {/* Community tab */}
        {activeTab === "community" && (
          <div className="absolute inset-0 z-10 md:left-4 md:top-4 md:w-[400px] md:h-[calc(100dvh-140px)] md:bottom-auto md:right-auto md:rounded-3xl md:overflow-hidden md:border md:border-white/10 md:shadow-2xl">
            <CommunityFeed zones={zones} userLocation={userLocation} onPostsChanged={loadData} />
          </div>
        )}

        {/* Portal tab */}
        {activeTab === "portal" && (
          <div className="absolute inset-0 z-10 md:left-4 md:top-4 md:w-[400px] md:h-[calc(100dvh-140px)] md:bottom-auto md:right-auto md:rounded-3xl md:overflow-hidden md:border md:border-white/10 md:shadow-2xl">
            <PolicePortal zones={zones} />
          </div>
        )}


      </main>

      {/* Screen message overlay */}
      {showScreenMessage && (
        <div
          className="fixed inset-0 z-[1500] bg-coral-600/95 flex flex-col items-center justify-center animate-fade-in"
          onClick={() => setShowScreenMessage(false)}
        >
          <div className="text-center">
            <Shield className="w-16 h-16 text-white mx-auto mb-4" />
            <h2 className="text-white text-3xl font-bold mb-2">I NEED HELP</h2>
            <p className="text-white/80 text-lg">Please assist me</p>
            <p className="text-white/60 text-sm mt-4">Tap anywhere to dismiss</p>
          </div>
        </div>
      )}

      {/* Demo control panel */}
      {showDemoPanel && (
        <DemoControlPanel
          userLocation={userLocation}
          onClose={() => setShowDemoPanel(false)}
        />
      )}

      {/* Bottom tab bar */}
      <nav className="flex items-center justify-around bg-slate-900/95 backdrop-blur-md border-t border-white/5 px-1 py-1.5 pb-safe z-50">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isSos = tab.id === "sos";
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all min-w-[52px] ${
                isActive
                  ? isSos
                    ? "text-coral-400"
                    : "text-teal-400"
                  : "text-slate-500"
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-all ${
                  isSos
                    ? isActive
                      ? "bg-coral-500/20"
                      : "bg-coral-500/10"
                    : isActive
                    ? "bg-teal-500/20"
                    : ""
                }`}
              >
                <tab.icon className={`w-5 h-5 ${isSos ? "text-coral-400" : ""}`} />
              </div>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

