# Batch 20 — R2-B Reference Assessment and R2 Commit Gate

- Branch: `codex/feasibility-lock-candidate`
- Implementation commit: `e48e5ffe397721da42e376f6c2995189c0c1fbd3`
- Status: PASS / LOCKED

## R2-B Reference Assessment

ReferenceAssessment is provider-neutral and source-bound to ProductInput, validated ProductEvidence, and sourceEvidenceVersion. Each canonical logical reference asset appears exactly once with fixed enum dimensions only. It contains no product prose, provider identifier, local path, or persisted media bytes.

One separate mocked intelligence request receives exactly one image per canonical asset. Missing, duplicate, unknown, noncanonical, blank, and non-image media fail before the call. The structured output is constrained to exact source invariants and enum values. Contracts derive readiness and limitation codes deterministically: no usable identity support is BLOCKED; usable references with minimal geometry, severe occlusion, or high ambiguity are LIMITED; otherwise READY.

## R2 Commit Gate

The pure Commit Gate independently validates ProductTruth and ReferenceAssessment against the same ProductInput, ProductEvidence, and ordered source version. It rejects invalid branches, mismatched source invariants, and BLOCKED assessments. READY and LIMITED results return one complete R2CommittedProductContext; LIMITED retains all deterministic limitation codes. The gate imports no provider and makes zero intelligence calls.

## Verification

- Internal Gate A: R2-B unit/contract tests — PASS
- Internal Gate B: R2 Commit Gate unit/integration tests — PASS
- `npm run typecheck` — PASS
- `npm test` — PASS, 130 tests
- `npm run benchmark:dry` — PASS; PICK_UP, HOLD, and ROTATE_SLOW remain UNTESTED and fail feasibility preflight
- `npm run build -w @mochi/web` — PASS
- `git diff --check` — PASS

## Runtime accounting

- Historical Gemini live calls: 1; new calls: 0
- Historical Flow generations: 2; new generations: 0
- Historical Flow credits: 24
- Action promotions: 0

## Next action

- R2-A Product Truth: PASS / LOCKED
- R2-B Reference Assessment: PASS / LOCKED
- R2 Commit Gate: PASS / LOCKED
- R3 Continuity Synthesis: NEXT / NOT STARTED
- PRE-F1 INTEGRATION GATE: FUTURE

STOP. Do not begin R3 without explicit authorization.
