# Batch 17 — F0-A.2 PICK_UP Manual Flow Canary

- Branch: `codex/feasibility-lock-candidate`
- Implementation commit: `58b87a2c741bc6d44a384405f742ebd038dc0bbb`
- Status: PASS / LOCKED

## Recorded empirical observation

- Fixture: `f0-cocoon-turmeric-serum-bottle-v1`
- Case: `f0-cocoon-pick-up-v1`
- Observation: `f0-cocoon-pick-up-v1-attempt-01-review`
- Action/archetype: `PICK_UP` / `BOTTLE`
- Candidate logical asset: `f0-cocoon-pick-up-v1-attempt-01-video`
- Evidence origin: `REAL_MODEL_VIDEO`
- Reviewer: `f0-human-reviewer`
- Rubric: `RUBRIC_0`
- Deterministic verdict: PASS

The human reviewer inspected the real generated eight-second video and an approximately 2 fps, 16-frame contact sheet. All seven Rubric-0 dimensions passed. The recorded review notes retain the actual product-fidelity, hand-anatomy, action-completion, physics, camera, cuts, and artifact findings without storing the video, contact sheet, local path, Flow media ID, session/auth data, or other provider runtime identifier.

## Capability result

The sole PICK_UP observation is valid and empirical, but it does not promote the action:

- PICK_UP reviewed observations: 1
- PICK_UP capability: `UNTESTED`
- Reason: `insufficient_real_observations:1<10`
- HOLD reviewed observations: 0; capability `UNTESTED`
- ROTATE_SLOW reviewed observations: 0; capability `UNTESTED`
- Action promotions: 0

## Runtime accounting

- Historical Flow generation count: 1
- Flow credit spend: 12 credits
- New Flow calls in this Codex task: 0
- Historical Gemini live calls: 1; new Gemini calls: 0
- Video generation in this Codex task: 0

## Verification

- `npm run typecheck` — PASS
- `npm test` — PASS, 103 tests
- `npm run benchmark:dry` — PASS with F0 fixture READY and all three actions fail-closed
- `npm run build -w @mochi/web` — PASS
- `git diff --check` — PASS

## Next action

- F0-A.2 PICK_UP Manual Flow Canary: PASS / LOCKED
- F0-A.3 HOLD Manual Flow Canary: NEXT / NOT STARTED
- R2-A Product Truth: NOT STARTED

STOP. Do not run F0-A.3 or begin R2-A without explicit authorization.
