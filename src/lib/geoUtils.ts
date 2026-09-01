import type { Zone } from "@/types";

/**
 * Ray-casting algorithm to test whether a point lies inside a polygon.
 * @param lat  Point latitude
 * @param lng  Point longitude
 * @param polygon  Array of {lat, lng} vertices
 */
function pointInPolygon(
  lat: number,
  lng: number,
  polygon: { lat: number; lng: number }[]
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Haversine distance in kilometres between two lat/lng points.
 */
function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Find the zone that best matches the user's location.
 *
 * Strategy:
 *  1. Point-in-polygon test: if the user is inside exactly one zone, return it.
 *  2. If inside multiple zones (overlapping polygons), return the smallest one
 *     (by centroid distance tie-break) — unlikely but safe.
 *  3. Fall back to nearest centroid if not inside any zone.
 *
 * Returns `null` if `zones` is empty.
 */
export function findNearbyZone(
  userLocation: { lat: number; lng: number },
  zones: Zone[]
): Zone | null {
  if (zones.length === 0) return null;

  const { lat, lng } = userLocation;

  // 1. Polygon containment
  const containing = zones.filter((z) =>
    pointInPolygon(lat, lng, z.polygon)
  );

  if (containing.length === 1) return containing[0];

  if (containing.length > 1) {
    // Pick the one whose centroid is closest (smallest polygon heuristic)
    return containing.reduce((best, z) => {
      const dBest = haversineKm(lat, lng, best.center_lat, best.center_lng);
      const dZ = haversineKm(lat, lng, z.center_lat, z.center_lng);
      return dZ < dBest ? z : best;
    });
  }

  // 2. Nearest centroid fallback
  return zones.reduce((best, z) => {
    const dBest = haversineKm(lat, lng, best.center_lat, best.center_lng);
    const dZ = haversineKm(lat, lng, z.center_lat, z.center_lng);
    return dZ < dBest ? z : best;
  });
}

/**
 * Returns the distance in km from the user to the given zone centroid.
 */
export function distanceToZone(
  userLocation: { lat: number; lng: number },
  zone: Zone
): number {
  return haversineKm(
    userLocation.lat,
    userLocation.lng,
    zone.center_lat,
    zone.center_lng
  );
}
