-- Admin billing summary totals report
-- Provides executive-level counts by status, plan, and early adopter eligibility.
--
-- Usage:
--   supabase db query --linked -f supabase/reports/billing_audit_summary_totals.sql
--
-- Set your real launch timestamp below before running in production.
-- This should match APP_LAUNCH_DATE_ISO used by checkout logic.
WITH params AS (
  SELECT '2026-06-01T00:00:00Z'::timestamptz AS app_launch_at
), classified AS (
  SELECT
    COALESCE(s.plan, 'free') AS plan,
    COALESCE(s.status, 'inactive') AS status,
    (u.created_at >= p.app_launch_at AND u.created_at < p.app_launch_at + interval '3 months') AS early_adopter_eligible
  FROM auth.users u
  CROSS JOIN params p
  LEFT JOIN public.subscriptions s
    ON s.user_id = u.id
)
SELECT
  status,
  plan,
  early_adopter_eligible,
  COUNT(*)::int AS users_count
FROM classified
GROUP BY status, plan, early_adopter_eligible
ORDER BY status, plan, early_adopter_eligible DESC;
