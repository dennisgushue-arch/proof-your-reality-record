---
name: Hotfix Release Checklist
about: Fast-path production hotfix playbook with strict rollback gates
title: "Hotfix: <short issue summary>"
labels: [hotfix, release]
assignees: []
---

## Hotfix metadata

- [ ] Incident / bug link attached
- [ ] Severity confirmed (P0/P1/P2)
- [ ] Target environment confirmed
- [ ] Hotfix owner assigned
- [ ] Rollback owner assigned

## Scope guard (must stay small)

- [ ] Change set is minimal and directly tied to the incident
- [ ] No unrelated refactors or copy churn included
- [ ] Risky dependency upgrades avoided
- [ ] Database changes avoided **or** explicitly approved below

## DB change gate (only if required)

- [ ] No migration required

**If migration is required, complete all:**

- [ ] Migration reviewed by 2nd engineer
- [ ] Backward compatibility confirmed
- [ ] Rollback/forward-fix plan documented
- [ ] Backup/snapshot verified pre-apply

## Pre-deploy validation (fast path)

- [ ] Repro steps confirmed on current production behavior
- [ ] Fix verified locally/staging against repro
- [ ] Targeted tests for touched area pass
- [ ] Build passes (or equivalent deploy artifact check)

## Deploy execution

- [ ] Hotfix branch merged/pushed to release target
- [ ] Deploy completed successfully
- [ ] Post-deploy health endpoint/app load check passed

## Critical smoke checks (5–10 minutes)

- [ ] Primary incident path now works as expected
- [ ] Adjacent high-risk path still works (one nearest dependency path)
- [ ] No new console/runtime errors on affected route
- [ ] Auth/session behavior unaffected (if relevant)
- [ ] Billing/checkout unaffected (if relevant)

## Fast rollback gates

Rollback immediately if any are true after deploy:

- [ ] Primary incident still reproducible
- [ ] Error rate spike above normal baseline
- [ ] Data integrity risk detected
- [ ] Auth or checkout critical regression detected

## Communication

- [ ] Internal hotfix notice posted (what changed + risk + owner)
- [ ] Stakeholders notified of status (deployed / monitoring / rolled back)
- [ ] Customer-facing update posted if incident was externally visible

## Monitoring window (first 2–24 hours)

- [ ] Watch logs/errors for affected endpoints/routes
- [ ] Watch conversion-critical metrics if impacted path is user-facing
- [ ] Confirm no recurrence via original repro steps

## Closeout

- [ ] Root cause captured
- [ ] Follow-up hardening tasks created (tests, refactor, observability)
- [ ] Hotfix issue marked complete
