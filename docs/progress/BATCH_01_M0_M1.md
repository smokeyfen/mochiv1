# Batch 01 — M0 + M1

Date: 2026-09-06

## Checkpoint

- Branch: `codex/feasibility-lock-candidate`
- Main bootstrap commit: `75fd0e5d80531de9d1bb8cbec9899c32d269fab4`
- M1 implementation commit: `5af5172`
- Status: PASS

## Files changed

M0 bootstrap verification:

- `apps/web/package.json`
- `package-lock.json`
- `docs/M0-ACCEPTANCE.md`

M1 implementation:

- `apps/harness/src/golden-fixtures.ts`
- `apps/harness/src/index.ts`
- `packages/contracts/src/index.ts`
- `packages/contracts/src/contracts.test.ts`
- `packages/core/src/index.ts`
- `packages/core/src/core.test.ts`

## Commands executed

- `node --version` — PASS (`v24.19.0`)
- `npm --version` — PASS (`11.17.0`)
- `npm install` — PASS (174 packages audited, 0 vulnerabilities)
- `npm run typecheck` — PASS across all five workspaces
- `npm test` — PASS (14 tests: web 1, contracts 4, core 9)
- `npm run benchmark:dry` — PASS with expected fail-closed result
- `npm run build -w @mochi/web` — PASS

## Benchmark status

- Dry manifest: PASS
- Pending fixtures represented: bottle, tube, box, device, soft package
- Fixture readiness without real references: BLOCKED as expected
- `PICK_UP` capability: `UNTESTED`
- `PICK_UP` feasibility preflight: blocked with `action_untested:PICK_UP`
- Capability promotion with zero observations: blocked
- Capability promotion with one successful observation: blocked

## Real generation count

0

## Problems and fixes

- M0 web typecheck initially failed because React declaration packages were absent. Added `@types/react` and `@types/react-dom` to the web development dependencies without changing runtime or domain behavior.
- M1 harness typecheck initially rejected a local import ending in `.ts`. Changed it to the repository's existing bundler-style extensionless import.

## Blockers

- No verified real product reference set is committed or configured.
- Provider credentials have not been established in this environment.
- The approved intelligence model and future Flow video path must remain separate before provider implementation.

## Architecture deviations

None. Core remains provider-agnostic; generated output remains Candidate-only; QC remains fail-closed; continuity, 8-second and 9:16 locks are unchanged.

## Next action

Implement M2-A as a Gemini 3.5 Flash Free Tier intelligence-provider boundary using mocks/stubs. M2-B Flow Video Canary remains separate and requires real Flow access plus product references.

## Pre-M2 provider boundary correction

Commit: `6ad9d0e` (`fix: harden provider asset boundary`)

The M0 import exposed provider bindings on Core `AssetRef`. The field was removed before M2. `AssetRef` now contains only schema version, logical identity and provider-agnostic metadata; resolved provider references are owned by `packages/providers`.

Files changed:

- `packages/contracts/src/index.ts`
- `packages/contracts/src/contracts.test.ts`
- `packages/contracts/src/asset-boundary.typecheck.ts`
- `packages/contracts/tsconfig.json`
- `packages/providers/src/index.ts`
- `docs/CODEX_HANDOFF.md`

Verification:

- `npm run typecheck` — PASS across all five workspaces.
- `npm test` — PASS (15 tests: web 1, contracts 5, core 9).
- `npm run benchmark:dry` — PASS; `PICK_UP` remains `UNTESTED` and blocked.
- `npm run build -w @mochi/web` — PASS.
- Core/provider identifier search — no Gemini file URI, Flow `mediaId`, operation ID, bearer or session field in Contracts/Core/harness.

Architecture deviations: none. This change restores the locked provider boundary and does not start M2.
