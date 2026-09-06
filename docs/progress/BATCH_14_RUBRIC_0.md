# Batch 14 — RUBRIC-0 Benchmark Scoring Contract

- Branch: `codex/feasibility-lock-candidate`
- Implementation commit: `7c5f93c34ce89ee2c63d2ce538fbfd43f79ad26d`
- Status: PASS / LOCKED

## Delivered contract

`RUBRIC_0_VERSION` is required on every BenchmarkObservation. The deterministic `deriveBenchmarkVerdict` returns PASS only when all existing required benchmark dimensions pass. Missing, duplicate, malformed, version-mismatched, or manually inconsistent observations fail validation. No numeric score or average can override a failed dimension.

The existing dimensions and ActionCapability policy are unchanged:

- `PRODUCT_FIDELITY`, `HAND_ANATOMY`, `ACTION_COMPLETION`, `PHYSICS`, `CAMERA_REALISM`, `UNEXPECTED_CUTS`, `VISIBLE_ARTIFACTS`
- minimum reviewed attempts: 10
- SAFE pass rate: 0.90
- RISKY pass rate: 0.60

The human-review guide is [RUBRIC_0.md](../quality/RUBRIC_0.md). It applies to one generated benchmark scene against real product references and its benchmark contract. Cross-scene continuity remains outside F0 and belongs to the later production QC pipeline.

## Verification

- `npm run typecheck` — PASS
- `npm test` — PASS, 95 tests
- `npm run benchmark:dry` — PASS with expected fail-closed `action_untested:PICK_UP`
- `npm run build -w @mochi/web` — PASS
- `git diff --check` — PASS

## Runtime accounting and next action

- Historical Gemini live calls: 1; new Gemini calls: 0
- Flow calls: 0
- Video generation: 0
- Action promotions: 0; all ActionIds remain `UNTESTED`
- R1 Product Evidence: FINAL LOCKED
- F0 Manual Omni Confirmatory Canary: NEXT / NOT STARTED
- R2-A Product Truth: next reasoning milestone / NOT STARTED

STOP. Do not run F0 or begin R2-A without explicit authorization.
