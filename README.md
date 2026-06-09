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

Behavior:

- New users (no existing subscription id) get a free trial for `STRIPE_TRIAL_DAYS`.
- Users whose account creation date falls within 3 months of `APP_LAUNCH_DATE_ISO` automatically receive the early adopter coupon at checkout.

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
