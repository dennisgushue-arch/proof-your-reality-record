create or replace function public.process_stripe_subscription_event(
  p_event_id text,
  p_event_type text,
  p_event_created bigint,
  p_user_id uuid,
  p_customer_id text,
  p_subscription_id text,
  p_plan text,
  p_status text,
  p_current_period_end timestamptz,
  p_cancel_at_period_end boolean
)
returns table (
  processed boolean,
  ignored_as_stale boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claimed text;
  v_previous_created bigint;
begin
  if p_event_id is null or btrim(p_event_id) = '' then
    raise exception 'Stripe event id is required';
  end if;

  if p_user_id is null then
    raise exception 'User id is required';
  end if;

  insert into public.stripe_webhook_events (
    event_id,
    event_type,
    event_created
  )
  values (
    p_event_id,
    p_event_type,
    p_event_created
  )
  on conflict (event_id) do nothing
  returning event_id into v_claimed;

  -- Exact duplicate event.
  if v_claimed is null then
    return query select false, false;
    return;
  end if;

  select stripe_subscription_event_created
  into v_previous_created
  from public.subscriptions
  where user_id = p_user_id
  for update;

  -- Stripe does not guarantee delivery order.
  -- Ignore an event older than the newest state already applied.
  if
    v_previous_created is not null
    and p_event_created < v_previous_created
  then
    return query select false, true;
    return;
  end if;

  insert into public.subscriptions (
    user_id,
    stripe_customer_id,
    stripe_subscription_id,
    plan,
    status,
    current_period_end,
    cancel_at_period_end,
    provider,
    stripe_subscription_event_created
  )
  values (
    p_user_id,
    p_customer_id,
    p_subscription_id,
    p_plan,
    p_status,
    p_current_period_end,
    p_cancel_at_period_end,
    'stripe',
    p_event_created
  )
  on conflict (user_id)
  do update set
    stripe_customer_id = excluded.stripe_customer_id,
    stripe_subscription_id = excluded.stripe_subscription_id,
    plan = excluded.plan,
    status = excluded.status,
    current_period_end = excluded.current_period_end,
    cancel_at_period_end = excluded.cancel_at_period_end,
    provider = 'stripe',
    stripe_subscription_event_created =
      excluded.stripe_subscription_event_created;

  return query select true, false;
end;
$$;

revoke all
on function public.process_stripe_subscription_event(
  text,
  text,
  bigint,
  uuid,
  text,
  text,
  text,
  text,
  timestamptz,
  boolean
)
from public, anon, authenticated;

grant execute
on function public.process_stripe_subscription_event(
  text,
  text,
  bigint,
  uuid,
  text,
  text,
  text,
  text,
  timestamptz,
  boolean
)
to service_role;
