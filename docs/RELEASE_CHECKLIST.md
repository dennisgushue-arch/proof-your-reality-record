# Proof v1 Release Checklist

Use this checklist before production release. Do not store secrets in this file.

## Phase 1 polished beta gate

Focus only on items that block real beta users from completing Proof's core value loop.

### Must-pass product journeys

- [x] Password reset flow implemented in-app using Supabase Auth recovery links.
- [x] Password reset tests cover forgot-password mode, reset email redirect, reset-password mode, mismatch validation, `updateUser`, success redirect, and invalid/expired reset links.
- [ ] Sign up smoke test completed against production Supabase Auth.
- [ ] Sign in smoke test completed against production Supabase Auth.
- [ ] Forgot password email delivery smoke test completed using production email provider.
- [ ] Reset password from production email link smoke test completed; URL is cleaned after recovery.
- [ ] First-time onboarding reviewed on a clean browser profile/localStorage state.
- [ ] Create case smoke test completed.
- [ ] Add incident smoke test completed.
- [ ] Upload evidence smoke test completed for at least one photo/image and one document/file.
- [ ] Analyze incident smoke test completed; confirm live LLM or fallback behavior is clear to the user.
- [ ] Analyze entities smoke test completed from an incident detail page.
- [ ] Export/share smoke test completed with browser print / Save as PDF and copy-to-clipboard export.

### First-time user onboarding polish

- [x] Empty dashboard includes a first-run onboarding flow before the generic empty state.
- [x] Header exposes Privacy, Terms, and Data Deletion links.
- [ ] Verify first-run CTA order is clear: create case → add incident → attach evidence → analyze/export.
- [ ] Verify onboarding copy avoids legal advice claims and clearly states user review is required.
- [ ] Verify first-run flow works on mobile widths: 320px, 375px, and 768px.

### Obvious UI blockers to check manually

- [ ] No broken navigation links in the header, dashboard, case detail actions, incident detail actions, or export page.
- [ ] Loading, empty, and error states are understandable on dashboard, cases, case detail, incident detail, and export pages.
- [ ] Buttons that trigger network calls show disabled/loading states and do not double-submit.
- [ ] Evidence upload failures are visible without losing the incident record.
- [ ] AI fallback mode is visible when live LLM calls fail.

### Legal and trust

- [x] Privacy Policy page exists at `/legal/privacy-policy.html`.
- [x] Terms of Service page exists at `/legal/terms-of-service.html`.
- [x] Data Deletion page exists at `/legal/data-deletion.html`.
- [x] Cookie Notice page exists at `/legal/cookie-notice.html`.
- [ ] Final legal copy reviewed and approved for beta launch.
- [ ] Support/contact email in legal pages verified.

### Production configuration gates

- [ ] Production app is served over HTTPS only.
- [ ] Supabase Auth Site URL is set to the canonical HTTPS production URL.
- [ ] Supabase Auth redirect allowlist includes `https://www.proofrealityrecord.xyz/auth?mode=reset-password`.
- [ ] Supabase Auth redirect allowlist includes any non-www production alias only if that alias is intentionally supported.
- [ ] Supabase Auth email templates use production branding and a working support/reply-to address.
- [ ] Production SMTP/custom email provider is configured and verified; do not rely on Supabase default email limits for beta.
- [ ] SPF, DKIM, and DMARC records are configured for the sending domain.
- [ ] Evidence storage bucket and RLS policies verified in production.
- [ ] Supabase Edge Function secrets for AI/entity analysis are configured in production, or fallback behavior is accepted for beta.

### Fast validation commands

- [x] `npm test -- --run` passed after password reset implementation.
- [x] `npm run build` passed after password reset implementation.
- [ ] `npm run lint` passed before beta cut.

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
