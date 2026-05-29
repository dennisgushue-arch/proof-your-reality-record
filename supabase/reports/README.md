# Billing admin reports

## Latest user billing audit

Lists the latest users with:

- early-adopter discount eligibility (first 3 months after launch)
- current plan/status
- trialing status and estimated trial days remaining

### Run latest audit

```bash
supabase db query --linked -f supabase/reports/billing_audit_latest.sql
```

### Important for latest audit

Update `app_launch_at` in `billing_audit_latest.sql` to match your production `APP_LAUNCH_DATE_ISO`.

## Billing summary totals

Provides roll-up counts by:

- `status`
- `plan`
- `early_adopter_eligible`

### Run summary totals

```bash
supabase db query --linked -f supabase/reports/billing_audit_summary_totals.sql
```

### Important for summary totals

Update `app_launch_at` in `billing_audit_summary_totals.sql` to match your production `APP_LAUNCH_DATE_ISO`.
