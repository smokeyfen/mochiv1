# Batch 23 — R5/R6 Acceptance Correction

Implementation commit: `e187ffa57fc2c0018ea86f4517ced09ce769261a`. This checkpoint supersedes the premature R5/R6 claim at `efea9fc2a71c1db1223175633550f05e6dcc3e5b`.

R6 preserves `BLOCKED` precedence: an `AVOID` action stays BLOCKED under LIMITED references and complexity 3. R4 validates action/effect consistency and compares continuity fields explicitly, so a serialized equivalent passes while every locked-field mutation fails. Targeted replan rejects zero eligible SAFE actions before provider invocation, has a strict five-field decision boundary, keeps the other scenes unchanged, runs validatePlan → R5 → R6, and exhausts exactly two failed default attempts with `SCENE_PLANNING_BLOCKED`.

Verification PASS: `npm run typecheck`; `npm test` (140 tests); `npm run benchmark:dry` with expected `action_untested:PICK_UP`; `npm run build -w @mochi/web`; `git diff --check`. No Gemini calls, Flow calls, video generation, or action promotions occurred. R3, R4, R5, R6 + bounded replan are PASS / LOCKED. R7-A is NEXT / NOT STARTED.
