import { X, Sun, Moon, TrendingUp, TrendingDown, Users, Lightbulb, Eye, MapPin } from "lucide-react";
import type { Zone, TimeMode } from "@/types";
import { computeScore, scoreColor, scoreLabel } from "@/lib/safetyScore";

interface ZoneDetailPanelProps {
  zone: Zone;
  timeMode: TimeMode;
  onClose: () => void;
  onToggleTimeMode: () => void;
}

const factorIcons: Record<string, typeof Sun> = {
  lighting: Lightbulb,
  crowd_density: Users,
  openness: Eye,
  distance_to_help: MapPin,
};

export default function ZoneDetailPanel({
  zone,
  timeMode,
  onClose,
  onToggleTimeMode,
}: ZoneDetailPanelProps) {
  const score = computeScore(zone, timeMode);
  const color = scoreColor(score.total);
  const label = scoreLabel(score.total);

  return (
    <div className="absolute bottom-0 left-0 right-0 z-[1000] animate-slide-up">
      <div className="glass-card-light mx-auto max-w-md m-3 p-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{zone.name}</h2>
            {zone.description && (
              <p className="text-sm text-slate-500 mt-0.5">{zone.description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Close panel"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Score badge */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-16 h-16 rounded-2xl flex flex-col items-center justify-center text-white shadow-lg"
            style={{ backgroundColor: color }}
          >
            <span className="text-2xl font-bold leading-none">{score.total}</span>
            <span className="text-[10px] font-medium opacity-90 mt-0.5">/ 10</span>
          </div>
          <div>
            <span
              className="px-3 py-1 rounded-full text-sm font-semibold text-white"
              style={{ backgroundColor: color }}
            >
              {label}
            </span>
            <p className="text-xs text-slate-500 mt-1.5">
              Safety score for{" "}
              <span className="font-semibold capitalize">{timeMode}</span> mode
            </p>
          </div>
        </div>

        {/* Day/Night toggle */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 mb-4">
          <button
            onClick={() => timeMode !== "day" && onToggleTimeMode()}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
              timeMode === "day"
                ? "bg-white text-amber-500 shadow-sm"
                : "text-slate-500"
            }`}
          >
            <Sun className="w-4 h-4" />
            Day
          </button>
          <button
            onClick={() => timeMode !== "night" && onToggleTimeMode()}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
              timeMode === "night"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-500"
            }`}
          >
            <Moon className="w-4 h-4" />
            Night
          </button>
        </div>

        {/* Factor breakdown */}
        <div className="space-y-2.5 mb-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Score Breakdown
          </h3>
          {score.factors.map((factor) => {
            const Icon = factorIcons[factor.key] || Sun;
            const barColor = factor.value >= 7 ? "#22c55e" : factor.value >= 4.5 ? "#eab308" : "#ef4444";
            return (
              <div key={factor.key} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-slate-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-700">
                      {factor.label}
                    </span>
                    <span className="text-xs text-slate-500">
                      {factor.value}/10 · {Math.round(factor.weight * 100)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${factor.value * 10}%`,
                        backgroundColor: barColor,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Formula */}
        <div className="bg-slate-50 rounded-xl p-3 mb-3">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
            Formula
          </h3>
          <p className="text-xs text-slate-600 font-mono leading-relaxed">
            Score = Lighting×0.30 + Crowd×0.25 +
            Openness×0.20 + Help×0.25
          </p>
          <p className="text-xs text-slate-600 font-mono leading-relaxed mt-1">
            {timeMode === "night"
              ? `Night: Day Score − ${zone.night_penalty}% penalty`
              : "Day: base score (no penalty)"}
          </p>
          {score.communityAdjustment !== 0 && (
            <p className="text-xs text-slate-600 font-mono leading-relaxed mt-1">
              Community adjustment: {score.communityAdjustment > 0 ? "+" : ""}
              {score.communityAdjustment}
            </p>
          )}
        </div>

        {/* Day vs Night comparison */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-amber-600">
            <Sun className="w-3.5 h-3.5" />
            <span className="font-semibold">{score.dayScore}/10</span>
            <span className="text-slate-400">Day</span>
          </div>
          <div className="flex items-center gap-1.5 text-indigo-600">
            <Moon className="w-3.5 h-3.5" />
            <span className="font-semibold">{score.nightScore}/10</span>
            <span className="text-slate-400">Night</span>
          </div>
          {score.nightScore < score.dayScore && (
            <div className="flex items-center gap-1 text-red-500 ml-auto">
              <TrendingDown className="w-3.5 h-3.5" />
              <span className="font-medium">
                −{Math.round((score.dayScore - score.nightScore) * 10) / 10} at night
              </span>
            </div>
          )}
          {score.nightScore >= score.dayScore && (
            <div className="flex items-center gap-1 text-green-500 ml-auto">
              <TrendingUp className="w-3.5 h-3.5" />
              <span className="font-medium">Stable</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
