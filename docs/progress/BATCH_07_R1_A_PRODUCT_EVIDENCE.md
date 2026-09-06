# Batch 07 — R1-A Product Evidence Engine

Date: 2026-09-06

## Checkpoint

- Branch: `codex/feasibility-lock-candidate`
- Starting checkpoint: `59070dd2d81454f95521157b0f367885570dac0a`
- R1-A implementation commit: `4e172b95e335752252da17fae09140a0e0b4ee33`
- R1-A factual context correction: `70415a3b869cfc577d1e5ca1cfd0dd91f00da2ad`
- Status: PASS

## Files changed

- `packages/contracts/src/index.ts`
- `packages/contracts/src/contracts.test.ts`
- `packages/evidence/package.json`
- `packages/evidence/tsconfig.json`
- `packages/evidence/src/index.ts`
- `packages/evidence/src/index.test.ts`
- `package-lock.json`
- `STATUS.md`
- `docs/CODEX_NEXT_MILESTONES.md`
- `docs/progress/BATCH_07_R1_A_PRODUCT_EVIDENCE.md`

No apps/web, Core, Provider implementation, harness, video runtime, or backend source changed.

## Evidence boundary

- ProductEvidence now includes conservative packaging notes plus typed uncertainties and contradictions, all tied only to logical asset IDs.
- `validateProductEvidence` rejects structural, product identity, logical provenance, note, claim, uncertainty, and contradiction errors deterministically.
- `analyzeProductEvidence` accepts only ProductInput, runtime image media, and IntelligenceProvider. CreativeDirectionInput is outside its public boundary and is not included in the reasoning instruction.
- Runtime media is preflighted before the provider call, then passed in one structured evidence pass. Bytes are never included in ProductEvidence.
- ProductEvidence errors are limited to INVALID_INPUT, MISSING_MEDIA, INVALID_MEDIA, INVALID_MODEL_OUTPUT, and PROVIDER_FAILURE. Provider details are not surfaced.

## Commands executed

- `npm install`
- `npm run typecheck`
- `npm test`
- `npm run benchmark:dry`
- `npm run build -w @mochi/web`
- Evidence package identifier audit for forbidden runtime identifiers.

## Verification

- Typecheck: PASS across six workspaces.
- Tests: PASS, 39 tests total. Product Evidence has 10 mock/stub tests; Contracts has 14 tests.
- Dry benchmark: PASS with expected fail-closed result. `PICK_UP` remains `UNTESTED`; feasibility remains `passed: false` with `action_untested:PICK_UP`.
- Web build: PASS; R0-B behavior unchanged.
- Evidence identifier audit: PASS. No forbidden provider implementation, model, credential, video-runtime, session, media identifier, or local path appeared in `packages/evidence`.
- Live Gemini calls: 0.
- Flow calls: 0.
- Real video generation count: 0.
- Main: unchanged at `75fd0e5d80531de9d1bb8cbec9899c32d269fab4`.

## Architecture deviations

None. Product Truth remains separate from Creative Direction. The engine uses only the IntelligenceProvider abstraction and does not import a concrete provider. Action capability classifications, VideoProvider behavior, continuity, lifecycle, ScenePlan, and QC locks are unchanged.

## Factual context correction

The initial R1-A instruction did not include ProductInput factual values. A deterministic builder now emits fixed Product Evidence rules, a clearly delimited sanitized `PRODUCT_INPUT_JSON` block, and a closing rule lock. The JSON includes only product ID, name, details, category, and each logical asset's ID, role, source, and MIME type. It excludes creative controls, runtime bytes, local paths, credentials, and runtime identifiers. User text remains JSON data and cannot override the rules.

Regression verification at `70415a3b869cfc577d1e5ca1cfd0dd91f00da2ad`:

- `npm run typecheck` — PASS.
- `npm test` — PASS, 42 tests total; Product Evidence has 13 tests.
- `npm run benchmark:dry` — PASS with expected fail-closed `action_untested:PICK_UP`.
- `npm run build -w @mochi/web` — PASS.
- Evidence identifier/content audit: PASS. The reasoning context contains factual ProductInput only; media bytes remain in `request.media`.
- Live Gemini calls: 0; Flow calls: 0; real video generation count: 0.

## Next action

STOP. R1-B live reasoning bridge is NOT STARTED. Do not connect apps/web to a provider, make live provider calls, or begin Flow integration.
