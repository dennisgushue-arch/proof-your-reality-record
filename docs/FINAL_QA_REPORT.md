# Proof launch QA report

Date: July 28, 2026

## Automated release checks

| Area | Result | Evidence |
| --- | --- | --- |
| Focused launch-readiness tests | Pass | 29 tests across navigation, onboarding progress, entity schema, and capture modes |
| Full application test suite | Pass | 219 tests across 30 files |
| Production web build | Pass | Vite production build completed successfully |
| ESLint | Pass with warnings | 0 errors; 8 pre-existing Fast Refresh warnings in shared UI/context modules |
| Patch formatting | Pass | `git diff --check` produced no errors |
| Account deletion function | Deployed | `delete-account` deployed to Supabase project `ltyhrjiqrslpgblbzbfg` |

## Journey coverage

| Journey step | Status | Notes |
| --- | --- | --- |
| Sign up | Automated | Signup and password recovery behavior covered by auth tests. Production email delivery still requires a real inbox check. |
| Sign in | Automated | Protected-route redirect, session loading, and authenticated navigation covered. |
| Create a case | Code/build verified | Guided empty state and success confirmation link to the first incident flow. |
| Add incidents | Automated + build verified | Capture selector, recording state, save flow, contextual feedback, and timeline next step covered. |
| Upload evidence | Automated + build verified | Storage path, photo naming, completion, and recording utility tests pass. A real-device camera/file permission check remains manual. |
| Analyze incident | Automated + build verified | Live endpoint response validation remains in place; silent mock fallback was removed. |
| Analyze entities | Automated + build verified | Extraction function tests pass; new case-level Entity Intelligence route handles loading, empty, error, entity, and relationship states. |
| View timeline | Build verified | Empty and loading states guide users to the first incident; populated timeline uses documented records. |
| Export | Automated + build verified | Readiness and clipboard/export utilities pass; print-dialog behavior requires a manual browser/device check. |
| Upgrade subscription | Build and prior production verification | Checkout/portal paths compile and billing tests pass. A live paid transaction must be performed by an authorized tester. |
| Sign out and back in | Automated | Auth navigation and protected-route behavior pass. |
| Delete account | Deployed + build verified | Typed confirmation calls an authenticated function that removes evidence objects before deleting the auth user and cascading owned rows. Must be manually tested with a disposable production account. |

## Rough edges resolved

- Removed automatic demo-data seeding from the active dashboard.
- Removed public demo/example routes and unused rollback imports from the production entry point.
- Removed silent local/mock AI analysis fallback from incident analysis.
- Replaced generic route, session, case, timeline, entity, incident, AI, and export loading copy with contextual status feedback.
- Added guided empty states for dashboard, cases, incidents, timeline, exports, AI Workspace, and Entity Intelligence.
- Added a six-step activation checklist based on real records plus completed analysis/export milestones.
- Added clear success confirmation and next-step links for case creation, incident save, AI analysis, entity analysis, and export.
- Added editable profile name/email, password change, subscription management, legal links, and self-service account deletion.
- Added polished 404, offline/reconnected, session-expired, query error, and unauthorized redirect experiences.
- Removed source `console.log`, `TODO`, `FIXME`, and `debugger` release leftovers. Remaining matches are stale generated Android assets or ordinary prose/type declarations.

## Manual release gate

Before inviting beta users, complete these checks with a disposable production account and a real device:

1. Confirm signup and email-change messages arrive and their links return to the expected app route.
2. Deny and allow microphone, camera, location, and file permissions on Android and one desktop browser.
3. Upload and reopen a real evidence file, then verify it is inaccessible from another account.
4. Run live incident AI and Entity Analysis, review generated content, and confirm source records remain visible.
5. Print/Save as PDF and inspect page breaks, sensitive-data warnings, and selected sections.
6. Complete a Stripe test/live checkout approved for the release environment, open the billing portal, and verify subscription state refresh.
7. Sign out, sign back in, and confirm all records remain scoped to the same account.
8. Delete the disposable account, verify sign-in no longer works, and confirm its evidence object paths are removed.

Do not use a real user account for the deletion check.
