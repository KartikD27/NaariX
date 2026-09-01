export interface Zone {
  id: string;
  name: string;
  description: string | null;
  center_lat: number;
  center_lng: number;
  polygon: { lat: number; lng: number }[];
  lighting: number;
  crowd_density: number;
  openness: number;
  distance_to_help: number;
  night_penalty: number;
  community_adjustment: number;
  created_at: string;
}

export interface Landmark {
  id: string;
  name: string;
  type: "hospital" | "police" | "shop";
  lat: number;
  lng: number;
}

export interface TrustedContact {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  confirmed: boolean;
  confirm_token: string | null;
  created_at: string;
}

export interface SosAlert {
  id: string;
  lat: number | null;
  lng: number | null;
  location_label: string | null;
  timestamp: string;
  original_timestamp: string | null;
  status: "active" | "acknowledged" | "resolved";
  trigger_type: "manual" | "low_battery" | "signal_lost" | "dead_man";
  message: string | null;
  created_at: string;
}

export interface SosLogEntry {
  id: string;
  alert_id: string | null;
  contact_name: string | null;
  contact_email: string | null;
  action: string;
  message: string | null;
  timestamp: string;
}

export interface SafetyPost {
  id: string;
  zone_id: string | null;
  author: string;
  content: string;
  lat: number | null;
  lng: number | null;
  flagged: boolean;
  created_at: string;
}

export interface AuthorityAck {
  id: string;
  alert_id: string | null;
  officer_name: string;
  timestamp: string;
}

export type TimeMode = "day" | "night";

export interface RouteOption {
  coordinates: [number, number][];
  duration: number;
  distance: number;
  safetyScore: number;
  isSafest: boolean;
  isFastest: boolean;
  passedZones?: Zone[];
}
