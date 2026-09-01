-- ============================================================
-- NaariX Seed Data — Kopri / Thane, Maharashtra
-- Run this once in your Supabase SQL Editor to populate the
-- zones and landmarks tables with realistic Thane district data.
-- ============================================================

-- Clear existing data first (safe for demo re-runs)
DELETE FROM safety_posts;
DELETE FROM authority_acknowledgements;
DELETE FROM sos_log;
DELETE FROM sos_alerts;
DELETE FROM landmarks;
DELETE FROM zones;

-- ============================================================
-- ZONES — 7 Kopri / Thane neighbourhoods
-- Safety factor scale: 1 (poor) → 10 (excellent)
-- ============================================================

INSERT INTO zones (name, description, center_lat, center_lng, polygon, lighting, crowd_density, openness, distance_to_help, night_penalty, community_adjustment) VALUES

-- 1. Kopri Colony Road — Main arterial road, moderate lighting, busy during day
(
  'Kopri Colony Road',
  'Main arterial road through Kopri Colony. Busy bazaar stretch with shops and auto-rickshaws. Moderate lighting at night.',
  19.2091, 72.9753,
  '[{"lat":19.2110,"lng":72.9730},{"lat":19.2110,"lng":72.9780},{"lat":19.2075,"lng":72.9780},{"lat":19.2075,"lng":72.9730}]'::jsonb,
  6, 7, 6, 7, 25, 0
),

-- 2. Parsik Nagar — Residential colony, quieter streets, low lighting at night
(
  'Parsik Nagar',
  'Residential colony near Parsik Hill. Quieter lanes, sparse street lighting after 10pm. Close to open hillside areas.',
  19.2155, 72.9820,
  '[{"lat":19.2180,"lng":72.9800},{"lat":19.2180,"lng":72.9845},{"lat":19.2130,"lng":72.9845},{"lat":19.2130,"lng":72.9800}]'::jsonb,
  4, 5, 5, 5, 40, 0
),

-- 3. Cadbury Junction — Commercial hub, well-lit, police beat, busy 24x7
(
  'Cadbury Junction',
  'Major commercial intersection near Cadbury factory. Well-lit, police patrolled, active at all hours. High safety rating.',
  19.2134, 72.9612,
  '[{"lat":19.2155,"lng":72.9590},{"lat":19.2155,"lng":72.9635},{"lat":19.2113,"lng":72.9635},{"lat":19.2113,"lng":72.9590}]'::jsonb,
  9, 9, 8, 9, 10, 0
),

-- 4. Ram Maruti Road — Busy road near Thane station, well-lit but crowded
(
  'Ram Maruti Road',
  'Busy commercial road near Thane railway station. Shops open late, police presence nearby. Safe but crowded.',
  19.1972, 72.9638,
  '[{"lat":19.1995,"lng":72.9615},{"lat":19.1995,"lng":72.9662},{"lat":19.1950,"lng":72.9662},{"lat":19.1950,"lng":72.9615}]'::jsonb,
  8, 8, 7, 8, 15, 0
),

-- 5. Navi Pada / Balkum — Peripheral area, poor lighting, isolated stretches
(
  'Navi Pada / Balkum',
  'Semi-urban peripheral locality near Balkum. Several dark stretches and unpaved lanes. Caution advised after 9pm.',
  19.2264, 72.9881,
  '[{"lat":19.2290,"lng":72.9860},{"lat":19.2290,"lng":72.9905},{"lat":19.2238,"lng":72.9905},{"lat":19.2238,"lng":72.9860}]'::jsonb,
  3, 4, 4, 4, 50, 0
),

-- 6. Kopri Bridge Area — Underbridge zone, isolated, poor lighting at night
(
  'Kopri Bridge Area',
  'Area around the Kopri railway bridge. Underbridge sections are isolated and poorly lit at night. High caution at night.',
  19.2048, 72.9701,
  '[{"lat":19.2068,"lng":72.9680},{"lat":19.2068,"lng":72.9722},{"lat":19.2028,"lng":72.9722},{"lat":19.2028,"lng":72.9680}]'::jsonb,
  3, 5, 3, 5, 55, 0
),

-- 7. Wagle Estate — Large industrial + residential mix, moderate safety
(
  'Wagle Estate',
  'Mixed industrial and residential area. MIDC industrial belt with pockets of residential. Moderate safety, decent connectivity.',
  19.1905, 72.9554,
  '[{"lat":19.1930,"lng":72.9530},{"lat":19.1930,"lng":72.9580},{"lat":19.1880,"lng":72.9580},{"lat":19.1880,"lng":72.9530}]'::jsonb,
  6, 6, 6, 6, 30, 0
);

-- ============================================================
-- LANDMARKS — Police stations, hospitals, key chowks
-- ============================================================

INSERT INTO landmarks (name, type, lat, lng) VALUES

-- Police stations
('Kopri Police Station',    'police',   19.2086, 72.9748),
('Thane Police Commissionerate', 'police', 19.2183, 72.9780),
('Naupada Police Station',  'police',   19.1989, 72.9620),
('Wagle Estate Police Post','police',   19.1912, 72.9558),

-- Hospitals
('Civil Hospital Thane',    'hospital', 19.2143, 72.9791),
('Kaushalya Medical Foundation Hospital', 'hospital', 19.2079, 72.9659),
('Titan Hospital Thane',    'hospital', 19.2011, 72.9670),
('Hiranandani Hospital',    'hospital', 19.2197, 72.9855),

-- Key shops / chowks (safe gathering points)
('Cadbury Junction Chowk',  'shop',     19.2134, 72.9612),
('Ram Maruti Road Market',  'shop',     19.1975, 72.9640),
('Kopri Colony Bazaar',     'shop',     19.2090, 72.9755),
('Balkum Naka Shops',       'shop',     19.2255, 72.9878),
('Wagle Estate Market',     'shop',     19.1908, 72.9553),
('Pokhran Road Junction',   'shop',     19.2200, 72.9700);

-- ============================================================
-- Done! Zones and landmarks are now seeded for Kopri, Thane.
-- ============================================================
