# Batch 18 — F0 Baseline Transfer and PRE-F1 Policy

- Branch: `codex/feasibility-lock-candidate`
- Implementation commit: `ef6e3dd02c3eb3800df508b98f97ff755b326cec`
- Status: ACCEPTED / FAST-TRACK

## Recorded HOLD observation

The harness now records the completed real HOLD review as `f0-cocoon-hold-v1-attempt-01-review`. It is a `REAL_MODEL_VIDEO` observation for `f0-cocoon-hold-v1`, uses `RUBRIC_0`, contains all seven passing dimensions, and derives a deterministic PASS. The reviewer reviewed the eight-second video and 16-frame contact sheet; the stored metadata contains no video/contact-sheet bytes, local paths, Flow media ID, or runtime session data.

## Capability accounting

- PICK_UP observations: 1; capability `UNTESTED`
- HOLD observations: 1; capability `UNTESTED`
- ROTATE_SLOW observations: 0; capability `UNTESTED`
- Action promotions: 0
- Locked policy unchanged: 10 reviewed attempts, 0.90 SAFE, 0.60 RISKY

## Fast-track execution policy

F0 baseline transfer confidence is accepted for roadmap continuation from the successful real PICK_UP and HOLD canaries. F0-A.4 ROTATE_SLOW is DEFERRED.

No additional per-action runtime validation is required while implementing R2-A, R2-B, R2 Commit Gate, R3, R4, R5, R6, R7-A, T0, R7-B, R8, and P0. Those implementation milestones remain subject to strict contracts, deterministic validation, unit/integration tests, provider-neutral boundaries, and fail-closed behavior. `UNTESTED` remains `UNTESTED` for benchmark and production feasibility.

**PRE-F1 INTEGRATION GATE** is the future consolidated runtime check after R8 and P0 are PASS / LOCKED. It validates the completed reasoning/compiler pipeline before final Flow runtime path work.

## Runtime accounting

- Historical Flow generations: 2
- Historical Flow credits: 24
- New Flow calls in this Codex task: 0
- Historical Gemini live calls: 1; new Gemini calls: 0
- Action promotions: 0

## Verification

- `npm run typecheck` — PASS
- `npm test` — PASS, 103 tests
- `npm run benchmark:dry` — PASS with two observations and all three actions fail-closed
- `npm run build -w @mochi/web` — PASS
- `git diff --check` — PASS

## Next action

- F0 BASELINE TRANSFER: ACCEPTED / FAST-TRACK
- F0-A.4 ROTATE_SLOW: DEFERRED
- PRE-F1 INTEGRATION GATE: FUTURE RUNTIME CHECK
- R2-A Product Truth: NEXT / NOT STARTED

STOP. Do not run a further runtime canary or begin R2-A without explicit authorization.
