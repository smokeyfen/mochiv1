# Batch 19 — R2-A Product Truth

- Branch: `codex/feasibility-lock-candidate`
- Implementation commit: `332cbe25eba6373d840fef76a856e6645dad105b`
- Status: PASS / LOCKED

## Delivered boundary

`packages/reasoning` contains the first provider-neutral reasoning module. It accepts ProductInput, validated ProductEvidence, a nonblank sourceEvidenceVersion, and an IntelligenceProvider. It sends no media, no creative direction, no credentials, and no provider runtime details.

The model receives an authoritative instruction separately from untrusted factual input. Its structured decision can only retain or exclude IDs from the deterministic ProductEvidence candidate catalog. It must retain identity and completely partition every catalog fact. Unknown, duplicate, overlapping, or omitted IDs fail closed.

The deterministic compiler creates ProductTruth by copying exact source text/provenance, ProductInput name/category, allowed ProductEvidence claims only, prohibited inferences, uncertainties, and contradictions. It never uses model-authored fact text.

## Verification

- `npm run typecheck` — PASS
- `npm test` — PASS, 114 tests
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
- R2-B Reference Assessment: NEXT / NOT STARTED
- R2 Commit Gate: NOT STARTED
- R3: NOT STARTED
- PRE-F1 INTEGRATION GATE: FUTURE

STOP. Do not begin R2-B without explicit authorization.
