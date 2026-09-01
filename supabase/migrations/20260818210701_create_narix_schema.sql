/*
# NariX — Women's Safety Platform Schema

Creates all tables for the NariX MVP: safety zones with factor-based scoring,
landmarks, trusted contacts, SOS alerts and logs, community safety posts,
and authority acknowledgements. Single-tenant (no sign-in) — all data is
shared/public for the hackathon demo.

1. New Tables
- `zones`: seeded safety zones with lighting, crowd density, openness,
  distance-to-help factors and day/night multipliers.
- `landmarks`: hospital/police/shop markers with lat/lng and labels.
- `trusted_contacts`: name + email + confirmation status for SOS alerts.
- `sos_alerts`: alert metadata (coordinates, timestamp, status, trigger type).
- `sos_log`: in-app confirmation entries ("Alert sent to X at Y").
- `safety_posts`: community feed messages tied to a zone, with profanity flag.
- `authority_acknowledgements`: police portal ack records for SOS alerts.
2. Security
- RLS enabled on every table.
- All tables allow anon + authenticated CRUD (single-tenant, intentionally shared).
*/

-- ============================================================
-- ZONES
-- ============================================================
CREATE TABLE IF NOT EXISTS zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  center_lat double precision NOT NULL,
  center_lng double precision NOT NULL,
  polygon jsonb NOT NULL,
  lighting smallint NOT NULL DEFAULT 5,
  crowd_density smallint NOT NULL DEFAULT 5,
  openness smallint NOT NULL DEFAULT 5,
  distance_to_help smallint NOT NULL DEFAULT 5,
  night_penalty smallint NOT NULL DEFAULT 30,
  community_adjustment integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE zones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_zones" ON zones;
CREATE POLICY "anon_select_zones" ON zones FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_zones" ON zones;
CREATE POLICY "anon_insert_zones" ON zones FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_zones" ON zones;
CREATE POLICY "anon_update_zones" ON zones FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_zones" ON zones;
CREATE POLICY "anon_delete_zones" ON zones FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- LANDMARKS
-- ============================================================
CREATE TABLE IF NOT EXISTS landmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE landmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_landmarks" ON landmarks;
CREATE POLICY "anon_select_landmarks" ON landmarks FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_landmarks" ON landmarks;
CREATE POLICY "anon_insert_landmarks" ON landmarks FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_landmarks" ON landmarks;
CREATE POLICY "anon_update_landmarks" ON landmarks FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_landmarks" ON landmarks;
CREATE POLICY "anon_delete_landmarks" ON landmarks FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- TRUSTED CONTACTS
-- ============================================================
CREATE TABLE IF NOT EXISTS trusted_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  confirmed boolean NOT NULL DEFAULT false,
  confirm_token text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE trusted_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_trusted_contacts" ON trusted_contacts;
CREATE POLICY "anon_select_trusted_contacts" ON trusted_contacts FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_trusted_contacts" ON trusted_contacts;
CREATE POLICY "anon_insert_trusted_contacts" ON trusted_contacts FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_trusted_contacts" ON trusted_contacts;
CREATE POLICY "anon_update_trusted_contacts" ON trusted_contacts FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_trusted_contacts" ON trusted_contacts;
CREATE POLICY "anon_delete_trusted_contacts" ON trusted_contacts FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- SOS ALERTS
-- ============================================================
CREATE TABLE IF NOT EXISTS sos_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lat double precision,
  lng double precision,
  location_label text,
  timestamp timestamptz NOT NULL DEFAULT now(),
  original_timestamp timestamptz,
  status text NOT NULL DEFAULT 'active',
  trigger_type text NOT NULL DEFAULT 'manual',
  message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sos_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_sos_alerts" ON sos_alerts;
CREATE POLICY "anon_select_sos_alerts" ON sos_alerts FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_sos_alerts" ON sos_alerts;
CREATE POLICY "anon_insert_sos_alerts" ON sos_alerts FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_sos_alerts" ON sos_alerts;
CREATE POLICY "anon_update_sos_alerts" ON sos_alerts FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_sos_alerts" ON sos_alerts;
CREATE POLICY "anon_delete_sos_alerts" ON sos_alerts FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- SOS LOG (in-app confirmation entries)
-- ============================================================
CREATE TABLE IF NOT EXISTS sos_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid REFERENCES sos_alerts(id) ON DELETE CASCADE,
  contact_name text,
  contact_email text,
  action text NOT NULL,
  message text,
  timestamp timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sos_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_sos_log" ON sos_log;
CREATE POLICY "anon_select_sos_log" ON sos_log FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_sos_log" ON sos_log;
CREATE POLICY "anon_insert_sos_log" ON sos_log FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_sos_log" ON sos_log;
CREATE POLICY "anon_update_sos_log" ON sos_log FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_sos_log" ON sos_log;
CREATE POLICY "anon_delete_sos_log" ON sos_log FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- SAFETY POSTS (community feed)
-- ============================================================
CREATE TABLE IF NOT EXISTS safety_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id uuid REFERENCES zones(id) ON DELETE CASCADE,
  author text NOT NULL DEFAULT 'Anonymous',
  content text NOT NULL,
  lat double precision,
  lng double precision,
  flagged boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE safety_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_safety_posts" ON safety_posts;
CREATE POLICY "anon_select_safety_posts" ON safety_posts FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_safety_posts" ON safety_posts;
CREATE POLICY "anon_insert_safety_posts" ON safety_posts FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_safety_posts" ON safety_posts;
CREATE POLICY "anon_update_safety_posts" ON safety_posts FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_safety_posts" ON safety_posts;
CREATE POLICY "anon_delete_safety_posts" ON safety_posts FOR DELETE
  TO anon, authenticated USING (true);

-- ============================================================
-- AUTHORITY ACKNOWLEDGEMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS authority_acknowledgements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid REFERENCES sos_alerts(id) ON DELETE CASCADE,
  officer_name text NOT NULL DEFAULT 'Authority Officer',
  timestamp timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE authority_acknowledgements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_authority_acks" ON authority_acknowledgements;
CREATE POLICY "anon_select_authority_acks" ON authority_acknowledgements FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_authority_acks" ON authority_acknowledgements;
CREATE POLICY "anon_insert_authority_acks" ON authority_acknowledgements FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_authority_acks" ON authority_acknowledgements;
CREATE POLICY "anon_update_authority_acks" ON authority_acknowledgements FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_authority_acks" ON authority_acknowledgements;
CREATE POLICY "anon_delete_authority_acks" ON authority_acknowledgements FOR DELETE
  TO anon, authenticated USING (true);