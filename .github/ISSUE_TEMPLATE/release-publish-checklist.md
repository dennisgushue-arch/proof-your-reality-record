---
name: Release Publish Checklist
about: Standardized release and deploy playbook for production publishes
title: "Release: vX.Y.Z publish checklist"
labels: [release]
assignees: []
---

## Release metadata

- [ ] Release version/tag confirmed (e.g., `vX.Y.Z`)
- [ ] Release branch confirmed (default: `main`)
- [ ] Commit SHA confirmed
- [ ] Release owner assigned
- [ ] Rollback decision owner assigned

## Pre-publish sanity

- [ ] Release notes finalized (internal + customer-facing)
- [ ] Migration notes included in release notes
- [ ] Rollback notes included in release notes
- [ ] Release branch is clean (no uncommitted changes)
- [ ] CI checks green for release SHA

## Database migrations (required)

- [ ] Apply migration: `supabase/migrations/20260527103000_add_live_incident_events.sql`
- [ ] Apply migration: `supabase/migrations/20260527113000_backfill_live_session_source.sql`
- [ ] Migration logs captured in release record
- [ ] New/updated DB objects verified and queryable

## Deploy application

- [ ] Deploy artifact from release SHA
- [ ] Deployment pipeline completed successfully
- [ ] Environment variables validated for target environment
- [ ] Basic health checks pass after deploy

## Post-deploy smoke QA (critical paths)

### Stress Mode + transcript

- [ ] `/stress-mode`: Start Voice Capture works
- [ ] Live transcript preview appears under recording control
- [ ] Transcript continues after short pause/resume speech
- [ ] Stop recording resets preview/state cleanly

### Live session finalization

- [ ] Finalize session creates incident successfully
- [ ] Created incident includes expected live-session timeline/transcript
- [ ] No console/runtime errors in finalize path

## Post-deploy smoke QA (copy + trust language)

- [ ] `/`: homepage privacy-first copy renders correctly
- [ ] `/pricing`: updated privacy-first headline/trust language visible
- [ ] Premium plan does **not** mention attorney/insurance sharing
- [ ] `/example`: updated private packet/timeline wording visible
- [ ] `/account`: account privacy note is updated
- [ ] Legal pages updated and accessible:
  - [ ] `/legal/privacy-policy.html`
  - [ ] `/legal/data-deletion.html`

## Billing/checkout sanity

- [ ] Signed-out Pro/Premium action redirects to auth/signup
- [ ] Signed-in checkout session starts successfully
- [ ] No checkout errors in browser console/network

## Publish communications

- [ ] GitHub Release created/published
- [ ] Customer-facing changelog posted
- [ ] Internal release notification posted with:
  - [ ] version/tag
  - [ ] migration status
  - [ ] smoke QA status
  - [ ] rollback owner

## Monitoring (first 24 hours)

- [ ] Track client errors for Stress Mode/dictation paths
- [ ] Track finalize-session failures and incident creation anomalies
- [ ] Track checkout/billing function error rates
- [ ] Record any regressions with repro steps

## Rollback readiness

- [ ] Previous stable version identified and redeployable
- [ ] DB rollback/forward-fix strategy reviewed (prefer forward-fix when possible)
- [ ] Backup/snapshot status verified before any destructive DB operation
- [ ] Stakeholders informed of rollback trigger criteria

## Release sign-off

- [ ] Release owner sign-off
- [ ] QA sign-off
- [ ] Engineering sign-off
- [ ] ✅ Release marked complete
