# Batch 16 — F0-A.1 Real Bottle Canary Fixture

- Branch: `codex/feasibility-lock-candidate`
- Implementation commit: `f138448c5ccf8c080400e04354fac6a9760d1f33`
- Status: PASS / LOCKED

## Canonical F0 product data

- Fixture: `f0-cocoon-turmeric-serum-bottle-v1`
- Product: `f0-cocoon-turmeric-serum` — Cocoon Hưng Yên Turmeric Serum
- Category context: Skincare / Face Serum
- Factual identity: transparent amber-orange cylindrical serum bottle, black attached dropper cap, white rectangular front label, and Cocoon Original Vietnam branding; the label identifies Hưng Yên Turmeric Serum.
- One logical reference: `f0-cocoon-reference-01`
- Original filename for documentation only: `bottle-02.png`
- Asset role/source/MIME: `PRODUCT_REFERENCE` / `UPLOAD` / `image/png`
- SHA-256: `B7F37371347DDC981973A8724A67D1BB6D0DF37A7AAD705452FB8C678D6EF510`

The fixture stores no reference bytes, local path, Flow media ID, upload/session data, or other provider runtime identifier. `bottle-01` and `bottle-03` are intentionally excluded.

ProductTruth is VERIFIED, has no allowed claims, and prohibits unsupported efficacy, ingredient-performance, clinical, durability, and dispensing inferences.

## Baseline cases

Three independent one-scene benchmark cases are prepared. They are not a production sequence and create no BenchmarkObservation.

| Case | Action | Contract locks |
| --- | --- | --- |
| `f0-cocoon-pick-up-v1` | `PICK_UP` | 8 seconds, 9:16, one right-hand lift by bottle body |
| `f0-cocoon-hold-v1` | `HOLD` | 8 seconds, 9:16, stable one-hand upright hold |
| `f0-cocoon-rotate-slow-v1` | `ROTATE_SLOW` | 8 seconds, 9:16, controlled 30–45° bottle-body rotation |

Each case targets `GOOGLE_FLOW` / `OMNI_FLASH_1_1`, uses attempt 1, and references only `f0-cocoon-reference-01`. The neutral nonblank dialogue field is benchmark-only and is not an audio-generation requirement.

## Verification

- `npm run typecheck` — PASS
- `npm test` — PASS, 101 tests
- `npm run benchmark:dry` — PASS: Golden Fixture READY; PICK_UP, HOLD, and ROTATE_SLOW all UNTESTED and fail-closed
- `npm run build -w @mochi/web` — PASS
- `git diff --check` — PASS

## Runtime accounting and next action

- BenchmarkObservation count: 0
- Action promotions: 0; all ActionIds remain `UNTESTED`
- Historical Gemini live calls: 1; new Gemini calls: 0
- Flow calls: 0
- Video generation: 0
- F0-A.2 PICK_UP Manual Flow Canary: NEXT / NOT STARTED
- R2-A Product Truth: NOT STARTED

STOP. Do not run F0-A.2 or begin R2-A without explicit authorization.
