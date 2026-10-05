-- =============================================================================
-- DISPATCH MESSAGES - Guardian Riya's secure chat system
-- =============================================================================
create table if not exists dispatch_messages (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid references sos_incidents(id) on delete cascade,
  sender_role text not null check (sender_role in ('victim', 'dispatch')),
  message_text text not null,
  created_at timestamptz not null default now()
);

alter table dispatch_messages enable row level security;

-- For MVP/testing: Allow authenticated users to insert/read messages.
-- Once the incident flow is fully tied together, this should be restricted
-- to the specific victim of the incident or an escalated officer.
create policy "dispatch_messages_insert_auth" on dispatch_messages
  for insert to authenticated
  with check (true);

create policy "dispatch_messages_select_auth" on dispatch_messages
  for select to authenticated
  using (true);
