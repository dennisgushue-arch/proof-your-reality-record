# Proof Your Reality Record

A private-first incident and evidence journaling app for building factual timelines.

This project is a React + TypeScript web app with Supabase-backed auth/data, focused on helping users record incidents, attach evidence, and generate neutral AI-style summaries for review.

## Tech stack

- Vite + React 18 + TypeScript
- Tailwind CSS + shadcn/ui + Radix UI
- Supabase (`@supabase/supabase-js`)
- React Router + TanStack Query
- Vitest + Testing Library

## Prerequisites

- Node.js 20+
- npm 10+

## Quick start

1. Install dependencies
2. Configure environment variables
3. Start the dev server

```bash
npm install
npm run dev
```

The app runs at `http://localhost:5173` by default.

## Environment variables

This app requires Supabase credentials in your `.env` file:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Example:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key
```

### Social login setup (Supabase Auth)

The app supports **Google, Facebook, and Apple sign-in** on the auth page.

Provider visibility is controlled by environment flags:

- `VITE_AUTH_GOOGLE_ENABLED` (default `true`)
- `VITE_AUTH_FACEBOOK_ENABLED` (default `false`)
- `VITE_AUTH_APPLE_ENABLED` (default `false`)

To enable Google login:

1. In Supabase Dashboard, go to **Authentication → Providers → Google** and enable it.
2. Add your Google OAuth client id/secret in Supabase.
3. Add your app URL(s) to Supabase Auth redirect URLs (for example `http://localhost:5173/dashboard` in local dev).

To enable Facebook or Apple login, repeat the same provider setup steps in Supabase for each provider, then set that provider's `VITE_AUTH_*_ENABLED` flag to `true`.

Notes:

- Enterprise **Single Sign-On (SSO)** is feasible via Supabase SAML/OIDC support (plan-dependent). Typical rollout is org domain discovery + identity provider metadata exchange.
- The auth provider debug panel is non-production only and appears when `?debugAuth=1` is present on the auth URL.

### Billing policy environment variables (Supabase Edge Functions)

Configure these in your Supabase project secrets for Stripe checkout behavior:

- `STRIPE_TRIAL_DAYS` (default: `7`)
- `APP_LAUNCH_DATE_ISO` (example: `2026-06-01T00:00:00Z`)
- `STRIPE_COUPON_ID_EARLY_ADOPTER_50` (Stripe coupon id for 50% off)
- `STRIPE_PRICE_ID_PRO` (optional legacy Pro price ID)
- `STRIPE_PRICE_ID_PREMIUM` (optional legacy Premium price ID)
- `STRIPE_PRICE_ID_PREMIUM_MONTHLY` (Stripe price ID for the auto-renewing monthly premium plan)
- `STRIPE_PRICE_ID_PREMIUM_ANNUAL` (Stripe price ID for the auto-renewing annual premium plan)
- `STRIPE_PRICE_ID_PREPAID_90` (Stripe price ID for the 90-day prepaid plan)
- `STRIPE_PRICE_ID_PREPAID_365` (Stripe price ID for the 365-day prepaid plan)
- `STRIPE_PRICE_ID_TOPUP_30` (Stripe price ID for the 30-day access top-up)
- `STRIPE_SECRET_KEY` (your Stripe secret key)
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `SITE_URL` (optional; falls back to request origin)
- `STRIPE_WEBHOOK_SECRET` (required for webhook verification)

Behavior:

- New users (no existing subscription id) get a free trial on eligible subscription offers for `STRIPE_TRIAL_DAYS`.
- Users whose account creation date falls within 3 months of `APP_LAUNCH_DATE_ISO` automatically receive the early adopter coupon at checkout.
- Subscription offers renew automatically; prepaid and top-up offers use one-time checkout and extend the access date shown in the account page.

### Demo case

The dashboard now includes a new advanced multi-evidence demo flow that seeds a case with:

- photo, video, and voice-note evidence
- GPS location tracking
- witness statements
- contradictory claims and timeline analysis
- export packet preparation

Open the dashboard and click the `EXPLORE DEMO CASE` button to launch the advanced demo case in Export preview.

Note: the dashboard shows a small "Multi-evidence demo" badge next to the Explore button to indicate this richer demo flow.

### Stripe function validation

The repo includes helper npm scripts to validate Supabase edge functions with Deno:

- `npm run supabase:functions:lint`
- `npm run supabase:functions:check`
- `npm run supabase:functions:validate`

These expect `deno` to be installed and will run against `supabase/functions`.

#### Local Deno validation example

Create a local `.env` file for validation only (do not commit secrets):

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_ID_PRO=price_...
STRIPE_PRICE_ID_PREMIUM=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=public-anon-key
SUPABASE_SERVICE_ROLE_KEY=service-role-key
SITE_URL=http://localhost:5173
STRIPE_TRIAL_DAYS=7
APP_LAUNCH_DATE_ISO=2026-06-01T00:00:00Z
STRIPE_COUPON_ID_EARLY_ADOPTER_50=coupon_...
STRIPE_PRICE_ID_PREMIUM_MONTHLY=price_...
STRIPE_PRICE_ID_PREMIUM_ANNUAL=price_...
STRIPE_PRICE_ID_PREPAID_90=price_...
STRIPE_PRICE_ID_PREPAID_365=price_...
STRIPE_PRICE_ID_TOPUP_30=price_...
```

Run validation with:

```bash
deno lint supabase/functions
npx deno check supabase/functions
```

### Continuous integration (CI)

A GitHub Actions workflow has been added to run the following checks on pushes and pull requests:

- ESLint
- TypeScript type checks (npx tsc --noEmit)
- Unit tests (Vitest)
- Deno lint & check for Supabase edge functions

This ensures the Deno-based Supabase functions are validated even when Deno is not available locally. The workflow file is at `.github/workflows/ci.yml`.

### Stripe env troubleshooting

- `deno` is required to run the validation scripts. Install it from [https://deno.land](https://deno.land).
- `STRIPE_SECRET_KEY` and `STRIPE_PRICE_ID_PRO` / `STRIPE_PRICE_ID_PREMIUM` must be set for checkout creation.
- `STRIPE_WEBHOOK_SECRET` is required for webhook verification in `supabase/functions/stripe-webhook`.
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` must point to the correct Supabase project.
- If validation fails, check for missing env vars and incorrect Stripe price IDs before debugging code.

## Scripts

- `npm run dev` — start local development server
- `npm run build` — production build
- `npm run build:dev` — development-mode build
- `npm run preview` — preview built app
- `npm run lint` — run ESLint
- `npm test` — run test suite once
- `npm run test:watch` — run tests in watch mode

## Core flows

- **Auth & protected routes**: unauthenticated users are redirected from private pages.
- **Case management**: create and browse cases in a dashboard.
- **Incident capture**:
  - structured incident fields (time, location, people, tags)
  - freeform narrative entry
  - optional speech dictation (browser SpeechRecognition API)
  - optional evidence attachment
- **Captured photo relabeling**:
  - camera photos are relabeled with deterministic metadata-friendly filenames
  - format: `<prefix>-<timestamp>-<location>[-index].<ext>`
- **Incident analysis view**:
  - neutral summary
  - timeline
  - claims/contradictions/missing-evidence/follow-up sections

## Testing

Current tests cover:

- utility behavior in `src/lib/capturedPhotoNaming.ts`
- hook behavior in `src/hooks/useDictation.ts`

Run all tests:

```bash
npm test
```

## Project structure (high-level)

- `src/pages/` — route-level pages (dashboard, incident detail, etc.)
- `src/components/` — reusable UI and app components
- `src/hooks/` — custom hooks (including dictation)
- `src/lib/` — utility and domain helpers
- `src/integrations/supabase/` — Supabase client/types
- `src/test/` — test setup and unit tests
- `supabase/migrations/` — SQL schema migrations

## Contributing

Use the canonical PR checklist in `.github/pull_request_template.md` for every pull request so reviewers consistently run the same fast + full QA workflow.

For quarterly product quality and accessibility reviews, use `docs/QUARTERLY_UX_REVIEW_CHECKLIST.md`.

To update in-app "What’s New" release notes, edit `src/content/whatsNew.ts` (no UI component edits required).

## Keystore & signing: secure handling and rotation

I removed tracked `android/key.properties` and any upload keystore files from the repository to avoid leaking signing material. Follow these steps to rotate and store your keystore securely:

1. Rotate the key (preferred): use the Google Play App Signing flow to rotate signing keys if the old key was exposed. See [Rotate your app signing key](https://support.google.com/googleplay/android-developer/answer/9842756).

2. Locally: keep a private `android/key.properties` file (not checked in). Use `android/key.properties.example` as a template.

3. CI / GitHub Actions: store your signing keystore and passwords in GitHub Secrets and configure signing in your CI pipeline. Example pattern:

```bash
# Add secrets in the repo settings (Settings → Secrets → Actions):
# ANDROID_KEYSTORE_BASE64 (base64 of the .jks file)
# ANDROID_KEYSTORE_PASSWORD
# ANDROID_KEY_ALIAS
# ANDROID_KEY_PASSWORD
```

In CI you can decode the keystore at runtime and use it for signing (example in GH Actions):

```yaml
- name: Decode keystore
  run: echo "$ANDROID_KEYSTORE_BASE64" | base64 --decode > upload-keystore.jks

- name: Build & sign
  run: ./gradlew bundleRelease -Pandroid.injected.signing.store.file=upload-keystore.jks \
    -Pandroid.injected.signing.store.password="$ANDROID_KEYSTORE_PASSWORD" \
    -Pandroid.injected.signing.key.alias="$ANDROID_KEY_ALIAS" \
    -Pandroid.injected.signing.key.password="$ANDROID_KEY_PASSWORD"
```

### Upload preflight (before Play upload)

Quick fingerprint gate to avoid wrong-key uploads:

1. Build the bundle:

```bash
npm run android:bundle
```

1. Verify signer SHA1 on the built `.aab`:

```bash
keytool -printcert -jarfile android/app/build/outputs/bundle/release/app-release.aab | grep "SHA1"
```

1. Ensure SHA1 matches your Play Console expected upload key fingerprint.

For this app, current expected fingerprint is:

```text
DC:94:30:62:0F:31:05:AC:18:27:5E:4F:67:51:79:BC:9B:E6:08:0F
```

If mismatch: stop upload, fix `android/key.properties` / CI keystore source, rebuild, and re-verify.

### Remove leaked secrets from git history

If sensitive files were previously committed, remove them from the current branch and then cleanse history if necessary.

Quick (removes from current branch only):

```bash
git rm --cached android/key.properties
git commit -m "Remove tracked key.properties"
git push
```

To cleanse history, use the BFG Repo-Cleaner or `git filter-repo` (preferred) and then rotate the keys.

If you'd like, I can open a PR that removes tracked files (already removed here) and adds these instructions.
