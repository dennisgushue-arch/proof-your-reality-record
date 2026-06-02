-- Admin billing audit report
-- Lists newest users with trial/discount eligibility and subscription status.
--
-- Usage:
--   supabase db query --linked -f supabase/reports/billing_audit_latest.sql
--
-- Set your real launch timestamp below before running in production.
-- This should match APP_LAUNCH_DATE_ISO used by checkout logic.
WITH params AS (
  SELECT
    '2026-06-01T00:00:00Z'::timestamptz AS app_launch_at,
    7::int AS trial_days
), report AS (
  SELECT
    u.id AS user_id,
    u.email,
    u.created_at AS user_created_at,
    (u.created_at >= p.app_launch_at AND u.created_at < p.app_launch_at + interval '3 months') AS early_adopter_eligible,
    COALESCE(s.plan, 'free') AS plan,
    s.status,
    s.current_period_end,
    (s.status = 'trialing') AS in_trial,
    CASE
      WHEN s.status = 'trialing' AND s.current_period_end IS NOT NULL
        THEN GREATEST(0, CEIL(EXTRACT(EPOCH FROM (s.current_period_end - now())) / 86400.0))::int
      ELSE NULL
    END AS trial_days_remaining_est,
    (s.current_period_end IS NOT NULL AND s.current_period_end < now()) AS period_expired
  FROM auth.users u
  CROSS JOIN params p
  LEFT JOIN public.subscriptions s
    ON s.user_id = u.id
)
SELECT
  user_id,
  email,
  user_created_at,
  early_adopter_eligible,
  plan,
  status,
  in_trial,
  trial_days_remaining_est,
  current_period_end,
  period_expired
FROM report
ORDER BY user_created_at DESC
LIMIT 200;
