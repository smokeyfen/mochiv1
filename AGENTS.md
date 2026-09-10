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
- R7-A Human Realism: **PASS / LOCKED**
- T0-PREP Voice Timing Calibration Infrastructure: **PASS / LOCKED**
- T0-IDENTITY HARDENING: **PASS / LOCKED**
- Saydi VoiceProvider Boundary: **PASS / LOCKED**
- T0-LIVE Saydi browser automation, empirical timing, and human listening: **FALLBACK / NOT REQUIRED FOR R7-B**
- R4.1 8-Key-Point Plan: **NEXT / NOT STARTED**
- R7-B Dialogue Finalization: **BLOCKED on R4.1, not T0-LIVE**
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
→ `T0 Voice Timing Calibration` (fallback infrastructure)
→ `R4.1 8-Key-Point Plan`
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
→ `T1 Authoritative Flow Native Speech`
→ four approved complete scene MP4 files + UTF-8 `key-points.txt`

This is the frozen V1 architecture target. Do not begin a later stage without explicit authorization and its acceptance gate.

The pipeline above and every unversioned rule derived from it remain the authority for V1 lineages only. MOCHI V1.2 is a side-by-side, fully versioned lineage; it does not mutate, reinterpret, or partially replace the frozen V1 pipeline. A lineage must remain V1 end-to-end or V1.2 end-to-end. Mixed V1/V1.2 artifacts must fail closed and may never become `READY_FOR_FLOW`.

R2-A is a provider-neutral deterministic compiler. It may use a mocked intelligence decision to retain or exclude stable ProductEvidence fact IDs, but the model may never author ProductTruth facts. ProductTruth copies product name/category from ProductInput, preserves evidence risk, accepts no creative controls or media bytes, and remains validated fail-closed.

R2-B assesses only canonical ProductEvidence assets through enum-only values; readiness and limitations are deterministic. The R2 Commit Gate validates both R2 branches against the same ordered source invariants and commits only READY or LIMITED references. It is pure and makes no provider calls.

## Empirical track

F0 baseline transfer confidence is accepted for roadmap continuation from successful reviewed PICK_UP and HOLD canaries. No additional per-action runtime canary is required while implementing R2-A, R2-B, R2 Commit Gate, R3, R4, R5, R6, R7-A, T0, R7-B, R8, and P0.

`F0-A.4 ROTATE_SLOW` is deferred. The next runtime checkpoint is **PRE-F1 INTEGRATION GATE**, only after R8 and P0 are PASS / LOCKED. It performs one consolidated real-runtime validation of the completed reasoning/compiler pipeline before final Flow runtime path work.

Implementation milestones may use deterministic fixtures and mocks when empirical capability is unavailable. This does not promote an action or weaken production feasibility.

Do not mark an action `SAFE` or `RISKY` from intuition, a single output, or non-Flow evidence. The locked promotion policy remains 10 reviewed attempts, 0.90 SAFE pass rate, and 0.60 RISKY pass rate.

## Locked architecture rules

- Google Flow is the only video generator and the V1 primary authoritative native-speech path. Gemini 3.5 Flash-Lite is reasoning and QC only.
- Core contracts remain provider-neutral. Keep provider identifiers, credentials, endpoints, operation IDs, media IDs, file URIs, and session data outside Core.
- `apps/web` is the only user-facing surface.
- Product Truth is separate from `CreativeDirectionInput`; creative controls must not invent product facts.
- Arbitrary `PRODUCT_REFERENCE` intake is locked. Do not require manual front/side/back classification.
- V1 is POV Authentic On-Hand only. No KOC face.
- Exactly four scenes: HOOK, FEATURE, PROOF, CTA. Each scene is 8 seconds, 9:16, and preserves START STATE → ACTION → END STATE.
- Generated output is always a Candidate until fail-closed QC and approval succeed. Critical QC failure cannot approve.
- Production remains fail-closed. `UNTESTED` and `AVOID` actions fail feasibility preflight.
- GitHub remains source of truth. Never commit secrets, tokens, `.env`, private media, generated videos, or `node_modules`.

## Versioned MOCHI V1.2 authority

These rules apply only to fully versioned V1.2 lineages. They do not change the frozen V1 contracts, pipeline, simple-action fast-track, validators, or runtime behavior.

- The scene contract is `TWO_BEAT_ACTION_SEQUENCE_V1_2`: exactly four ordered scenes (`HOOK`, `FEATURE`, `PROOF`, `CTA`), each exactly 8 seconds, 9:16, `SMARTPHONE_POV`, with reviewer face `FORBIDDEN`.
- Each scene has exactly two ordered Semantic Pairs and exactly two sequential Primary Actions. Action A targets the first ~4 seconds, Action B targets the last ~4 seconds, and the handoff must occur between 3.5s and 4.5s. There is no third Primary Action, hidden reset, teleportation, or state-hiding cut.
- State authority is `START → Action A → MID → Action B → END`. Action B consumes the exact valid `MID` produced by Action A. Where continuity applies, Scene N `END` equals Scene N+1 `START`.
- Semantic synchronization is exact: Semantic Pair 1 ↔ Action Beat A ↔ Dialogue Sentence 1 ↔ Key Point 1; Semantic Pair 2 ↔ Action Beat B ↔ Dialogue Sentence 2 ↔ Key Point 2. Scene 1 Sentence 1 contains the exact Product Name, Scene 1 Key Point 1 equals the exact Product Name, and the other seven Key Points target 5–7 Vietnamese spoken words.
- Every individual Action Definition still has exactly one bounded semantic goal. Each action independently passes truth, affordance, state, hand, timing, camera, Human Realism, and risk eligibility; the ordered Action A + Action B pair additionally passes sequence compatibility. Failure of either action or the pair blocks the whole scene.
- Empirical capability and production authorization are separate authorities. Expanded V1.2 actions may remain `capability=UNTESTED`; this never promotes them to `SAFE`. `productionEligibility=V1_2_BOUNDED_TWO_BEAT_ACTION_AUTHORIZED` is permitted only when every bounded V1.2 action and pair gate passes. `AVOID` and unsupported affordances remain blocked.
- Camera/Focus, Human Realism, and SFX are per beat: Beat A has Camera/Focus A, Human Realism A, and SFX A; Beat B has Camera/Focus B, Human Realism B, and SFX B. Prefer one continuous ordinary smartphone-style take with a natural transition. BGM and VFX remain `NONE`; SFX `NONE` remains valid when no physical sound is justified.
- Scene Execution Contract V2 and the pre-Flow audit must preserve and validate both action beats, `START/MID/END`, timing and handoff evidence, per-beat Camera/Focus, per-beat Human Realism, per-beat SFX, semantic synchronization, and sequence compatibility losslessly through every V1.2 boundary.

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

## T0-SAYDI-PREP lock

`VOICE_TIMING_V2` requires an immutable provider-neutral `voiceIdentityId` for every calibration observation and profile. The two canonical V1 review identities are `VN_FEMALE_SOUTH_REVIEW_V1` and `VN_MALE_SOUTH_REVIEW_V1`, both `vi-VN` / `SOUTH` / `review`; canonical validation rejects both retired North identities and every metadata contradiction. The generic VoiceProvider contract remains provider-neutral. Saydi browser bindings may contain provider voice IDs, names, settings, and browser mechanics only in `packages/providers`; contracts and profiles must never contain those values. T0-LIVE remains fallback calibration work and cannot block R7-B.

## Frozen V1 voice architecture

`T1 Authoritative Flow Native Speech` is the V1 primary authoritative voice path. At the provider roadmap boundary only, `VN_FEMALE_SOUTH_REVIEW_V1` maps to Flow saved voice `Leda Custom` and has human four-scene consistency benchmark PASS. `VN_MALE_SOUTH_REVIEW_V1` maps to Flow base voice `Achird` with the selected default Customize Character; that configuration is locked but has no four-scene benchmark claim. Saydi remains provider-neutral fallback infrastructure. Do not put Flow voice names or IDs in Core contracts. Later delivery contains exactly four approved complete scene MP4 files and one UTF-8 `key-points.txt` containing exactly eight key points, two per scene. Scene 1 Key Point 1 is the exact canonical validated `ProductInput.productName`, never an LLM paraphrase. No normal V1 stitched final MP4 is required; a user-selected output folder is future delivery work.
