# Proof — Reality Intelligence redesign

Scope is UI/UX only. Auth, Supabase schema, RLS, edge functions, storage, cases/incidents/evidence tables, and existing flows (New Case, IncidentNew, Upload, Export) are preserved. No new backend work.

## 1. Navigation — 5-item shell (`AppLayout.tsx`)

Rebuild `AppLayout` around one shell used by all signed-in routes:

- **Desktop (lg+)**: fixed 240px left sidebar, `#0B1120` surface, subtle white/8% right border. Logo + "Reality Intelligence" eyebrow at top. 5 nav items with lucide icons + active-state pill (electric blue `#3B82F6` at 12% bg, blue text, 2px left accent). User email + sign-out at bottom.
- **Mobile (<lg)**: slim top bar (logo + notifications + account) and a **fixed bottom nav bar** with 5 icon+label tabs, safe-area padding, active-state blue.
- **Nav items**:
  - Home → `/dashboard`
  - Cases → `/dashboard` scrolled to cases (or new `/cases` route that reuses dashboard list) — pick a single canonical route: **`/cases`** as a lightweight page listing all cases (extracted from existing dashboard data)
  - Record → `/record` (thin router page: prompts user to pick a case, then routes to `/cases/:id/incidents/new`)
  - Proof AI → `/ai` (existing `AICommandCenter` route — redesign, keep protected)
  - Account → `/account`
- Wrap `/ai` in `ProtectedRoute` (currently public) so the nav shell shows for it.

## 2. Dashboard (`src/pages/Dashboard.tsx` — full rewrite)

Preserve the Supabase query logic already in `Dashboard.tsx`/`ProfessionalDashboardPage`. Rebuild the presentation in a single file with the required section order and hierarchy:

1. **Header** — greeting with `user.user_metadata.full_name || user.email`, "Reality Intelligence Center" eyebrow, secure indicator (lock icon + "Encrypted · Private"), notifications bell (dropdown placeholder wired to toast), account link.
2. **Proof AI Brief (dominant card)** — full-width, elevated `#111827`, thin blue top border glow. Left: heading "Proof AI Brief — Here's what changed since your last review", followed by real counts derived from user data (active cases, incidents in last 7d, incidents missing narrative/location/people, incidents with `contradictions[]` in `ai_analysis`, evidence-less incidents). Right: one **Recommended action** computed from the same data (rules below). Buttons: **Open Full AI Brief** → `/ai`, **Ask Proof AI** → `/ai?ask=1`. If no cases: empty state ("Create your first case to activate Proof AI"). All AI-derived text prefixed with a small "Preview" chip when confidence is heuristic.
3. **Start Live Incident** — large primary CTA card, blue gradient border, mic+record icon, subtitle "Timestamped capture with notes, voice, photos, files". Click → `/record`.
4. **Recommended next action** — single row, amber accent if action is "complete missing details", blue if "add evidence", green if "export packet". Derived from the top-priority signal used in the AI Brief. Button routes to the specific case/incident.
5. **Active Cases** — up to 5 rows, compact list (not equal cards). Columns: title + category chip, updated relative time, incident count, evidence count (when available), status dot, "Open" button → `/cases/:id`. Footer link "View all cases" → `/cases`.
6. **Recent activity** — 6-item feed from incidents ordered by `occurred_at`, colored dot (danger/success/neutral using existing logic), title + short summary + time.
7. **Secondary metrics strip** — smaller, muted row of 4 tiles at the bottom: Protection Score, Evidence Strength, Timeline Integrity, Story Changes. Values derived from existing per-case scoring aggregated.

Recommended-action rules (client-side heuristic, labeled Preview):
- Any incident missing location/people/narrative → "Complete missing incident details" → open that incident.
- Any incident with `evidence_quality_score < 60` and 0 evidence → "Add supporting evidence".
- Any case with ≥3 incidents and no export in last 30 days → "Export a case packet".
- Otherwise → "Review your most recent incident".

## 3. New route: `/cases` (`src/pages/Cases.tsx`)

Simple list view reusing the same Supabase query as dashboard. Search input (client-side filter), category filter chips, "New Case" button (reuses existing new-case flow — link to `/dashboard` new-case modal or existing route). Each row → `/cases/:id`.

## 4. New route: `/record` (`src/pages/Record.tsx`)

Thin router page. Loads user's cases:
- 0 cases → prompt to create one (link to Cases/new case flow).
- 1 case → auto-redirect to `/cases/:id/incidents/new`.
- 2+ cases → grid of case cards; click → `/cases/:id/incidents/new`. Also link "Or start Stress Mode" → `/stress-mode`.

## 5. Proof AI Command Center (`src/pages/AICommandCenter.jsx` — redesign)

Convert to `.tsx`, keep as protected route inside `AppLayout`. Sections (all with neutral language and Preview labels where heuristic):
- Case selector (dropdown of user's cases; `?case=<id>` query support; `?ask=1` opens Ask input focused).
- **AI Case Brief** — same numbers as dashboard brief for the selected case.
- **Chronology overview** — timeline strip of incidents.
- **Possible timeline gaps** — consecutive incidents >7 days apart.
- **Possible differences between statements** — surfaces existing `ai_analysis.contradictions[]` per incident.
- **Missing documentation suggestions** — incidents with no evidence / missing fields.
- **Claims and commitments** — pulled from `ai_analysis.key_claims[]`.
- **People and locations** — deduped from incidents.
- **Recommended follow-up questions** — from `ai_analysis.follow_ups[]`.
- **Ask Proof AI** — textarea + submit. Wire to existing `supabase.functions.invoke("proof-ai", ...)` if present; otherwise show a coming-soon toast and log the question. (Check function exists before wiring; do not fabricate.)
- Persistent disclaimer footer with the exact required copy.

All copy uses "Possible…", "The available records indicate…", "Documentation may be incomplete…", "Review the original evidence."

## 6. Design tokens (`src/index.css`)

Add / adjust semantic tokens to match spec (dark cybersecurity palette). Update `--background`, `--card`, `--muted`, `--border`, `--primary` (electric blue), `--warning` (amber), `--destructive` (red), `--success` (green). Ensure existing shadcn variants pick these up. No hard-coded colors in components; use tokens.

## 7. Route wiring (`src/App.tsx`)

- Add routes for `/cases`, `/record`.
- Keep existing routes intact.
- Move `/ai` under `ProtectedRoute`.
- Ensure `/` (public landing) still points to `Index` — the current setup uses `ProfessionalDashboardPage` at `/`; change `/` back to `Index` (public marketing) and make `/dashboard` the signed-in home. Update auth redirects accordingly.
- Wrap all protected pages in the new `AppLayout` (already partially the case).

## 8. Cleanup

- Remove `ProfessionalDashboard.tsx`/`ProfessionalDashboard.css` usages from `App.tsx` root route (component file left in place to avoid churn; not imported).
- Keep `Stress Mode`, `TimelineIntelligence`, `PrepareInteraction`, `ExportPreview`, `IncidentDetail`, `IncidentNew`, `CaseDetail`, `Pricing`, `Account`, `Auth`, `Index`, `NotFound` untouched functionally; only wrap in the new `AppLayout` where they aren't already.

## 9. Verification (post-implementation)

- `bun run build` — fix any TS errors.
- Grep for broken imports of removed symbols.
- Manually walk each nav item + every listed button in the spec via Playwright at desktop (1280) and mobile (390) viewports; capture screenshots; confirm no console errors.
- Report changed files and any residual TODOs.

## Out of scope

- No schema, RLS, edge-function, or storage changes.
- No new AI analysis pipeline — AI Brief numbers are derived from existing fields (`ai_analysis`, `evidence_quality_score`, incident metadata) and clearly labeled Preview when heuristic.
- No publish.
