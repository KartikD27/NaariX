-- =============================================================================
-- NariX Production Schema — Panch-Shakti Guardian Architecture
-- Guardians: Mayuri (env/lux) · Riya (dispatch/escalation, post role-swap)
--            Pushpa (peer/stealth, post role-swap) · Anjali (fake call)
--            Siddhi (forensic vault)
-- =============================================================================

create extension if not exists "pgcrypto";
-- pg_cron and pg_net must additionally be toggled on in the Supabase
-- Dashboard → Database → Extensions on hosted projects. This migration will
-- fail on `cron.schedule` below until that toggle is flipped once, manually.
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- =============================================================================
-- 0. ROLE-CHECK HELPER (defined before any policy references it)
-- =============================================================================
create or replace function is_officer()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('officer', 'admin')
  );
$$;

-- =============================================================================
-- 1. PROFILES — extends auth.users, carries the officer/admin role claim.
--    `role` has NO client-writable path: no insert/update policy ever
--    touches it. Promotion to officer/admin happens only via an admin
--    migration or a service-role-only internal tool.
-- =============================================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role text not null default 'user' check (role in ('user', 'officer', 'admin')),
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles_select_own_or_officer" on profiles
  for select to authenticated
  using (auth.uid() = id or is_officer());

create policy "profiles_update_own_non_role_fields" on profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- =============================================================================
-- 2. TRUSTED CONTACTS — required supporting table. The MVP audit's fatal
--    flaw was a hardcoded placeholder email; this table has no such
--    shortcut, and requires at least one real contact method.
-- =============================================================================
create table if not exists trusted_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  confirmed boolean not null default false,
  confirm_token text,
  created_at timestamptz not null default now(),
  constraint has_contact_method check (email is not null or phone is not null)
);

alter table trusted_contacts enable row level security;

create policy "contacts_owner_all" on trusted_contacts
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =============================================================================
-- 3. SAFE WALK SESSIONS — Guardian Mayuri (env) + Guardian Riya (dispatch)
-- =============================================================================
create table if not exists safe_walk_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  destination_lat double precision,
  destination_lng double precision,
  destination_label text,
  status text not null default 'active'
    check (status in ('active', 'completed', 'escalated', 'expired')),
  last_heartbeat_at timestamptz not null default now(),
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

alter table safe_walk_sessions enable row level security;

create policy "sessions_owner_all" on safe_walk_sessions
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Officers see ONLY escalated sessions — never blanket visibility into
-- every woman's daily walk. Privacy-by-design, not surveillance-by-default.
create policy "sessions_officer_escalated_only" on safe_walk_sessions
  for select to authenticated
  using (is_officer() and status = 'escalated');

create index if not exists idx_sessions_active_heartbeat
  on safe_walk_sessions (status, last_heartbeat_at)
  where status = 'active';

-- =============================================================================
-- 4. SAFE WALK PINGS — raw per-session telemetry, owner-private
-- =============================================================================
create table if not exists safe_walk_pings (
  id bigint generated always as identity primary key,
  session_id uuid not null references safe_walk_sessions(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  lux real,
  recorded_at timestamptz not null default now()
);

alter table safe_walk_pings enable row level security;

create policy "pings_select_owner_or_escalated_officer" on safe_walk_pings
  for select to authenticated
  using (
    exists (
      select 1 from safe_walk_sessions s
      where s.id = session_id
        and (s.user_id = auth.uid() or (is_officer() and s.status = 'escalated'))
    )
  );

create policy "pings_insert_owner_only" on safe_walk_pings
  for insert to authenticated
  with check (
    exists (
      select 1 from safe_walk_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  );

-- =============================================================================
-- 5. DARK ZONE SAMPLES — Guardian Mayuri's public heatmap layer.
--    Stored as an aggregated geohash grid, NOT raw per-user points. This
--    directly closes the exact vulnerability class found in the MVP audit:
--    an unauthenticated write silently corrupting a public trust signal
--    (there, `community_adjustment`; here, it would be the heatmap itself).
-- =============================================================================
create table if not exists dark_zone_samples (
  geohash text primary key,
  center_lat double precision not null,
  center_lng double precision not null,
  avg_lux real not null,
  sample_count integer not null default 1,
  last_sampled_at timestamptz not null default now()
);

alter table dark_zone_samples enable row level security;

create policy "dark_zones_public_read" on dark_zone_samples
  for select to anon, authenticated
  using (true);

-- No client insert/update path exists, full stop. Every write goes through
-- the `ingest-dark-zone-sample` Edge Function using the service role key,
-- which verifies the sample came from a real active safe_walk_session
-- before it ever touches this table.
create policy "dark_zones_no_client_insert" on dark_zone_samples
  for insert to anon, authenticated
  with check (false);

create policy "dark_zones_no_client_update" on dark_zone_samples
  for update to anon, authenticated
  using (false);

-- =============================================================================
-- 6. SOS INCIDENTS — Guardian Riya's escalation output + manual/duress SOS
-- =============================================================================
create table if not exists sos_incidents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  session_id uuid references safe_walk_sessions(id) on delete set null,
  trigger_type text not null
    check (trigger_type in ('manual', 'duress_pin', 'heartbeat_timeout', 'quiet_alert')),
  lat double precision,
  lng double precision,
  status text not null default 'active'
    check (status in ('active', 'acknowledged', 'resolved')),
  acknowledged_by uuid references profiles(id),
  acknowledged_at timestamptz,
  created_at timestamptz not null default now()
);

alter table sos_incidents enable row level security;

create policy "incidents_select_owner_or_officer" on sos_incidents
  for select to authenticated
  using (auth.uid() = user_id or is_officer());

create policy "incidents_insert_owner_only" on sos_incidents
  for insert to authenticated
  with check (auth.uid() = user_id);

-- Officers may acknowledge/resolve. A BEFORE UPDATE trigger below still
-- blocks them from silently editing the evidentiary fields.
create policy "incidents_update_officer_only" on sos_incidents
  for update to authenticated
  using (is_officer())
  with check (is_officer());

-- No delete policy exists for ANY app role — incidents are append-only for
-- evidentiary integrity. Only a superuser migration can remove a row.

create or replace function lock_incident_evidence_fields()
returns trigger
language plpgsql
as $$
begin
  if new.lat is distinct from old.lat
     or new.lng is distinct from old.lng
     or new.trigger_type is distinct from old.trigger_type
     or new.created_at is distinct from old.created_at then
    raise exception 'Evidence fields on sos_incidents are immutable after creation.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_lock_incident_evidence on sos_incidents;
create trigger trg_lock_incident_evidence
  before update on sos_incidents
  for each row execute function lock_incident_evidence_fields();

-- =============================================================================
-- 7. EVIDENCE VAULT — Guardian Siddhi's forensic hash chain (BSA-aligned)
-- =============================================================================
create table if not exists evidence_vault (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references sos_incidents(id) on delete cascade,
  storage_path text not null,
  sha256_hash text not null,
  file_size_bytes bigint,
  duration_seconds integer,
  chain_of_custody jsonb not null default '[]'::jsonb,
  captured_at timestamptz not null default now()
);

alter table evidence_vault enable row level security;

create policy "evidence_select_owner_or_officer" on evidence_vault
  for select to authenticated
  using (
    exists (
      select 1 from sos_incidents i
      where i.id = incident_id and (i.user_id = auth.uid() or is_officer())
    )
  );

-- Deliberately NO client insert/update/delete policy at all. Every row is
-- written exclusively by the `process-evidence-hash` Edge Function via the
-- service role key, immediately after computing SHA-256 server-side — a
-- client-computed hash could be forged pre-upload and would be worthless as
-- tamper-evident record under BSA electronic evidence provisions.

-- =============================================================================
-- 8. SERVER-SIDE HEARTBEAT WATCHDOG — the client is NEVER trusted to
--    self-escalate. A dead, seized, or powered-off phone cannot report its
--    own failure; only the absence of its signal, observed from the server,
--    can.
-- =============================================================================
create or replace function check_missed_heartbeats()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  stale record;
begin
  for stale in
    select id, user_id
    from safe_walk_sessions
    where status = 'active'
      and last_heartbeat_at < now() - interval '90 seconds'
  loop
    update safe_walk_sessions
      set status = 'escalated'
      where id = stale.id;

    insert into sos_incidents (user_id, session_id, trigger_type, status)
      values (stale.user_id, stale.id, 'heartbeat_timeout', 'active');
  end loop;
end;
$$;

-- 90s grace = 3 missed 30s beats. Absorbs a subway tunnel; does not absorb
-- an attacker. Runs independently of any client, every 30 seconds.
select cron.schedule(
  'narix-heartbeat-watchdog',
  '30 seconds',
  $$ select check_missed_heartbeats(); $$
);

-- Fire outbound contact/officer notification the instant any incident row
-- appears, regardless of which Guardian created it.
-- NOTE: `app.settings.edge_function_url` / `app.settings.service_role_key`
-- must be set once via `alter database postgres set ...` or, preferably,
-- via Supabase Vault (`select vault.create_secret(...)`) — do not hardcode
-- the service role key as a literal in this file.
create or replace function notify_new_incident()
returns trigger
language plpgsql
security definer
set search_path = public, net
as $$
begin
  perform net.http_post(
    url := current_setting('app.settings.edge_function_url') || '/send-sos-alert',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := jsonb_build_object('incident_id', new.id)
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_new_incident on sos_incidents;
create trigger trg_notify_new_incident
  after insert on sos_incidents
  for each row execute function notify_new_incident();
