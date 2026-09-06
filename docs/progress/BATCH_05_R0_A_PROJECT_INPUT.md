# Batch 05 — R0-A Canonical Project Input Contracts

Date: 2026-09-06

## Checkpoint

- Branch: `codex/feasibility-lock-candidate`
- Starting checkpoint: `7167a9f4c8550e7679fe9386b834fb6cdcb4234e`
- R0-A implementation commit: `82d72d506dfb42d1d77babe1f6c819b829e52855`
- Status: PASS

## Files changed

- `packages/contracts/src/index.ts`
- `packages/contracts/src/contracts.test.ts`
- `README.md`
- `STATUS.md`
- `docs/CODEX_HANDOFF.md`
- `docs/CODEX_NEXT_MILESTONES.md`
- `docs/progress/BATCH_02_M2_CANARY.md`
- `docs/progress/BATCH_05_R0_A_PROJECT_INPUT.md`

No Provider, Core, harness, or `apps/web` source changed.

## Contract decision

- `ProductInput` remains factual product/source input: product identity, name, details, category, and logical reference assets.
- `ProductInput.audience` is retired because audience is a creative/user-production control.
- `CreativeDirectionInput` contains audience, shooting context, reviewer persona, tone, voice style, voice gender, and voice region.
- `MochiProjectInput` combines schema version, project ID, ProductInput, and CreativeDirectionInput.
- `validateMochiProjectInput` reuses `validateProductInput`, then validates creative controls deterministically.
- `SCHEMA_VERSION` remains `1.0.0`: no persisted project-input payload or external contract consumer exists in this repository, so a migration artifact is not required.

## Commands executed

- `npm run typecheck`
- `npm test`
- `npm run benchmark:dry`
- `npm run build -w @mochi/web`
- Core/Contracts identifier audit for Gemini, Flow IDs, credentials, provider operations/endpoints, local paths, and `File`/`Blob` types.

## Verification

- Typecheck: PASS across all five workspaces.
- Tests: PASS, 28 tests total; Contracts has 13 tests, including valid project input, propagated ProductInput failure, missing/blank fields, supported and invalid voice controls, and canonical-shape coverage.
- Dry benchmark: PASS with expected fail-closed result. `PICK_UP` remains `UNTESTED`; feasibility remains `passed: false` with `action_untested:PICK_UP`.
- Web build: PASS.
- Real Gemini calls: 0.
- Flow calls: 0.
- Real video generation count: 0.
- Main: unchanged at `75fd0e5d80531de9d1bb8cbec9899c32d269fab4`.

## Architecture deviations

None. The contracts remain provider-neutral; assets remain logical; Product Truth and Creative Direction are separate. Existing action, continuity, lifecycle, ScenePlan, SceneProductionContract, Golden Fixture, and QC behavior are unchanged.

## Next action

STOP. R0-B apps/web Input Surface is NOT STARTED. The locked sequence remains R0-B → reasoning pipeline → Flow integration. Google Flow remains the only planned video renderer using Flow credits; Gemini 3.5 Flash remains reasoning-only; local/free TTS is the default future voice direction and will be benchmarked later.
