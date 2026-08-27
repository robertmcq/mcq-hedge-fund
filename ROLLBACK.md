# Rollback Runbook — mcq-hedge-fund

```
Document: ROLLBACK.md
Governing Standard: MCQ-REPO-BASELINE-001 (v1.0), Dimension 12 (Release Control)
Repository: robertmcq/mcq-hedge-fund
Owner: Robert Millhouse (@robertmcq)
```

## 1. Purpose

This runbook defines the deterministic procedure to revert `mcq-hedge-fund` to its last known-good deployed state without manual, ad hoc intervention.

## 2. Preconditions

- A prior successful deployment tag/commit exists on the `main` branch (verified via `git log` or GitHub Releases).
- CI pipeline (`ci.yml`, `deploy-infrastructure.yml`, `market-pipeline.yml`) evidence for the last-known-good commit is archived.
- Docker images for the prior release are available in the configured registry (see `Dockerfile`, `docker-compose.yml`).

## 3. Rollback Procedure

1. **Identify Target Commit:** Retrieve the last verified-good commit SHA from the `MCQ-REMEDIATION-RECORD-001` evidence manifest or GitHub Releases.
2. **Halt Active Deployment:** Trigger `deploy-infrastructure.yml` workflow cancellation if a deployment is in progress.
3. **Revert Application Code:**
   ```bash
   git revert --no-commit <bad-commit-sha>..<current-head>
   git commit -m "rollback: revert to last known-good state"
   git push origin main
   ```
4. **Redeploy Prior Container Image:** Re-trigger `deploy-infrastructure.yml` against the reverted commit, or manually redeploy the last-good Docker image tag via `docker-compose.yml`.
5. **Verify Service Health:** Confirm application responds correctly (manual smoke test of core orchestration and market-pipeline endpoints).
6. **Update Remediation Record:** Log the rollback event, target commit SHA, and verification result in `MCQ-REMEDIATION-RECORD-001`.

## 4. Rollback Verification Evidence

Each rollback execution must produce:
- The reverted commit SHA.
- Timestamp of rollback execution.
- Confirmation of service health post-rollback.
- Signatory: Robert Millhouse (Managing Partner).

## 5. Escalation

If automated rollback via Git revert fails, redeploy the last tagged Docker image directly via the AWS infrastructure defined in `/infrastructure`, and document the manual deviation as an exception in the remediation record.
