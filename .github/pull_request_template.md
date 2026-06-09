## Summary

<!-- What changed and why? Keep this to 3-6 bullets. -->

- 
- 
- 

## Scope

- [ ] UI/UX only
- [ ] Bug fix
- [ ] Refactor
- [ ] New feature
- [ ] Docs / non-code

## Risk Level

- [ ] P0 (critical flow / data / auth / billing)
- [ ] P1 (important UX or workflow)
- [ ] P2 (polish / low-risk)

## QA Checklist (Canonical)

### Fast QA (non-technical, ~30 seconds)

- [ ] Product immediately feels like emergency documentation (not generic dashboard)
- [ ] **START LIVE INCIDENT** is clearly the dominant action
- [ ] Contradiction alerts feel urgent and hard to ignore
- [ ] Trust signals are visible (timestamp / protected / private)
- [ ] Mobile quick glance is readable without zoom

### Full QA (technical)

#### Visual hierarchy & clarity
- [ ] Primary CTA hierarchy is obvious and consistent
- [ ] Evidence score/ring is noticeable and understandable
- [ ] Contradiction severity styling is visually distinct from neutral cards

#### Mobile safety (iPhone 13 mini + iPhone SE)
- [ ] Sticky top banner clears notch/status bar
- [ ] Bottom floating CTA clears home indicator safe area
- [ ] Sticky/fixed controls do not hide critical content while scrolling
- [ ] Sub-420px text wraps cleanly (no clipping/overflow)

#### Regression checks
- [ ] Core routing/entry points still work (especially live incident path)
- [ ] No behavior regressions in touched flows
- [ ] Keyboard focus states remain visible and reachable

#### Quality gates
- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] `npm run build` passes

## Validation Notes

<!-- Paste command outputs, screenshots, or short findings. -->

- 

## Related Issues

<!-- Example: Closes #123 -->

- 

## Reviewer Focus

<!-- Point reviewers to the highest-risk files/sections. -->

- 

## Final Decision

- [ ] Ready for review
- [ ] Ready to merge (after approvals)
- [ ] Follow-up required
