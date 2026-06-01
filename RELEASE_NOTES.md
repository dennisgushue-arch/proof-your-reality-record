# Release Notes — Untagged Release Candidate

**Release date:** 2026-06-01  
**Release branch:** `main`  
**Release tag:** `TBD (no Git tag found on HEAD)`  
**Release commit (head):** `a8bef8a`

---

## Summary

This release improves performance, reliability, and readiness for production publishing.

Key outcomes:

- Added the full **Prepare Me** guided interaction briefing flow.
- Improved live incident capture and aligned core copy/legal language to a privacy-first product position.
- Reduced initial app payload with route-level lazy loading and vendor chunk splitting.
- Removed remaining `any` usage in core page surfaces for safer TypeScript behavior.
- Fixed a navigation runtime test regression caused by lazy-loaded header auth controls.

---

## User-facing highlights

### ✅ New: Prepare Me interaction briefing flow

- Added `/cases/:id/prepare` with a multi-step guided setup and briefing output.
- Added dashboard and case-level entry points into Prepare Me.
- Added live-incident handoff from the preparation flow.

### 🔒 Privacy-first copy and legal alignment

- Updated pricing, marketing, and legal wording to emphasize privacy-preserving behavior.
- Removed attorney/insurance-sharing framing from premium messaging.

### 🎙️ Better live incident capture behavior

- Improved dictation/restart handling and transcript preview behavior in stress/live capture paths.

### ⚡ Faster initial experience

- Deferred non-critical route/component loading.
- Split vendor bundles (`react`, `query`, `supabase`, `ui`, `icons`, `charts`) for better caching and lower initial execution pressure.

---

## Technical changes (engineering)

### Architecture and performance

- Route-level lazy loading in `src/App.tsx` for heavier protected surfaces.
- Deferred auth/UI entry dependencies where possible.
- Added manual chunk strategy in `vite.config.ts`:
  - `react-vendor`
  - `query-vendor`
  - `supabase-vendor`
  - `ui-vendor`
  - `icons-vendor`
  - `charts-vendor`

### Type safety and code quality

- Replaced remaining `any` usage in nearby page surfaces (`Dashboard`, `IncidentDetail`, `ExportPreview`, `Auth`, etc.) with concrete local types.
- Added/updated tests for preparation logic and navigation behavior.

### Test reliability

- Updated nav runtime test to await lazy-loaded auth controls in `AppHeader`.

---

## Verification performed

- ✅ `npm run build` passes.
- ✅ `npm test` passes (`5/5` files, `13/13` tests).
- ✅ Manual route smoke/open checks performed for:
  - `/dashboard`
  - `/incidents/:id`
  - `/cases/:id/export`
  - `/cases/:id/prepare`

---

## Migration notes

- No schema/database migration required for this release step.
- Existing Supabase migration files remain compatible with current runtime behavior.

---

## Rollback notes

If rollback is required:

1. Re-deploy previous known-good commit from `main`.
2. Revert these commits (newest first) if needed:
   - `45fecd3` — test fix for lazy auth controls
   - `a94129f` — defer auth/UI entry imports and chunk refinements
   - `3d58570` — lazy-loaded routes + vendor chunk split
   - `1b89521` — page-level `any` cleanup
3. Validate with:
   - `npm run build`
   - `npm test`
4. Run post-rollback smoke checks on auth, dashboard, incident detail, and prepare flow.

---

## Commit highlights included in this release

- `45fecd3` test(nav): await lazy AppHeader auth controls
- `a94129f` perf(bundle): defer auth/ui entry imports and refine vendor chunks
- `3d58570` perf(bundle): lazy-load routes and split vendor chunks
- `1b89521` chore(types): remove remaining any usage in pages and verify build
- `e403b25` feat: add Prepare Me interaction briefing flow
- `751f68d` chore: add release and hotfix issue templates
- `9e64e40` feat: improve live incident capture and align privacy-first copy

---

## Release checklist pointers

Use:

- `.github/ISSUE_TEMPLATE/release-publish-checklist.md`
- `.github/ISSUE_TEMPLATE/hotfix-release-checklist.md`

before marking the release as complete.
