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
