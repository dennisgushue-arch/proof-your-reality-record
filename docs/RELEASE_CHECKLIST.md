# Proof v1 Release Checklist

Use this checklist before production release. Do not store secrets in this file.

## Environment and deployment

- [ ] Production `VITE_SUPABASE_URL` verified against the intended Supabase project.
- [ ] Production `VITE_SUPABASE_PUBLISHABLE_KEY` verified.
- [ ] Supabase Auth redirect URLs verified for production domains.
- [ ] `LLM_API_KEY`, `LLM_MODEL`, and `LLM_BASE_URL` verified in Supabase Edge Function secrets, if live AI is enabled.
- [ ] Stripe price IDs verified for configured billing offers.
- [ ] Stripe webhook secret verified in production Edge Function settings.
- [ ] Vercel routing verified for SPA fallback.

## Supabase data and storage

- [ ] Evidence storage bucket exists and upload/download policies reviewed.
- [ ] RLS reviewed for `cases`, `incidents`, `evidence_items`, `profiles`, `subscriptions`, and `live_incident_events`.
- [ ] Cross-user access smoke test completed.
- [ ] Backup and rollback plan documented.

## Product and legal review

- [ ] Privacy Policy reviewed by counsel.
- [ ] Terms of Service reviewed by counsel.
- [ ] Cookie notice reviewed by counsel.
- [ ] Data deletion process verified with support owner.
- [ ] AI disclaimer reviewed for production wording.
- [ ] Support email verified.
- [ ] Analytics consent reviewed if analytics are added.
- [ ] Error monitoring configured and privacy-reviewed if added.

## Release validation

- [x] Local production build passed during Sprint E validation.
- [x] Automated tests passed during Sprint E validation.
- [ ] Manual mobile responsiveness check completed at 320px, 375px, 768px, 1024px, and 1440px.
- [ ] Production smoke test completed.
- [ ] Billing checkout smoke test completed with Stripe test mode or approved production test path.
- [ ] AI endpoint smoke test completed in production.
- [ ] Browser print / Save as PDF export smoke test completed.
