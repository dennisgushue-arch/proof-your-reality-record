-- Server-side AI usage rate limiting.
-- This migration was originally applied directly to production and is
-- reconstructed here so local migration history matches production.

create table if not exists public.ai_rate_limit_buckets (
  user_id uuid not null,
  bucket_key text not null,
  window_start timestamptz not null,
  request_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, bucket_key, window_start)
);

create index if not exists ai_rate_limit_buckets_updated_at_idx
  on public.ai_rate_limit_buckets (updated_at);

revoke all on table public.ai_rate_limit_buckets from public;
revoke all on table public.ai_rate_limit_buckets from anon;
revoke all on table public.ai_rate_limit_buckets from authenticated;
grant all on table public.ai_rate_limit_buckets to service_role;

create or replace function public.consume_ai_rate_limit(
  p_user_id uuid,
  p_bucket_key text,
  p_window_seconds integer,
  p_limit integer
)
returns table (
  allowed boolean,
  request_count integer,
  limit_value integer,
  reset_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_window_start timestamptz;
  v_reset_at timestamptz;
  v_count integer;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'unauthorized';
  end if;

  if p_window_seconds <= 0 or p_limit <= 0 then
    raise exception 'invalid rate limit configuration';
  end if;

  v_window_start := to_timestamp(
    floor(extract(epoch from v_now) / p_window_seconds) * p_window_seconds
  );

  v_reset_at :=
    v_window_start + make_interval(secs => p_window_seconds);

  insert into public.ai_rate_limit_buckets (
    user_id,
    bucket_key,
    window_start,
    request_count,
    updated_at
  )
  values (
    p_user_id,
    p_bucket_key,
    v_window_start,
    1,
    v_now
  )
  on conflict (user_id, bucket_key, window_start)
  do update set
    request_count =
      public.ai_rate_limit_buckets.request_count + 1,
    updated_at = v_now
  where public.ai_rate_limit_buckets.request_count < p_limit
  returning public.ai_rate_limit_buckets.request_count
  into v_count;

  if v_count is null then
    select b.request_count
      into v_count
      from public.ai_rate_limit_buckets b
     where b.user_id = p_user_id
       and b.bucket_key = p_bucket_key
       and b.window_start = v_window_start;

    return query
      select false,
             coalesce(v_count, p_limit),
             p_limit,
             v_reset_at;
    return;
  end if;

  return query
    select true,
           v_count,
           p_limit,
           v_reset_at;
end;
$$;

revoke all
on function public.consume_ai_rate_limit(uuid, text, integer, integer)
from public;

grant execute
on function public.consume_ai_rate_limit(uuid, text, integer, integer)
to authenticated;

grant execute
on function public.consume_ai_rate_limit(uuid, text, integer, integer)
to service_role;
