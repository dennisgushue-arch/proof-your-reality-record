create table if not exists public.live_incident_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id text not null,
  event_type text not null,
  event_text text not null,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.live_incident_events enable row level security;

create policy "live incident events own select"
on public.live_incident_events
for select
using (auth.uid() = user_id);

create policy "live incident events own insert"
on public.live_incident_events
for insert
with check (auth.uid() = user_id);

create policy "live incident events own update"
on public.live_incident_events
for update
using (auth.uid() = user_id);

create policy "live incident events own delete"
on public.live_incident_events
for delete
using (auth.uid() = user_id);

create index if not exists live_incident_events_session_idx
  on public.live_incident_events(user_id, session_id, occurred_at asc);
