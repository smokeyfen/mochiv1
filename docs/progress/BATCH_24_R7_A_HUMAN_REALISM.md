# Batch 24 — R7-A Human Realism

Implementation: `680012c10f3f0f92a7744c496350b450c0f9e916`. R7-A compiles the provider-neutral, versioned `HumanRealism4ScenePlan` strictly after R4/R5/R6. It copies each scene's identifier, action, and canonical states from R5 and admits no product truth, claims, dialogue, provider identifiers, or media bytes.

The input gate revalidates source and plan invariants, derives canonical R5 state, compares the supplied R6 assessment to the deterministic result, and requires all scenes READY before one global mocked intelligence call. Actual action capability remains UNTESTED and therefore fails before provider invocation. The provider receives no media and can propose only five nonblank behavior fields for exactly four ordered scenes.

Verification PASS: `npm run typecheck`; `npm test` (144 tests); `npm run benchmark:dry` with expected UNTESTED failures; `npm run build -w @mochi/web`; `git diff --check`. No Gemini or Flow call, video generation, or action promotion occurred. R7-A is PASS / LOCKED. T0 Voice Timing Calibration is NEXT / NOT STARTED.
