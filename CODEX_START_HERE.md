# Codex Start Here — MochiV1

You are continuing an existing architecture-driven project. Do not redesign it from scratch.

## Immediate task: BASELINE VERIFICATION ONLY

Your first task is to establish a reproducible M0 baseline before implementing M1.

### Steps

1. Read `AGENTS.md` and `docs/CODEX_HANDOFF.md` fully.
2. Inspect the repository tree and existing tests.
3. Confirm Node.js >= 22.
4. Install dependencies normally and create a lockfile if one does not already exist.
5. Run:
   - `npm run typecheck`
   - `npm test`
   - `npm run benchmark:dry`
   - `npm run build -w @mochi/web`
6. Fix only baseline/tooling/type/test issues needed to make M0 reproducible.
7. Do not change domain contracts unless a concrete test or type failure proves a defect.
8. Do not implement real video-provider calls, Product Evidence, Planner, Flow integration, QC repair loops, or UI features in this task.
9. Update `docs/M0-ACCEPTANCE.md` with an explicit VERIFIED/UNVERIFIED section based on actual commands run.
10. Commit only the baseline-verification changes if the environment is a Git worktree.

### Required final report

Return:

- files changed
- commands run
- exact test/type/build results
- any remaining blocker
- whether M0 is VERIFIED
- whether it is safe to begin M1

### Preservation Lock

Preserve:

- provider-agnostic contracts
- fail-closed action feasibility
- QC lifecycle that cannot skip QC
- continuity state semantics
- V1 8s / 9:16 constraints
- minimal UI policy
- all actions defaulting to UNTESTED

Do not proceed to M1 unless M0 is fully reproducible.
