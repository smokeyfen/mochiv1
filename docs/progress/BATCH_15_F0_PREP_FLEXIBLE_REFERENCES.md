# Batch 15 — F0-PREP Flexible Benchmark References

- Branch: `codex/feasibility-lock-candidate`
- Implementation commit: `1f94688483ffe1e7c08dcb60bb4c559dec18d76a`
- Status: PASS / LOCKED

## Delivered compatibility correction

The pending GoldenProductFixture now expects `PRODUCT_REFERENCE`, matching the FINAL LOCKED arbitrary product-reference intake. The dry bottle ScenePlan now uses the logical `product-reference` asset name.

Expected-reference-role validation remains in force. A benchmark-ready GoldenProductFixture still requires:

- valid schema version
- verified ProductTruth identity metadata
- `source: UPLOAD`
- a non-empty SHA-256
- image MIME type
- the required `PRODUCT_REFERENCE` role

One valid real product reference can satisfy the flexible role requirement. Missing views are evidence limitations, not automatic front/side/back role failures. The pending fixture contains no real reference and remains not benchmark-ready.

## Verification

- `npm run typecheck` — PASS
- `npm test` — PASS, 97 tests
- `npm run benchmark:dry` — PASS with expected `action_untested:PICK_UP` and pending `missing_reference_role:PRODUCT_REFERENCE`
- `npm run build -w @mochi/web` — PASS
- `git diff --check` — PASS

## Locks and next action

- RUBRIC-0: PASS / LOCKED
- Historical Gemini live calls: 1; new Gemini calls: 0
- Flow calls: 0
- Video generation: 0
- Action promotions: 0; all ActionIds remain `UNTESTED`
- F0-A Manual Omni Confirmatory Canary: NEXT / NOT STARTED
- R2-A Product Truth: NOT STARTED

STOP. Do not run F0-A or begin R2-A without explicit authorization.
