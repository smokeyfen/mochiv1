# Batch 23 — R5/R6 Acceptance Correction

Supersedes the premature R6 status in `6897cd8`. R4 now enforces deterministic scene IDs and carries exact R2 reference readiness. R5 preserves readiness; R6 uses readiness rather than limitation count and preserves BLOCKED precedence. Targeted replan accepts only a strict five-field decision and compiles replacement explicitly.

Implementation: `eb7ccd04b1afe5345c4667cefce3ef7fa741039f`. Verification PASS: typecheck, 134 tests, dry benchmark, web build, diff check. No live Gemini/Flow calls; capabilities unchanged. R7-A NOT STARTED.
