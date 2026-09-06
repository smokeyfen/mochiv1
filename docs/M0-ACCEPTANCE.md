# M0 Acceptance — Contracts + Feasibility Harness

## PASS requirements

- TypeScript strict mode enabled.
- Contracts validate product, assets, continuity state, scenes, production contracts, candidates and QC.
- Scene duration hard-locked to 8 seconds and aspect ratio to 9:16.
- Video provider interface contains no Flow-specific fields.
- Lifecycle cannot skip QC.
- Critical QC failure cannot be approved.
- Action Capability Map defaults to UNTESTED.
- Feasibility evaluator fails closed on UNTESTED or AVOID actions.
- Continuity validator detects unexplained state resets.
- Minimal React status UI compiles and tests pass.

## Gate

Do not start Product Evidence / Planner implementation until the real Omni feasibility harness is wired and representative physical actions have been benchmarked.

## Verification — 2026-09-06

Status: **VERIFIED**

Environment:

- Node.js `v24.19.0` (requirement: `>=22`)
- npm `11.17.0`

Commands and results:

- `npm install` — PASS; lockfile created, 174 packages audited, 0 vulnerabilities.
- `npm run typecheck` — PASS across all five workspaces with strict TypeScript settings unchanged.
- `npm test` — PASS; 7 tests passed across web, contracts and core.
- `npm run benchmark:dry` — PASS; `PICK_UP` remained `UNTESTED`, feasibility returned `passed: false`, reason `action_untested:PICK_UP`.
- `npm run build -w @mochi/web` — PASS; Vite production build completed.

Baseline issue corrected during verification:

- The web workspace omitted React declaration packages. Added `@types/react` and `@types/react-dom` as development dependencies; no domain contract or runtime behavior changed.
