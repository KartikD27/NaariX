import { useState, useCallback, useEffect } from "react";
import {
  Search,
  Navigation,
  Clock,
  Shield,
  MapPin,
  Loader2,
  Route as RouteIcon,
  Footprints,
  Car,
  Sun,
  Moon,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { Zone, RouteOption } from "@/types";
import { computeScore, scoreColor } from "@/lib/safetyScore";

interface RoutePlannerProps {
  userLocation: { lat: number; lng: number } | null;
  zones: Zone[];
  onRouteSelect: (
    routes: { coordinates: [number, number][]; color: string; label: string }[]
  ) => void;
  onFlyTo: (target: { lat: number; lng: number; zoom?: number }) => void;
}

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

// No longer need manual speed factor since we use OSRM foot profile

// Time-aware safety tips keyed by hour range
function getSafetyTip(isNight: boolean, zones: Zone[]): string {
  if (!isNight) {
    return "Daytime routes are generally safe. Prefer open, busy streets.";
  }
  // Find the lowest-scoring zone at night to give a specific tip
  if (zones.length > 0) {
    const worst = zones
      .map((z) => ({ z, score: computeScore(z, "night").total }))
      .sort((a, b) => a.score - b.score)[0];
    if (worst.score < 4.5) {
      return `Night tip: Avoid ${worst.z.name} — low safety score after dark. Prefer lit, busy roads.`;
    }
  }
  return "Night tip: Stay on well-lit streets and avoid isolated underpasses.";
}

export default function RoutePlanner({
  userLocation,
  zones,
  onRouteSelect,
  onFlyTo,
}: RoutePlannerProps) {
  const [startQuery, setStartQuery] = useState("");
  const [endQuery, setEndQuery] = useState("");
  const [startResults, setStartResults] = useState<SearchResult[]>([]);
  const [endResults, setEndResults] = useState<SearchResult[]>([]);
  const [startCoords, setStartCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [endCoords, setEndCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [searching, setSearching] = useState<"start" | "end" | null>(null);
  const [travelMode, setTravelMode] = useState<"drive" | "walk">("drive");
  const [isMinimized, setIsMinimized] = useState(false);

  const currentHour = new Date().getHours();
  const isNight = currentHour >= 20 || currentHour < 6;

  // Auto-detect start location
  useEffect(() => {
    if (userLocation && !startCoords) {
      setStartCoords(userLocation);
      setStartQuery("My Current Location");
    }
  }, [userLocation]); // eslint-disable-line react-hooks/exhaustive-deps

  const searchPlace = async (query: string, field: "start" | "end") => {
    if (query.trim().length < 3) {
      if (field === "start") setStartResults([]);
      else setEndResults([]);
      return;
    }

    setSearching(field);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&limit=5&countrycodes=in`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      if (field === "start") setStartResults(data);
      else setEndResults(data);
    } catch {
      // Silent fail for demo
    }
    setSearching(null);
  };

  const selectStart = (result: SearchResult) => {
    const coords = { lat: parseFloat(result.lat), lng: parseFloat(result.lon) };
    setStartCoords(coords);
    setStartQuery(result.display_name?.split(",").slice(0, 2).join(",").trim() || "");
    setStartResults([]);
    onFlyTo({ lat: coords.lat, lng: coords.lng, zoom: 14 });
  };

  const selectEnd = (result: SearchResult) => {
    const coords = { lat: parseFloat(result.lat), lng: parseFloat(result.lon) };
    setEndCoords(coords);
    setEndQuery(result.display_name?.split(",").slice(0, 2).join(",").trim() || "");
    setEndResults([]);
    onFlyTo({ lat: coords.lat, lng: coords.lng, zoom: 14 });
  };

  const useCurrentLocation = () => {
    if (userLocation) {
      setStartCoords(userLocation);
      setStartQuery("My Current Location");
      onFlyTo({ lat: userLocation.lat, lng: userLocation.lng, zoom: 15 });
    }
  };

  // Ray-casting point-in-polygon
  const pointInPolygon = (
    point: [number, number],
    polygon: { lat: number; lng: number }[]
  ): boolean => {
    const x = point[1];
    const y = point[0];
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lng,
        yi = polygon[i].lat;
      const xj = polygon[j].lng,
        yj = polygon[j].lat;
      const intersect =
        yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  };

  // Score a route and identify zones it passes through
  const analyseRoute = (
    coordinates: [number, number][]
  ): { safetyScore: number; passedZones: Zone[] } => {
    if (coordinates.length === 0) return { safetyScore: 0, passedZones: [] };
    let totalScore = 0;
    let sampledPoints = 0;
    const passedZoneIds = new Set<string>();

    const step = Math.max(1, Math.floor(coordinates.length / 20));
    for (let i = 0; i < coordinates.length; i += step) {
      const point = coordinates[i];
      let pointScore = 7;
      for (const zone of zones) {
        if (pointInPolygon(point, zone.polygon)) {
          const score = computeScore(zone, isNight ? "night" : "day", false);
          pointScore = score.total;
          passedZoneIds.add(zone.id);
          break;
        }
      }
      totalScore += pointScore;
      sampledPoints++;
    }

    return {
      safetyScore:
        sampledPoints > 0
          ? Math.round((totalScore / sampledPoints) * 10) / 10
          : 0,
      passedZones: zones.filter((z) => passedZoneIds.has(z.id)),
    };
  };

  const planRoute = async () => {
    if (!startCoords || !endCoords) return;
    setLoading(true);
    setRoutes([]);

    try {
      const profile = travelMode === "walk" ? "foot" : "driving";
      const url = `https://router.project-osrm.org/route/v1/${profile}/${startCoords.lng},${startCoords.lat};${endCoords.lng},${endCoords.lat}?alternatives=true&geometries=geojson&overview=full`;

      const res = await fetch(url);
      const data = await res.json();

      if (!data.routes || data.routes.length === 0) {
        setLoading(false);
        return;
      }

      const routeOptions: RouteOption[] = data.routes.map(
        (
          route: {
            geometry: { coordinates: [number, number][] };
            duration: number;
            distance: number;
          },
          idx: number
        ) => {
          const coordinates: [number, number][] =
            route.geometry.coordinates.map((c: [number, number]) => [
              c[1],
              c[0],
            ]);
          const { safetyScore, passedZones } = analyseRoute(coordinates);
          const duration = route.duration;
          return {
            coordinates,
            duration,
            distance: route.distance,
            safetyScore,
            isSafest: false,
            isFastest: false,
            passedZones,
          };
        }
      );

      const safest = [...routeOptions].sort(
        (a, b) => b.safetyScore - a.safetyScore
      )[0];
      const fastest = [...routeOptions].sort(
        (a, b) => a.duration - b.duration
      )[0];

      safest.isSafest = true;
      fastest.isFastest = true;

      setRoutes(routeOptions);

      onRouteSelect([
        {
          coordinates: fastest.coordinates,
          color: "#3b82f6",
          label: "Fastest Route",
        },
        {
          coordinates: safest.coordinates,
          color: "#14b8a6",
          label: "Safest Route",
        },
      ]);

      if (routeOptions.length > 0) {
        const allLats = routeOptions.flatMap((r) =>
          r.coordinates.map((c) => c[0])
        );
        const allLngs = routeOptions.flatMap((r) =>
          r.coordinates.map((c) => c[1])
        );
        const midLat = (Math.min(...allLats) + Math.max(...allLats)) / 2;
        const midLng = (Math.min(...allLngs) + Math.max(...allLngs)) / 2;
        onFlyTo({ lat: midLat, lng: midLng, zoom: 13 });
        
        // Auto-minimize on mobile to show the map
        if (window.innerWidth < 768) {
          setIsMinimized(true);
        }
      }
    } catch {
      // Silent fail for demo
    }

    setLoading(false);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.round(seconds / 60);
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}h ${remMins}m`;
  };

  const formatDistance = (meters: number): string => {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  // Safety color bar for a score
  const safetyBarColor = (score: number) => scoreColor(score);

  const safetyTip = getSafetyTip(isNight, zones);

  return (
    <div className={`h-full w-full pointer-events-none p-4 pb-20 flex flex-col items-center ${isMinimized ? "justify-end" : "justify-start"}`}>
      <div className={`w-full max-w-md bg-slate-950/85 backdrop-blur-md border border-white/10 p-4 rounded-3xl pointer-events-auto shadow-2xl transition-all ${isMinimized ? "max-h-[30vh] overflow-y-auto" : "max-h-full overflow-y-auto"}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-teal-100 text-lg font-bold flex items-center gap-2">
            <RouteIcon className="w-5 h-5" />
            Safer Route Planner
          </h2>
          {routes.length > 0 && (
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-teal-100 transition-colors md:hidden"
              aria-label={isMinimized ? "Expand planner" : "Minimize planner"}
            >
              {isMinimized ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          )}
        </div>

        {!isMinimized && (
          <>
            {/* Travel mode toggle */}
        <div className="flex gap-1 mb-4 p-1 rounded-xl bg-white/5 border border-white/10">
          <button
            onClick={() => setTravelMode("drive")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
              travelMode === "drive"
                ? "bg-teal-500/20 text-teal-300"
                : "text-slate-500 hover:text-slate-400"
            }`}
          >
            <Car className="w-4 h-4" />
            Drive
          </button>
          <button
            onClick={() => setTravelMode("walk")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
              travelMode === "walk"
                ? "bg-teal-500/20 text-teal-300"
                : "text-slate-500 hover:text-slate-400"
            }`}
          >
            <Footprints className="w-4 h-4" />
            Walk
          </button>
        </div>

        {/* Time-aware safety tip */}
        <div
          className={`flex items-start gap-2 mb-4 p-3 rounded-xl border ${
            isNight
              ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-200"
              : "bg-amber-500/10 border-amber-500/20 text-amber-200"
          }`}
        >
          {isNight ? (
            <Moon className="w-4 h-4 mt-0.5 shrink-0" />
          ) : (
            <Sun className="w-4 h-4 mt-0.5 shrink-0" />
          )}
          <p className="text-xs">{safetyTip}</p>
        </div>

        {/* Start location */}
        <div className="glass-card p-3 mb-3">
          <label className="text-xs text-teal-300 font-medium mb-1 block">
            From
          </label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-teal-300/50" />
              <input
                type="text"
                placeholder="Search starting point"
                value={startQuery}
                onChange={(e) => {
                  setStartQuery(e.target.value);
                  setStartCoords(null);
                  searchPlace(e.target.value, "start");
                }}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-teal-100 placeholder-teal-300/40 text-sm focus:outline-none focus:border-teal-400"
              />
              {searching === "start" ? (
                <Loader2 className="absolute right-3 top-3 w-4 h-4 text-teal-400 animate-spin" />
              ) : startQuery === "My Current Location" ? (
                <span className="absolute right-3 top-3.5 flex h-3 w-3" title="GPS Locked">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
              ) : null}
            </div>
            <button
              onClick={useCurrentLocation}
              className="px-3 rounded-xl bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 transition-colors flex items-center gap-1 text-xs font-medium"
              aria-label="Use current location"
            >
              <Navigation className="w-4 h-4" />
              GPS
            </button>
          </div>
          {startResults.length > 0 && (
            <div className="mt-2 space-y-1">
              {startResults.map((r, i) => (
                <button
                  key={i}
                  onClick={() => selectStart(r)}
                  className="w-full text-left p-2 rounded-lg hover:bg-white/10 transition-colors flex items-start gap-2"
                >
                  <MapPin className="w-4 h-4 text-teal-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-teal-100 truncate">
                    {r.display_name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Destination */}
        <div className="glass-card p-3 mb-4">
          <label className="text-xs text-teal-300 font-medium mb-1 block">
            To
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-teal-300/50" />
            <input
              type="text"
              placeholder="Search destination"
              value={endQuery}
              onChange={(e) => {
                setEndQuery(e.target.value);
                setEndCoords(null);
                searchPlace(e.target.value, "end");
              }}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-teal-100 placeholder-teal-300/40 text-sm focus:outline-none focus:border-teal-400"
            />
            {searching === "end" && (
              <Loader2 className="absolute right-3 top-3 w-4 h-4 text-teal-400 animate-spin" />
            )}
          </div>
          {endResults.length > 0 && (
            <div className="mt-2 space-y-1">
              {endResults.map((r, i) => (
                <button
                  key={i}
                  onClick={() => selectEnd(r)}
                  className="w-full text-left p-2 rounded-lg hover:bg-white/10 transition-colors flex items-start gap-2"
                >
                  <MapPin className="w-4 h-4 text-coral-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-teal-100 truncate">
                    {r.display_name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Plan button */}
        <button
          onClick={planRoute}
          disabled={!startCoords || !endCoords || loading}
          className="w-full bg-gradient-to-r from-teal-500 to-teal-600 text-white py-3 rounded-xl font-semibold shadow-lg hover:from-teal-600 hover:to-teal-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Finding routes…
            </>
          ) : (
            <>
              {travelMode === "walk" ? (
                <Footprints className="w-5 h-5" />
              ) : (
                <RouteIcon className="w-5 h-5" />
              )}
              Plan Safer Route
            </>
          )}
        </button>
        </>
        )}

        {/* Route results */}
        {routes.length > 0 && (
          <div className="mt-4 space-y-3 animate-fade-in">
            {isMinimized && (
              <p className="text-xs text-teal-300/60 mb-2">Tap <b>^</b> to expand controls and see more details.</p>
            )}
            <h3 className="text-teal-200 text-sm font-semibold">
              Route Comparison
            </h3>
            {routes.map((route, i) => {
              const passedZones = route.passedZones ?? [];
              const barColor = safetyBarColor(route.safetyScore);
              return (
                <div
                  key={i}
                  className={`glass-card overflow-hidden border-2 ${
                    route.isSafest
                      ? "border-teal-400/50"
                      : route.isFastest
                      ? "border-blue-400/50"
                      : "border-transparent"
                  }`}
                >
                  {/* Safety color bar */}
                  <div
                    className="h-1.5 w-full"
                    style={{ backgroundColor: barColor }}
                  />

                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {route.isFastest && (
                          <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                            <Clock className="w-3 h-3" /> Fastest
                          </span>
                        )}
                        {route.isSafest && (
                          <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-400">
                            <Shield className="w-3 h-3" /> Safest
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-teal-300/60">
                        Option {i + 1}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-teal-100 font-bold text-lg">
                          {formatDuration(route.duration)}
                        </p>
                        <p className="text-xs text-teal-300/60">
                          {travelMode === "walk" ? "Walk" : "Drive"}
                        </p>
                      </div>
                      <div>
                        <p className="text-teal-100 font-bold text-lg">
                          {formatDistance(route.distance)}
                        </p>
                        <p className="text-xs text-teal-300/60">Distance</p>
                      </div>
                      <div>
                        <p
                          className="font-bold text-lg"
                          style={{ color: barColor }}
                        >
                          {route.safetyScore}/10
                        </p>
                        <p className="text-xs text-teal-300/60">Safety</p>
                      </div>
                    </div>

                    {/* Zone passage breakdown */}
                    {passedZones.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/5">
                        <p className="text-teal-300/60 text-xs flex items-center gap-1 mb-2">
                          <Info className="w-3 h-3" />
                          Zones on this route:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {passedZones.map((z) => {
                            const zScore = computeScore(
                              z,
                              isNight ? "night" : "day"
                            ).total;
                            return (
                              <span
                                key={z.id}
                                className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                                style={{
                                  backgroundColor:
                                    safetyBarColor(zScore) + "33",
                                  color: safetyBarColor(zScore),
                                  border: `1px solid ${safetyBarColor(zScore)}44`,
                                }}
                              >
                                {z.name}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <p className="text-xs text-teal-300/50 text-center mt-3">
              The safest route (teal) steers around low-scored zones. The
              fastest route (blue) prioritises speed.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
