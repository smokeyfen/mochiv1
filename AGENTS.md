# MochiV1 Agent Instructions

This GitHub repository is the source of truth for MochiV1, the repo-first implementation of FEN V1.

## Current verified state

- R1 Application Path: **FINAL LOCKED**
- R1-LIVE: **PASS**
- R1 Product Evidence: **RUNTIME VALIDATED / FINAL LOCKED**
- RUBRIC-0: **PASS / LOCKED**
- Historical Gemini live calls: 1; Flow generations: 2 (24 credits); action promotions: 0
- Every physical `ActionId` remains `UNTESTED`
- F0 BASELINE TRANSFER: **ACCEPTED / FAST-TRACK**; F0-A.4 ROTATE_SLOW is **DEFERRED**
- R2-A Product Truth: **PASS / LOCKED**
- R2-B Reference Assessment: **PASS / LOCKED**
- R2 Commit Gate: **PASS / LOCKED**
- R3 Continuity Synthesis: **PASS / LOCKED**
- R4 Global 4-Scene Planner: **PASS / LOCKED**
- R5 Deterministic State Engine: **PASS / LOCKED**
- R6 Scene Risk + bounded replan: **PASS / LOCKED**
- R7-A Human Realism: **NEXT / NOT STARTED**
- PRE-F1 INTEGRATION GATE: future consolidated runtime check after R8 and P0

`STATUS.md` is the current milestone record. Earlier M0/M1 feasibility material is historical unless this file or STATUS explicitly identifies it as an active lock.

## Mandatory reading order

Before changing code, read:

1. `STATUS.md`
2. `docs/CODEX_HANDOFF.md`
3. `docs/quality/RUBRIC_0.md` when changing benchmark review behavior
4. Relevant contracts, tests, and source files for the requested task

Read `docs/M0-ACCEPTANCE.md` and other M0 handoff artifacts only as historical context unless a task explicitly targets a preserved M0 lock.

## Frozen V1 target pipeline

`R1 Product Evidence`
→ `R2-A Product Truth`
→ `R2-B Reference Assessment`
→ `R2 Commit Gate`
→ `R3 Continuity Synthesis`
→ `R4 Global 4-Scene Planner`
→ `R5 Deterministic State Engine`
→ `R6 Scene Risk`
→ bounded R4 replan when blocked
→ `R7-A Human Realism`
→ `T0 Voice Timing Calibration`
→ `R7-B Dialogue Finalization`
→ `R8 Deterministic Production Compiler`
→ `P0 Snapshot Persistence`
→ `SceneAnchorContract`
→ `Flow / Omni Flash 1.1`
→ `Frame QC`
→ `Temporal QC`
→ `Pairwise Continuity QC`
→ `Selective Repair / Approval`
→ `Global Cumulative QC`
→ `T1 Local TTS`
→ one-pass `FFmpeg`
→ Final MP4

This is the frozen V1 architecture target. Do not begin a later stage without explicit authorization and its acceptance gate.

R2-A is a provider-neutral deterministic compiler. It may use a mocked intelligence decision to retain or exclude stable ProductEvidence fact IDs, but the model may never author ProductTruth facts. ProductTruth copies product name/category from ProductInput, preserves evidence risk, accepts no creative controls or media bytes, and remains validated fail-closed.

R2-B assesses only canonical ProductEvidence assets through enum-only values; readiness and limitations are deterministic. The R2 Commit Gate validates both R2 branches against the same ordered source invariants and commits only READY or LIMITED references. It is pure and makes no provider calls.

## Empirical track

F0 baseline transfer confidence is accepted for roadmap continuation from successful reviewed PICK_UP and HOLD canaries. No additional per-action runtime canary is required while implementing R2-A, R2-B, R2 Commit Gate, R3, R4, R5, R6, R7-A, T0, R7-B, R8, and P0.

`F0-A.4 ROTATE_SLOW` is deferred. The next runtime checkpoint is **PRE-F1 INTEGRATION GATE**, only after R8 and P0 are PASS / LOCKED. It performs one consolidated real-runtime validation of the completed reasoning/compiler pipeline before final Flow runtime path work.

Implementation milestones may use deterministic fixtures and mocks when empirical capability is unavailable. This does not promote an action or weaken production feasibility.

Do not mark an action `SAFE` or `RISKY` from intuition, a single output, or non-Flow evidence. The locked promotion policy remains 10 reviewed attempts, 0.90 SAFE pass rate, and 0.60 RISKY pass rate.

## Locked architecture rules

- Google Flow is the only video generator. Gemini 3.5 Flash is reasoning and QC only.
- Core contracts remain provider-neutral. Keep provider identifiers, credentials, endpoints, operation IDs, media IDs, file URIs, and session data outside Core.
- `apps/web` is the only user-facing surface.
- Product Truth is separate from `CreativeDirectionInput`; creative controls must not invent product facts.
- Arbitrary `PRODUCT_REFERENCE` intake is locked. Do not require manual front/side/back classification.
- V1 is POV Authentic On-Hand only. No KOC face.
- Exactly four scenes: HOOK, FEATURE, PROOF, CTA. Each scene is 8 seconds, 9:16, and preserves START STATE → ACTION → END STATE.
- Generated output is always a Candidate until fail-closed QC and approval succeed. Critical QC failure cannot approve.
- Production remains fail-closed. `UNTESTED` and `AVOID` actions fail feasibility preflight.
- GitHub remains source of truth. Never commit secrets, tokens, `.env`, private media, generated videos, or `node_modules`.

## Development discipline

- Work one authorized milestone and one objective at a time.
- Make the smallest complete scoped change; do not refactor unrelated working code.
- Keep TypeScript strict and preserve validation and fail-closed behavior.
- Add or update meaningful tests for non-trivial contract/domain changes.
- Run the required verification before declaring PASS and report exact command results.
- If credentials, real references, or a required external runtime are unavailable, fail closed and stop at that gate. Never fabricate empirical evidence.
- Do not run Gemini, Flow, F0, or R2 work unless the task explicitly authorizes it.

## UI policy

Keep the UI minimal, static, readable, and focused on the current product workflow. Do not add animation, canvas, node graphs, fancy timelines, or a UI redesign unless expressly authorized.
