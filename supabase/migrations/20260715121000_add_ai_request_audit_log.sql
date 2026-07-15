create table if not exists public.ai_request_audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  prompt text not null,
  action_type text not null default 'summarize_case',
  status text not null default 'success' check (status in ('success', 'error')),
  response_confidence text check (response_confidence in ('high', 'medium', 'low')),
  created_at timestamptz not null default now()
);

create index if not exists ai_request_audit_log_user_created_idx
  on public.ai_request_audit_log(user_id, created_at desc);

create index if not exists ai_request_audit_log_case_created_idx
  on public.ai_request_audit_log(case_id, created_at desc);

alter table public.ai_request_audit_log enable row level security;

create policy "ai audit own select"
on public.ai_request_audit_log
for select
using (auth.uid() = user_id);
