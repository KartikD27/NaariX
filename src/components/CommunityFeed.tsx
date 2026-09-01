import { useState, useEffect, useCallback, useMemo } from "react";
import {
  MessageSquare,
  Send,
  MapPin,
  AlertCircle,
  Clock,
  Globe,
  Navigation,
  Check,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { SafetyPost, Zone } from "@/types";
import { findNearbyZone } from "@/lib/geoUtils";

interface CommunityFeedProps {
  zones: Zone[];
  userLocation: { lat: number; lng: number } | null;
  onPostsChanged: () => void;
}

const PROFANITY_WORDS = [
  "damn",
  "hell",
  "stupid",
  "idiot",
  "crap",
  "shit",
  "fuck",
  "bastard",
  "bloody",
];

function containsProfanity(text: string): boolean {
  const lower = text.toLowerCase();
  return PROFANITY_WORDS.some((word) => lower.includes(word));
}

function maskProfanity(text: string): string {
  let masked = text;
  for (const word of PROFANITY_WORDS) {
    const regex = new RegExp(word, "gi");
    masked = masked.replace(regex, "*".repeat(word.length));
  }
  return masked;
}

type FeedTab = "general" | "nearby";

export default function CommunityFeed({
  zones,
  userLocation,
  onPostsChanged,
}: CommunityFeedProps) {
  const [posts, setPosts] = useState<SafetyPost[]>([]);
  const [content, setContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [authorName, setAuthorName] = useState("");
  const [selectedZoneId, setSelectedZoneId] = useState<string>("");
  const [posting, setPosting] = useState(false);
  const [profanityWarning, setProfanityWarning] = useState(false);
  const [activeTab, setActiveTab] = useState<FeedTab>("general");

  // Detect nearest zone from GPS
  const nearbyZone = useMemo(() => {
    if (!userLocation || zones.length === 0) return null;
    return findNearbyZone(userLocation, zones);
  }, [userLocation, zones]);

  // Pre-fill zone selector with detected zone
  useEffect(() => {
    if (nearbyZone && !selectedZoneId) {
      setSelectedZoneId(nearbyZone.id);
    }
  }, [nearbyZone, selectedZoneId]);

  const loadPosts = useCallback(async () => {
    const { data } = await supabase
      .from("safety_posts")
      .select("*")
      .order("created_at", { ascending: false })
    if (data && data.length > 0) {
      setPosts(data as SafetyPost[]);
    } else {
      // Seed realistic demo posts
      setPosts([
        {
          id: "post-1",
          zone_id: nearbyZone?.id ?? zones[0]?.id ?? null,
          author: "Ananya",
          content: "Streetlight out near 5th block gate. Be careful walking here after dark.",
          lat: null,
          lng: null,
          flagged: false,
          created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
        },
        {
          id: "post-2",
          zone_id: zones[1]?.id ?? null,
          author: "Priya S.",
          content: "Increased police patrol near the junction tonight. Feels much safer!",
          lat: null,
          lng: null,
          flagged: false,
          created_at: new Date(Date.now() - 5 * 3600000).toISOString(),
        },
        {
          id: "post-3",
          zone_id: nearbyZone?.id ?? zones[0]?.id ?? null,
          author: "Anonymous",
          content: "Suspicious group loitering near the ATM on 12th main.",
          lat: null,
          lng: null,
          flagged: false,
          created_at: new Date(Date.now() - 12 * 3600000).toISOString(),
        }
      ]);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const submitPost = async () => {
    if (!content.trim() || (activeTab === "nearby" && !selectedZoneId)) return;

    setPosting(true);
    const hasProfanity = containsProfanity(content);

    // If general tab, zone can be null. If nearby tab, selectedZoneId is required.
    const finalZoneId = activeTab === "general" ? null : selectedZoneId;
    const zone = finalZoneId ? zones.find((z) => z.id === finalZoneId) : null;
    const lat = zone?.center_lat ?? userLocation?.lat ?? null;
    const lng = zone?.center_lng ?? userLocation?.lng ?? null;

    const cleanContent = maskProfanity(content.trim());
    const finalAuthor = isAnonymous ? "Anonymous" : authorName.trim() || "Anonymous";

    await supabase.from("safety_posts").insert({
      zone_id: finalZoneId,
      author: finalAuthor,
      content: cleanContent,
      lat,
      lng,
      flagged: hasProfanity,
    });

    // Adjust the zone's safety score down slightly for community signal
    if (zone) {
      await supabase
        .from("zones")
        .update({ community_adjustment: zone.community_adjustment - 0.3 })
        .eq("id", selectedZoneId);
    }

    setContent("");
    setSelectedZoneId(nearbyZone?.id ?? "");
    setProfanityWarning(false);
    setPosting(false);
    alert("Post submitted! The zone's safety score has been adjusted based on your community report.");
    loadPosts();
    onPostsChanged();
  };

  const handleContentChange = (value: string) => {
    setContent(value);
    setProfanityWarning(containsProfanity(value));
  };

  // Filter posts for the "Nearby" tab
  const displayedPosts = useMemo(() => {
    if (activeTab === "general") return posts.filter((p) => p.zone_id === null || !p.zone_id);
    if (!nearbyZone) return [];
    return posts.filter((p) => p.zone_id === nearbyZone.id);
  }, [posts, activeTab, nearbyZone]);

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-b from-teal-950 to-slate-900 p-4 pb-20">
      <div className="max-w-md mx-auto">
        <h2 className="text-teal-100 text-lg font-bold mb-1 flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Community Safety Feed
        </h2>
        <p className="text-teal-300/60 text-xs mb-4">
          Share local safety observations. Posts nudge the zone&apos;s safety score,
          improving the map for everyone.
        </p>

        {/* Nearby zone detection banner */}
        {nearbyZone && (
          <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl bg-teal-500/10 border border-teal-500/20">
            <Navigation className="w-4 h-4 text-teal-400 shrink-0" />
            <p className="text-teal-200 text-xs">
              You are near:{" "}
              <span className="font-semibold text-teal-100">
                {nearbyZone.name}
              </span>
            </p>
          </div>
        )}

        {/* Tab switcher */}
        <div className="flex gap-1 mb-4 p-1 rounded-xl bg-white/5 border border-white/10">
          <button
            onClick={() => setActiveTab("general")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "general"
                ? "bg-teal-500/20 text-teal-300"
                : "text-slate-500 hover:text-slate-400"
            }`}
          >
            <Globe className="w-4 h-4" />
            General
          </button>
          <button
            onClick={() => setActiveTab("nearby")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "nearby"
                ? "bg-teal-500/20 text-teal-300"
                : "text-slate-500 hover:text-slate-400"
            }`}
          >
            <MapPin className="w-4 h-4" />
            Nearby
            {nearbyZone && (
              <span className="text-[10px] bg-teal-500/20 text-teal-400 px-1.5 py-0.5 rounded-full ml-1">
                {nearbyZone.name.split(" ")[0]}
              </span>
            )}
          </button>
        </div>

        {/* Post composer */}
        <div className="glass-card p-3 mb-4">
          {activeTab === "nearby" && (
            <select
              value={selectedZoneId}
              onChange={(e) => setSelectedZoneId(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-teal-100 text-sm mb-2 focus:outline-none focus:border-teal-400"
            >
              <option value="" className="bg-slate-800">
                Select nearby zone
              </option>
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id} className="bg-slate-800">
                  {zone.name}
                  {nearbyZone?.id === zone.id ? " (You are here)" : ""}
                </option>
              ))}
            </select>
          )}
          <textarea
            placeholder={activeTab === "general" ? "Share a general safety tip or observation..." : "e.g. Poor lighting here after 8pm"}
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            rows={2}
            maxLength={200}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-teal-100 placeholder-teal-300/40 text-sm resize-none focus:outline-none focus:border-teal-400"
          />
            {profanityWarning && (
            <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Profanity detected — it will be masked.
            </p>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-3 border-t border-white/5 pt-3">
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isAnonymous ? "bg-teal-500 border-teal-500" : "border-slate-500 group-hover:border-teal-400"}`}>
                  {isAnonymous && <Check className="w-3 h-3 text-white" />}
                </div>
                <input 
                  type="checkbox" 
                  checked={isAnonymous} 
                  onChange={(e) => setIsAnonymous(e.target.checked)} 
                  className="hidden" 
                />
                <span className="text-xs text-teal-100 group-hover:text-teal-50 transition-colors">Post Anonymously</span>
              </label>
              {!isAnonymous && (
                <input
                  type="text"
                  placeholder="Your Name"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  maxLength={30}
                  className="w-full sm:w-48 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-teal-100 placeholder-teal-300/40 text-xs focus:outline-none focus:border-teal-400 transition-all animate-fade-in"
                />
              )}
            </div>
            
            <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
              <span className="text-xs text-teal-300/40">{content.length}/200</span>
              <button
                onClick={submitPost}
                disabled={!content.trim() || (activeTab === "nearby" && !selectedZoneId) || posting || (!isAnonymous && !authorName.trim())}
                className="bg-teal-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-teal-600 transition-colors disabled:opacity-40 flex items-center gap-1.5 whitespace-nowrap"
              >
                <Send className="w-3.5 h-3.5" />
                Post
              </button>
            </div>
          </div>
        </div>

        {/* Feed */}
        <div className="space-y-2">
          {activeTab === "nearby" && !nearbyZone ? (
            <p className="text-teal-300/60 text-sm text-center py-8">
              Enable GPS to see posts near you.
            </p>
          ) : displayedPosts.length === 0 ? (
            <p className="text-teal-300/60 text-sm text-center py-8">
              {activeTab === "nearby"
                ? `No posts yet for ${nearbyZone?.name}. Be the first!`
                : "No posts yet. Be the first to share a safety observation."}
            </p>
          ) : (
            displayedPosts.map((post) => {
              const zone = zones.find((z) => z.id === post.zone_id);
              return (
                <div key={post.id} className="glass-card p-3 animate-fade-in">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="w-4 h-4 text-teal-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-teal-200 text-xs font-medium">
                          {post.author}
                        </span>
                        {zone && (
                          <span className="text-teal-300/40 text-xs flex items-center gap-0.5">
                            <MapPin className="w-3 h-3" />
                            {zone.name}
                          </span>
                        )}
                      </div>
                      <p className="text-teal-100 text-sm">{post.content}</p>
                      <p className="text-teal-300/40 text-xs mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(post.created_at).toLocaleString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                      {post.flagged && (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-400 mt-1">
                          <AlertCircle className="w-3 h-3" />
                          Flagged by filter
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
