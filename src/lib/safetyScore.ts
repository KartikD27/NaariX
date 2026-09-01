import type { Zone, TimeMode } from "@/types";

export const FACTOR_WEIGHTS = {
  lighting: 0.30,
  crowd_density: 0.25,
  openness: 0.20,
  distance_to_help: 0.25,
} as const;

export interface ScoreBreakdown {
  total: number;
  dayScore: number;
  nightScore: number;
  factors: {
    key: keyof typeof FACTOR_WEIGHTS;
    label: string;
    value: number;
    weight: number;
    contribution: number;
  }[];
  communityAdjustment: number;
  timeMode: TimeMode;
}

export function computeDayScore(zone: Zone): number {
  const day =
    zone.lighting * FACTOR_WEIGHTS.lighting +
    zone.crowd_density * FACTOR_WEIGHTS.crowd_density +
    zone.openness * FACTOR_WEIGHTS.openness +
    zone.distance_to_help * FACTOR_WEIGHTS.distance_to_help;
  return Math.round(day * 10) / 10;
}

export function computeNightScore(zone: Zone): number {
  const day = computeDayScore(zone);
  const penalty = (zone.night_penalty / 100) * day;
  return Math.round((day - penalty) * 10) / 10;
}

export function computeScore(
  zone: Zone,
  timeMode: TimeMode,
  includeCommunity = true
): ScoreBreakdown {
  const dayScore = computeDayScore(zone);
  const nightScore = computeNightScore(zone);
  let base = timeMode === "day" ? dayScore : nightScore;

  const factors = (Object.keys(FACTOR_WEIGHTS) as (keyof typeof FACTOR_WEIGHTS)[]).map(
    (key) => {
      const value = zone[key] as number;
      const weight = FACTOR_WEIGHTS[key];
      const contribution = value * weight;
      return {
        key,
        label: FACTOR_LABELS[key],
        value,
        weight,
        contribution: Math.round(contribution * 100) / 100,
      };
    }
  );

  const communityAdjustment = includeCommunity ? zone.community_adjustment : 0;
  const total = Math.max(0, Math.min(10, base + communityAdjustment));

  return {
    total: Math.round(total * 10) / 10,
    dayScore,
    nightScore,
    factors,
    communityAdjustment,
    timeMode,
  };
}

export const FACTOR_LABELS: Record<keyof typeof FACTOR_WEIGHTS, string> = {
  lighting: "Lighting",
  crowd_density: "Crowd Density",
  openness: "Openness & Visibility",
  distance_to_help: "Distance to Help",
};

export function scoreColor(score: number): string {
  if (score >= 7) return "#22c55e";
  if (score >= 4.5) return "#eab308";
  return "#ef4444";
}

export function scoreLabel(score: number): string {
  if (score >= 7) return "Safe";
  if (score >= 4.5) return "Moderate";
  return "Caution";
}

export function scoreColorWithAlpha(score: number, alpha: number): string {
  const hex = scoreColor(score).replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
