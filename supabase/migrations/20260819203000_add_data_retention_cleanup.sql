-- Retention cleanup for operational and analytics data.
-- Does NOT delete cases, incidents, evidence, or other user records.

create index if not exists ai_request_audit_log_created_at_idx
on public.ai_request_audit_log(created_at);

create or replace function public.cleanup_expired_operational_data()
returns table (
  ai_audit_deleted bigint,
  product_events_deleted bigint,
  rate_limit_buckets_deleted bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ai bigint;
  v_product bigint;
  v_rate bigint;
begin
  delete from public.ai_request_audit_log
  where created_at < now() - interval '90 days';

  get diagnostics v_ai = row_count;

  delete from public.product_events
  where created_at < now() - interval '180 days';

  get diagnostics v_product = row_count;

  delete from public.ai_rate_limit_buckets
  where updated_at < now() - interval '7 days';

  get diagnostics v_rate = row_count;

  return query
  select v_ai, v_product, v_rate;
end;
$$;

revoke all
on function public.cleanup_expired_operational_data()
from public, anon, authenticated;

grant execute
on function public.cleanup_expired_operational_data()
to service_role;
