"use client";

import { useEffect, useRef } from "react";
import { Map, AdvancedMarker, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import type { Zone, Landmark, TimeMode } from "@/types";
import { computeScore, scoreColor } from "@/lib/safetyScore";

interface MapViewProps {
  zones: Zone[];
  landmarks: Landmark[];
  timeMode: TimeMode;
  selectedZoneId: string | null;
  onSelectZone: (zoneId: string) => void;
  userLocation: { lat: number; lng: number } | null;
  routeLines: { coordinates: [number, number][]; color: string; label: string }[];
  flyToTarget: { lat: number; lng: number; zoom?: number } | null;
}

const mapStyles = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
  { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
  { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] },
];

// Inner component that has access to the map instance via useMap()
function MapController({
  zones,
  timeMode,
  selectedZoneId,
  onSelectZone,
  routeLines,
  flyToTarget,
}: {
  zones: Zone[];
  timeMode: TimeMode;
  selectedZoneId: string | null;
  onSelectZone: (zoneId: string) => void;
  routeLines: { coordinates: [number, number][]; color: string; label: string }[];
  flyToTarget: { lat: number; lng: number; zoom?: number } | null;
}) {
  const map = useMap();
  const mapsLibrary = useMapsLibrary("maps");
  const polygonsRef = useRef<google.maps.Polygon[]>([]);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  // Pan/zoom the map when flyToTarget changes
  useEffect(() => {
    if (!map || !flyToTarget || !mapsLibrary) return;
    map.panTo({ lat: flyToTarget.lat, lng: flyToTarget.lng });
    if (flyToTarget.zoom) {
      map.setZoom(flyToTarget.zoom);
    }
  }, [map, flyToTarget]);

  // Draw / update zone polygons
  useEffect(() => {
    if (!map || !mapsLibrary || !window.google) return;

    polygonsRef.current.forEach((p) => p.setMap(null));
    polygonsRef.current = [];

    zones.forEach((zone) => {
      const score = computeScore(zone, timeMode);
      const color = scoreColor(score.total);
      const isSelected = zone.id === selectedZoneId;

      const path = zone.polygon.map((p) => ({ lat: p.lat, lng: p.lng }));

      const polygon = new window.google.maps.Polygon({
        paths: path,
        strokeColor: isSelected ? "#ffffff" : color,
        strokeOpacity: 0.8,
        strokeWeight: isSelected ? 3 : 2,
        fillColor: color,
        fillOpacity: isSelected ? 0.45 : 0.28,
        map: map,
      });

      window.google.maps.event.addListener(polygon, "click", () => {
        onSelectZone(zone.id);
      });

      polygonsRef.current.push(polygon);
    });
  }, [map, zones, timeMode, selectedZoneId, onSelectZone]);

  // Draw routes
  useEffect(() => {
    if (!map || !mapsLibrary || !window.google) return;

    polylinesRef.current.forEach((l) => l.setMap(null));
    polylinesRef.current = [];

    routeLines.forEach((route) => {
      if (route.coordinates.length < 2) return;

      const path = route.coordinates.map((coord) => ({
        lat: coord[0],
        lng: coord[1],
      }));

      const line = new window.google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: route.color,
        strokeOpacity: 0.8,
        strokeWeight: 5,
        zIndex: 50,
        map: map,
      });

      polylinesRef.current.push(line);
    });
  }, [map, routeLines]);

  return null;
}

export default function MapView({
  zones,
  landmarks,
  timeMode,
  selectedZoneId,
  onSelectZone,
  userLocation,
  routeLines,
  flyToTarget,
}: MapViewProps) {
  
  const routeStart = routeLines.length > 0 && routeLines[0].coordinates.length > 0 
    ? routeLines[0].coordinates[0] 
    : null;
  const routeEnd = routeLines.length > 0 && routeLines[0].coordinates.length > 0 
    ? routeLines[0].coordinates[routeLines[0].coordinates.length - 1] 
    : null;

  return (
    <div className="absolute inset-0 z-0">
      <Map
        defaultCenter={{ lat: 12.9716, lng: 77.6412 }}
        defaultZoom={12}
        gestureHandling="greedy"
        styles={mapStyles}
        mapId="NAARIX_MAP_ID"
        zoomControl={true}
        streetViewControl={false}
        mapTypeControl={false}
        fullscreenControl={false}
      >
        <MapController
          zones={zones}
          timeMode={timeMode}
          selectedZoneId={selectedZoneId}
          onSelectZone={onSelectZone}
          routeLines={routeLines}
          flyToTarget={flyToTarget}
        />

        {/* Landmarks */}
        {landmarks.map((lm) => (
          <AdvancedMarker
            key={lm.id}
            position={{ lat: lm.lat, lng: lm.lng }}
            title={lm.name}
          >
            <div className="flex flex-col items-center gap-[2px]">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-sm border-2 border-white shadow-[0_2px_6px_rgba(0,0,0,0.3)] text-white ${
                  lm.type === "hospital"
                    ? "bg-red-600"
                    : lm.type === "police"
                    ? "bg-blue-700"
                    : "bg-orange-600"
                }`}
              >
                {lm.type === "hospital" ? "✚" : lm.type === "police" ? "🛡" : "🛍"}
              </div>
              <span className="bg-white/90 px-1 py-px rounded text-[9px] font-semibold whitespace-nowrap text-slate-800">
                {lm.name}
              </span>
            </div>
          </AdvancedMarker>
        ))}

        {/* User Location */}
        {userLocation && (
          <AdvancedMarker
            position={{ lat: userLocation.lat, lng: userLocation.lng }}
            zIndex={100}
          >
            <div className="relative">
              <div className="bg-teal-500 w-[18px] h-[18px] rounded-full border-4 border-white shadow-[0_0_0_4px_rgba(20,184,166,0.3),0_2px_8px_rgba(0,0,0,0.3)]" />
            </div>
          </AdvancedMarker>
        )}

        {/* Route Start/End Markers */}
        {routeStart && (
          <AdvancedMarker
            position={{ lat: routeStart[0], lng: routeStart[1] }}
            zIndex={150}
          >
            <div className="bg-emerald-500 w-5 h-5 rounded-full border-[3px] border-white shadow-[0_2px_10px_rgba(0,0,0,0.4)] flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-white rounded-full" />
            </div>
          </AdvancedMarker>
        )}
        
        {routeEnd && (
          <AdvancedMarker
            position={{ lat: routeEnd[0], lng: routeEnd[1] }}
            zIndex={150}
          >
            <div className="bg-coral-500 w-6 h-6 rounded-full border-[3px] border-white shadow-[0_2px_10px_rgba(0,0,0,0.4)] flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full" />
            </div>
          </AdvancedMarker>
        )}
      </Map>
    </div>
  );
}
