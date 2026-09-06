# Batch 22 — R5/R6 State, Risk, and Replan

- Implementation: `3581a87708e2107e35392a2b0ab33cb58bfef9d9`
- R5/R6: PASS / LOCKED

R5 resolves canonical closed physical state deterministically from R4 intents. R6 evaluates only ActionCapability, deterministic complexity, and reference quality. Targeted replan is bounded to two mocked-provider attempts and preserves all source, continuity, truth, and unaffected-scene invariants.

Verification: typecheck, tests, dry benchmark, web build, and diff check PASS. No live Gemini/Flow calls; all physical actions remain UNTESTED. R7-A is NOT STARTED.
