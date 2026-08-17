create table if not exists public.product_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete set null,
  event_name text not null,
  event_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.product_events enable row level security;

create policy "Users can insert their own analytics events"
on public.product_events
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users cannot read analytics events"
on public.product_events
for select
to authenticated
using (false);

create index if not exists product_events_event_name_idx
on public.product_events(event_name);

create index if not exists product_events_created_at_idx
on public.product_events(created_at);