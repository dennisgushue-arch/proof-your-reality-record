# Quarterly UX Review Checklist

Use this checklist once per quarter to maintain usability, accessibility, trust, and product quality.

## 1) Accessibility audit

- [ ] Keyboard navigation works end-to-end on critical journeys:
  - [ ] Auth (sign in/up, password visibility, social auth)
  - [ ] Incident logging
  - [ ] Incident review and evidence management
  - [ ] Export preview
- [ ] Skip links and focus targets are present and visible when tabbing.
- [ ] Focus indicators are clearly visible on all interactive elements.
- [ ] Color contrast meets WCAG AA on text, controls, and status indicators.
- [ ] Screen reader labels exist for icon-only controls and custom UI widgets.
- [ ] Motion/animation does not block understanding; reduced-motion fallback works.

## 2) Layout and readability review

- [ ] Spacing between form groups and cards avoids visual crowding on mobile and desktop.
- [ ] Long narratives and timeline cards remain readable at common breakpoints.
- [ ] Empty states clearly explain next steps.
- [ ] Error and warning messages are concise and actionable.

## 3) Feedback loop and support signals

- [ ] Review all user feedback submissions from the previous quarter.
- [ ] Tag feedback by category (UX, bugs, auth, exports, performance, accessibility).
- [ ] Publish top 3 planned UX improvements for next quarter.
- [ ] Verify Help & Support links are current and functional.
- [ ] Ensure "What’s New" reflects material shipped changes.

## 4) Security and privacy reassurance check

- [ ] Security/privacy messaging appears in landing and account surfaces.
- [ ] Privacy, terms, and data deletion docs are up to date.
- [ ] Authentication flows still follow least-surprise behavior (clear success/failure messaging).
- [ ] Sensitive fields (passwords) have secure defaults and optional visibility controls.

## 5) Product quality and regression pass

- [ ] Run full test suite and fix regressions before release.
- [ ] Verify critical route transitions and deep links manually.
- [ ] Confirm export output remains legible in print/PDF.
- [ ] Validate social auth provider visibility flags per environment.

## 6) Quarterly summary output (required)

At the end of each review, record:

- Quarter:
- Review date:
- Participants:
- Top 3 findings:
- Top 3 fixes committed:
- Accessibility issues opened:
- Follow-up owner and due date:
