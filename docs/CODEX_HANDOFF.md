# MochiV1 — Codex Handoff

**Date:** 2026-09-07
**Repository:** `smokeyfen/mochiv1`
**Source of truth:** GitHub repository and its `STATUS.md`
**Current branch for autonomous milestone work:** `codex/feasibility-lock-candidate`

## Current verified state

MochiV1 has completed and locked the R1 Product Evidence application path.

- R1 Application Path: **FINAL LOCKED**
- R1-LIVE: **PASS**
- R1 Product Evidence: **RUNTIME VALIDATED / FINAL LOCKED**
- RUBRIC-0 benchmark scoring contract: **PASS / LOCKED**
- SYNC-0 Mandatory Codex Handoff: **PASS**
- Historical Gemini live calls: 1
- Historical Flow generations: 5 (the two prior generations cost 24 credits; Batch 1 added 3 and its exact added credit count is unspecified)
- Action promotions: 0
- All physical `ActionId` values: `UNTESTED`
- F0 BASELINE TRANSFER: **ACCEPTED / FAST-TRACK**
- F0-A.4 ROTATE_SLOW: **DEFERRED**
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
- R4.1 Four-Scene / Eight-Key-Point Plan: **FINAL LOCKED / DIRECTLY AUDITED** at implementation `026f3a217f3283d09007019714358054ea0983bd`
- R7-B Dialogue Finalization: **FINAL LOCKED / DIRECTLY AUDITED** at implementation `696ffea000c4f804472ffaebdd180ec236e68546`
- R8: **FINAL LOCKED / DIRECTLY AUDITED** at corrective implementation `d13b6b307377189af40d2e14dd699ddc8341e748`
- P0 Production Snapshot Persistence: **FINAL LOCKED / DIRECTLY AUDITED** at implementation `21de4528e318cf8d48ea8b0752fe0217a2ea1a0b`
- PRE-F1-A Integration Harness: **FINAL LOCKED / DIRECTLY AUDITED** at implementation `b1bf248c1eabacaf4a6c88abd67de138f6a98169`
- F0-B Trusted Capability Evidence Foundation: **FINAL LOCKED / DIRECTLY AUDITED** at `da3b289c76795e2a33360525c11e1ca4451fcffa`
- F0-C Controlled Flow Benchmark Execution Planner: **FINAL LOCKED / DIRECTLY AUDITED** at implementation `812af23a5737c58b60d76ef533e0574e927d6ed3` (F0-C1 remains `533960348da9ba03e29ed259bcdc689522116116`)
- F0-D1 Controlled Flow Benchmark Batch 1: **EMPIRICAL PASS / human Rubric-0 reviewed**
- V1 Simple-Action Fast-Track: **IMPLEMENTATION PASS** at `8e11464`
- Task 2 Visual Rhythm + SceneAnchor + Compact Flow Prompt Compiler: **FINAL LOCKED / DIRECTLY AUDITED** at `098c15f7200a50eb2a82062113045da99df71368`; no provider calls or generation
- Task 3 Flow production boundary + native voice binding: **FINAL LOCKED / DIRECTLY AUDITED** at `5422a2d765c1d02fc72d031fbf8f352cd4470f27`; no Flow runtime or generation
- Task 4 Unified Scene QC V1: **FINAL LOCKED / DIRECTLY AUDITED** at `f3e75446cda6a9a2d7317bb1c1117c4a85dfe756`; deterministic mocked validation only, no live QC
- Task 5 Four-scene Production + Pairwise/Global Continuity QC: **IMPLEMENTATION PASS** at `721766f9438bf909fe97e98f9f41aa32d794997a`; no live generation or QC
- PRE-F1-LIVE: **BLOCKED_BY_ENVIRONMENT** — missing `PRE_F1_LIVE=1`, `GEMINI_API_KEY`, `PRE_F1_LIVE_MANIFEST`, and `PRE_F1_SNAPSHOT_STORAGE_ROOT`; 0 Gemini/Flow/Saydi calls
- F1: **NOT STARTED**

The completed live path is:

`apps/web` → relative `POST /api/product-evidence` → `apps/server` → Gemini 3.5 Flash → validated `ProductEvidence` → Product Analysis UI.

This path is locked. It keeps browser runtime files separate from logical AssetRefs, sends only factual ProductInput to Product Evidence, validates output deterministically, and keeps credentials server-side.

R2-A Product Truth is also locked. It receives only ProductInput, validated ProductEvidence, a nonblank caller-supplied sourceEvidenceVersion, and a provider-neutral intelligence boundary. The provider can select only stable catalog fact IDs through a complete retain/exclude partition; the deterministic compiler copies source text and provenance, preserves unresolved evidence risk, and never accepts creative direction, media bytes, provider metadata, or model-authored facts.

R2-B Reference Assessment is locked. It analyzes exactly one runtime image per canonical evidence asset with enum-only output; deterministic contracts derive readiness and limitation codes. The pure R2 Commit Gate independently validates both R2 branches against matching productId, sourceEvidenceVersion, and ordered canonicalAssetIds. BLOCKED references cannot commit; READY and LIMITED contexts retain all reference limitations for later risk evaluation.

## Current repository responsibilities

- `apps/web`: the only user-facing surface; Product Input and locked Product Evidence experience.
- `apps/server`: server-only Product Evidence boundary and native development HTTP adapter.
- `packages/contracts`: provider-neutral contracts, validation, benchmark observations, and Rubric-0 scoring contract.
- `packages/core`: feasibility, continuity carryover, lifecycle, and ActionCapability policy.
- `packages/evidence`: provider-neutral factual product evidence boundary.
- `packages/reasoning`: provider-neutral reasoning modules; R2-A deterministically compiles ProductTruth from ProductEvidence.
- `packages/providers`: Gemini 3.5 Flash intelligence adapter only. It is not a video provider.
- `apps/harness`: dry feasibility runner; its expected output remains fail-closed `action_untested:PICK_UP`.
- `apps/harness/src/f0-capability-campaign.ts`: approved deterministic 30-case Cocoon bottle capability campaign and trusted status entry point.
- `docs/quality/RUBRIC_0.md`: human-review instructions for one real generated benchmark scene.

## Frozen V1 architecture

The frozen V1 target pipeline is:

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

This is a sequencing and boundary lock. It is not authorization to begin the next stage. Each stage requires an explicit task and acceptance gate.

## Empirical and PRE-F1 runtime policy

The user has explicitly chosen `SIMPLE_ACTION_FAST_TRACK_V1` for V1 production feasibility. It authorizes exactly `PICK_UP`, `HOLD`, and `ROTATE_SLOW` only after the bounded simple-action contract and existing R5/R6 validation pass. It is provider-neutral and separate from ActionCapabilityMap, BenchmarkObservation, empirical classification, and promotion policy. R6 reports `FAST_TRACK_AUTHORIZED` independently from the retained empirical `UNTESTED` classification; no fake SAFE map, environment override, or R6 bypass exists. Unsupported secondary actions, cap removal, dispensing, product-state transformations outside the canonical action, unrelated UNTESTED actions, and AVOID remain fail-closed.

F0 is **PAUSED AFTER BATCH 1 FOR V1 FAST-TRACK**, not statistically complete. Its truthful state remains PICK_UP 2/10 UNTESTED, HOLD 2/10 UNTESTED, ROTATE_SLOW 1/10 UNTESTED, `campaignReady=false`, promotions=0. No further F0 batch is required on the V1 critical path unless production evidence later shows a reliability problem. The live PRE-F1 runner no longer blocks on these three classifications; its environment-gated attempt made 0 Gemini/Flow/Saydi calls and reported exactly missing `PRE_F1_LIVE=1`, `GEMINI_API_KEY`, `PRE_F1_LIVE_MANIFEST`, and `PRE_F1_SNAPSHOT_STORAGE_ROOT`.

Task 2 is implemented. `VISUAL_RHYTHM_V1` deterministically assigns role-aware presentation only: exactly one canonical primary physical action (HOLD remains valid despite no canonical state change), at most one state-changing physical action, 0–2 state-neutral beats, and 0–1 subtle camera behavior. It forbids an added product-state transition, second/new grip or hand/product contact event, prop interaction, cap opening, dispensing, and uncontracted cut/reset. `SCENE_ANCHOR_V1` is a strict, provider-neutral exact binding to `PRODUCTION_SNAPSHOT_V1`, preserving P0 scene/action/states/dialogue/references/logical voice while separating immutable hard identity/state continuity from intentionally variable soft framing. Effects are fixed to `sfx=NONE`, `vfx=NONE`. The pure provider-edge `FLOW_SCENE_PROMPT_V1` compiler uses Unicode code-point counts, returns <=2800 as target, accepts 2801..3200 only after deterministic semantic compaction with explicit headroom, and throws `PROMPT_BUDGET_EXCEEDED` above 3200. It makes no HTTP, browser, Gemini, Flow, Saydi, credential, or generation call; it does not implement the Flow adapter or voice binding.

Task 3 is FINAL LOCKED / DIRECTLY AUDITED at `5422a2d765c1d02fc72d031fbf8f352cd4470f27`: Flow production requests, reference resolution, native voice bindings, and an injected-only driver remain provider-edge only; no supported live Flow runtime exists. Task 4 is IMPLEMENTATION PASS at `f3e75446cda6a9a2d7317bb1c1117c4a85dfe756`: one-call `SCENE_QC_V1` combines Frame, Temporal, Speech, and non-critical Presentation Dynamics observation using candidate video plus exact authoritative reference images. Candidate and source binding, media identity/order/type, voice correlation, and lexical Vietnamese dialogue comparison are deterministic fail-closed gates. `GENERATED_SCENE_CANDIDATE_V1` is provider-neutral and excludes Flow metadata; QC reports never persist Base64 or approve candidates. Gemini 3.5 Flash accepts valid text-only structured reasoning (`inputText` plus `media=[]`) while retaining no-input and invalid-media rejection. Remaining roadmap: (1) Four-scene orchestrator + Pairwise + Global Continuity QC; (2) Selective Repair + Final Acceptance; (3) Delivery + Production UI + V1 E2E. The real PRE-F1-LIVE gate remains `BLOCKED_BY_ENVIRONMENT`; a supported Flow runtime and live canary remain required before final V1 acceptance.

Baseline transfer confidence is accepted for roadmap continuation because the completed real PICK_UP and HOLD canaries each have a valid, single reviewed RUBRIC-0 PASS observation. Those observations do not promote either action: the locked 10-attempt, 0.90 SAFE, and 0.60 RISKY policy remains in force.

F0-A.4 ROTATE_SLOW is DEFERRED. No additional per-action runtime validation is required while implementing R2-A, R2-B, R2 Commit Gate, R3, R4, R5, R6, R7-A, T0, R7-B, R8, and P0. These milestones must retain strict contracts, deterministic validation, unit/integration tests, provider-neutral boundaries, and fail-closed behavior.

The next consolidated runtime checkpoint is **PRE-F1 INTEGRATION GATE**, only after R8 and P0 are PASS / LOCKED. At PRE-F1, perform one consolidated real-runtime validation of the completed reasoning/compiler pipeline before implementing or enabling the final Flow runtime path.

## F0-B Trusted Capability Evidence Foundation

`F0_BOTTLE_BASELINE_CAPABILITY_V1` is the isolated, provider-neutral campaign authority for the canonical Cocoon bottle fixture. It contains only PICK_UP, HOLD, and ROTATE_SLOW, with 10 planned cases per action (30 total), and preserves the exact historical attempt-one case objects. The core trusted derivation accepts only explicitly supplied human-reviewed `BenchmarkObservation` records that pass `validateBenchmarkObservation`, have REAL_MODEL_VIDEO origin, match the fixture/archetype/action/case scope, and have globally unique observation, candidate-asset, and case IDs. It delegates all classification math to `classifyCapabilityEvidence` and `DEFAULT_CAPABILITY_PROMOTION_POLICY`; rejected evidence is reported rather than silently counted.

Controlled Batch 1 adds user-authorized human Rubric-0 PASS evidence for PICK_UP attempt 2, HOLD attempt 2, and ROTATE_SLOW attempt 1. Current trusted evidence is PICK_UP 2/10 UNTESTED, HOLD 2/10 UNTESTED, and ROTATE_SLOW 1/10 UNTESTED. All actions remain UNTESTED, current promotions are 0, `campaignReady=false`, and 25 reviewed attempts remain to reach the three minimum sample counts (8 / 8 / 9). This count does not guarantee SAFE. Rubric-0 remains the only human review rubric; no automatic review, observation creation, promotion, provider call, or PRE-F1 map connection exists. `npm run benchmark:capability:dry` is deterministic and repository-only.

## F0-C Controlled Flow Benchmark Execution Planner

F0-C is FINAL LOCKED / DIRECTLY AUDITED at `812af23a5737c58b60d76ef533e0574e927d6ed3`. F0-C1 remains at `533960348da9ba03e29ed259bcdc689522116116` and provides the sole F0 case-state and receipt guard. F0-D1 records three provider-neutral `GENERATED_AWAITING_REVIEW` logical receipts for PICK_UP attempt 2, HOLD attempt 2, and ROTATE_SLOW attempt 1. Their accepted observations resolve each case as REVIEWED because REVIEWED takes precedence. The next-batch planner is pure, selects only PENDING cases, caps a batch at three, selects at most one case per baseline action, and now returns PICK_UP attempt 3, HOLD attempt 3, and ROTATE_SLOW attempt 2.

F0-C finalization adds a strict `F0_BENCHMARK_EXECUTION_PACKET_V1` instruction artifact for each selected case. Packets are compiled only from the approved F0 campaign case, canonical ScenePlan, and canonical Cocoon reference; they retain no video bytes, Base64, provider media/session/browser data, URLs, credentials, voice fields, review verdict, observation, or capability result. Its benchmark prompt is byte-identical across attempts for the same action and contains physical-video instructions only, including an explicit no-speech dependency. `npm run benchmark:execution:dry` plans and validates the current three packets, prints concise deterministic status, and reports zero Flow/Gemini/Saydi calls and zero performed generations. It creates neither receipts nor BenchmarkObservations.

F0-D1 is EMPIRICAL PASS / human Rubric-0 reviewed. It has five total trusted empirical observations; Batch 1 adds three real Flow generations, no Gemini calls, no Saydi calls, and no ActionCapability promotions. Execution receipts and observations contain only logical evidence identifiers, never video bytes, Flow URLs/project or operation IDs, session/browser data, cookies, or credentials. Future operator sequence is documentation only: plan batch → inspect packets/prompts → explicit user authorization → generate at most three Flow candidates → record execution receipts → STOP → human Rubric-0 review each candidate → record BenchmarkObservations → derive trusted capability status → decide next batch. Generation never creates PASS evidence automatically and no subsequent batch is automatic. F0 is paused after Batch 1, Batch 2 is not on the V1 critical path, and historical PRE-F1 empirical-capability wording is superseded by current `BLOCKED_BY_ENVIRONMENT`; F1 remains NOT STARTED.

F0-D1 verification: `npm run typecheck` PASS; `npm test` PASS (246 tests); `npm run benchmark:capability:dry` PASS with 2 / 2 / 1 accepted observations, all UNTESTED, `campaignReady=false`, promotions=0, and 25 remaining minimum attempts; `npm run benchmark:execution:dry` PASS with the planning-only 3 / 3 / 2 next batch; `npm run build -w @mochi/web` PASS; `git diff --check` PASS. New Codex-task Gemini, Flow, and Saydi calls and video generations: 0.

RUBRIC-0 still evaluates one generated benchmark scene against actual generated video, real product references, and the benchmark contract. It does not add artificial cross-scene continuity to F0. Pairwise and global continuity QC belong to the later production pipeline.

## Non-negotiable architecture locks

### Providers and credentials

- **Google Flow is the only video generator and the V1 primary authoritative native-speech path.** Flow / Omni Flash 1.1 usage stays behind a provider/infrastructure boundary.
- **Gemini 3.5 Flash is reasoning and QC only.** It must not implement `VideoProvider` or generate video.
- Core never receives Flow media IDs, Flow project IDs, Gemini file URIs, bearer/session values, provider operation IDs, endpoints, request IDs, upload bytes, or local paths.
- Credentials are environment-only and server-only. Do not expose, log, or commit secrets.

### Product truth and user input

- Product Truth remains separate from `CreativeDirectionInput`.
- Product Evidence accepts factual ProductInput only; creative controls cannot become product facts.
- Arbitrary `PRODUCT_REFERENCE` image intake is locked. Do not require manual reference-role selection or front/side/back coverage.
- Do not invent product identity, geometry, label text, claims, or provenance.

### V1 production behavior

- V1 is POV Authentic On-Hand only; no KOC face.
- The global plan contains HOOK, FEATURE, PROOF, and CTA. Scene duration is exactly 8 seconds and aspect ratio exactly 9:16.
- Every scene preserves START STATE → ACTION → END STATE.
- Every generated video is a Candidate, never automatically Final.
- QC is fail-closed; a critical QC failure cannot become APPROVED.
- All physical ActionIds remain `UNTESTED` until repo-local Flow benchmark evidence satisfies the locked promotion policy: 10 reviewed attempts, 0.90 SAFE pass rate, 0.60 RISKY pass rate. `UNTESTED` and `AVOID` fail feasibility preflight.
- Flow native speech is the V1 primary authoritative voice path. Saydi remains fallback infrastructure only. Normal V1 delivery is exactly four approved complete scene MP4 files plus one UTF-8 `key-points.txt` containing exactly eight key points, two per scene; no stitched final MP4 is required.

## Working protocol

1. Read `STATUS.md`, this handoff, and the relevant contract/tests before changing a milestone.
2. Work only in the explicitly authorized layer and stop at the stated boundary.
3. Preserve provider neutrality, strict TypeScript, validation, tests, and fail-closed behavior.
4. Run the requested verification and report exact PASS/FAIL evidence.
5. Update STATUS and the appropriate progress checkpoint after a successful milestone.
6. Commit and push scoped checkpoints only to `codex/feasibility-lock-candidate`; do not merge, rebase, or rewrite `main` without explicit human authorization.

## Task 6 browser production workspace

Task 6 Browser Production Workspace is FINAL LOCKED / DIRECTLY AUDITED after corrective `c94194a222ca9166c9e2f4bbf4722f5a071d79a6`. It remains the manual-Flow browser workspace and never calls a Flow driver.

Task 7A Production Controls is DIRECTLY AUDITED upstream at `793dcaeb6340e9e706fd07624ab3957e56fe530e`. Creative Direction remains only fixed Audience and Shooting Context selects with two mutually exclusive NỮ/NAM voice cards; browser-bound hidden defaults retain the canonical reviewer/persona, AUTO role tone, `review`, and `SOUTH` contract fields. Task 7B corrects its stale-sequence gap without reopening those locks: a successful video upload is immutable per candidate identity, every accepted candidate mutation invalidates sequence/final acceptance/delivery, and repair is the only replacement path with a new candidate ID and incremented attempt.

Task 7B Delivery Center + final browser E2E readiness is IMPLEMENTATION PASS / LOCKED locally at `d615266`. Internal Sequence QC now binds snapshot ID and the exact ordered Scene 1–4 candidate IDs; Final Acceptance verifies the binding and blocks `STALE_SEQUENCE`. `DELIVERY_PACKAGE_V1` requires stored current `FINAL_ACCEPTANCE_PASS`, exact snapshot/candidate/final-acceptance evidence, and no AI call. The safe API emits a manifest and the exact approved bytes only as `scene-01.mp4`, `scene-02.mp4`, `scene-03.mp4`, `scene-04.mp4`, and `key-points.txt`; it exposes no Base64, provider/runtime metadata, credentials, or local paths. `key-points.txt` is UTF-8, exactly eight non-empty scene-ordered lines, and line 1 is the exact canonical Product Name. The Delivery Center appears only at ready state, supplies the five named downloads plus `Save 5 files to folder` using the browser directory picker when available and safe individual-download fallback otherwise. Its `DELIVERED` status is only a browser/runtime receipt and does not weaken Final Acceptance. Direct server coverage includes all Final Acceptance blocker cases and WARN-only acceptance, candidate/repair invalidation, delivery negatives, byte-exact output, and mocked full plus repair E2E. Clean mocked E2E accounting: 4 Scene QC calls, 1 Sequence QC call, 0 Flow generations; deterministic acceptance/delivery calls are 0. `npm test` passes 280 tests, and the requested typecheck, dry benchmarks, web build, and diff check pass. No Gemini live, Flow, Saydi, or generation call occurred. The next milestone is MAJOR MANUAL V1 E2E; this is not V1 FINAL PASS.

Task 7B pre-E2E boundary correction is IMPLEMENTATION PASS / LOCKED locally at `48ba7256d4fe8a52555ec3fb3c7feb4788bffcef`. HTTP delivery makes an exact copy of the returned `Uint8Array` view before response construction; HTTP-level tests prove no backing-buffer slack escapes for MP4 and UTF-8 key-point responses. `VIDEO_TECHNICAL_VALIDATION_V1` is a deterministic server-side boundary with an injectable metadata inspector. Production uses local `ffprobe` on a temporary file and fails closed when it is missing, malformed, unverifiable, not MP4, not effective 9:16 after rotation, or outside 8000 ms ±100 ms. This environment has no `ffprobe` or `ffmpeg`; no parser, network service, or AI substitute exists. Validated technical metadata is stored only after Scene QC succeeds, Final Acceptance blocks `VIDEO_TECHNICAL_INVALID`, and Sequence QC requires technical PASS. Scene QC is transactional: a thrown QC leaves no stored video/report and allows retrying the identical candidate; a normal QC FAIL is stored and remains eligible for selective repair. Browser tests cover ready-only Delivery Center, five exact filenames, exact individual filename request, all five directory-picker writes, and fallback downloads. The complete suite passes 291 tests; requested typecheck, dry benchmarks, web build, and diff check pass. No Gemini live, Flow, Saydi, or generation call occurred. Next if pass remains MAJOR MANUAL V1 E2E.

## Historical material

Earlier M0 feasibility-first roadmap text, initial exported-tree descriptions, and pre-R1 task sequencing are superseded as current instructions. They remain accessible in Git history and older documentation only as historical context. Preserve the underlying M0 locks—provider-neutral contracts, 8-second and 9:16 scenes, state continuity, Candidate lifecycle, QC fail-closed behavior, and UNTESTED action defaults—but do not present historical sequencing as the current roadmap.


## R7-A Human Realism

R7-A is locked at `680012c10f3f0f92a7744c496350b450c0f9e916`. It produces a provider-neutral, versioned four-scene Human Realism overlay after re-validating R4, re-resolving R5, and matching R6 risk. It never changes truth, objectives, actions, states, dialogue, references, continuity, format, or transitions. Any non-READY R6 scene—including the empirical UNTESTED map—fails before intelligence. The single global intelligence request has empty media and can return only five scene behavior strings. Deterministic global constraints remain immutable and preserve POV realism, contact continuity, canonical end states, and the R3 identity/environment locks. T0 is next and is not authorization to begin it.


## T0-PREP Voice Timing Calibration Infrastructure

T0-PREP is locked at `f51a9589ba413243e8b46fb0fad52b28f4ad8ce6`. It has no TTS provider or audio runtime. Its core compiler turns timing observations from exactly one `vi-VN` voice identity into a provider-neutral profile. The conservative rate is the nearest-rank lower-quartile measured rate; only measured data and explicit policy margin affect the eight-second budget. Profiles carry SYNTHETIC or EMPIRICAL provenance, and the empirical guard rejects synthetic fixtures. T0-LIVE Saydi calibration remains fallback work and is not a prerequisite for R7-B.

## T0-IDENTITY HARDENING + Saydi VoiceProvider Boundary

T0-SAYDI-PREP is locked at `8e2d6de4d342b3d2c30fb8bf8ebfa1c7d435c1d8`. V1 South Voice Policy at `72c6f656176d298163c7ea030a0b6c48ab1dafcd` makes `VOICE_TIMING_V2` require an immutable provider-neutral `voiceIdentityId` in every timing calibration key and profile. The two canonical V1 identities are `VN_FEMALE_SOUTH_REVIEW_V1` and `VN_MALE_SOUTH_REVIEW_V1`; both use `vi-VN` / `SOUTH` / `review`. Canonical Core validation rejects both retired North identities and every identity/gender/region/style contradiction for observations, persisted timing profiles, and Saydi bindings. The generic VoiceProvider interface has no Saydi-specific fields. The isolated Saydi browser boundary remains fallback infrastructure; it owns optional provider voice IDs, names, settings, and browser mechanics, which never enter Core contracts. T0-LIVE is not on the V1 critical path and cannot block R7-B.

## Frozen V1 voice architecture

`T1 Authoritative Flow Native Speech` is the V1 primary authoritative voice path. At the provider roadmap boundary only, `VN_FEMALE_SOUTH_REVIEW_V1` maps to Flow saved voice `Leda Custom`; the human four-scene consistency benchmark is PASS. `VN_MALE_SOUTH_REVIEW_V1` maps to Flow base voice `Achird` using the currently selected default Customize Character; it is selected/config locked and has no four-scene benchmark claim. Saydi remains fallback infrastructure. No Flow voice name or ID belongs in Core contracts. Future normal V1 delivery is exactly four approved complete scene MP4 files plus one UTF-8 `key-points.txt` file containing exactly eight key points, two per scene. Scene 1 Key Point 1 must equal the canonical validated `ProductInput.name` and may never be LLM-paraphrased. No stitched final MP4 is required; the output folder is user-selected later and is not hard-coded. R4.1 is FINAL LOCKED / DIRECTLY AUDITED at implementation `026f3a217f3283d09007019714358054ea0983bd`; R7-B Dialogue Finalization is FINAL LOCKED / DIRECTLY AUDITED at implementation `696ffea000c4f804472ffaebdd180ec236e68546`; R8 is FINAL LOCKED / DIRECTLY AUDITED at corrective implementation `d13b6b307377189af40d2e14dd699ddc8341e748`; P0 is PASS / LOCKED locally / awaiting external audit.

## R4.1 Four-Scene / Eight-Key-Point Plan

R4.1 corrective implementation is FINAL LOCKED / DIRECTLY AUDITED at implementation `026f3a217f3283d09007019714358054ea0983bd`. `KEY_POINTS_V1` is an independent provider-neutral input for the later R7-B boundary; it does not alter R4, R5, R6, R7-A, dialogue finalization, runtime, voice binding, QC, serialization, or delivery. The contract preserves exact product/evidence/version/ordered-asset binding plus the R4 scene IDs and indexes. It holds exactly four ordered scenes and exactly two ordered points per scene. Scene 1 Point 1 is copied byte-for-byte from `context.productTruth.name`, is absent from provider input, and cannot be model-authored or overridden. The one permitted empty-media structured request receives fixed policy and sanitized logical input, returning only three secondary truth IDs. Per-scene input includes only scene ID, index, role, physical objective, and primary truth ID; it includes no Product Name, dialogue, generated prose, media, provider-specific fields, or CreativeDirectionInput. `buildPlanningTruthCatalog` remains the sole truth-catalog authority; final factual text is deterministically resolved from it. Scene 4 Point 2 may reuse any PRODUCT_TRUTH that actually appeared in Scenes 1–3, including a valid secondary from Scene 2 or 3, but a genuinely new truth fails closed. The final validator rejects invalid upstream binding, malformed or undeclared fields, unknown IDs, same-scene duplication, wrong R4 primary refs, and any noncanonical PRODUCT_TRUTH text. Verification: `npm run typecheck` PASS; `npm test` PASS (175 tests); `npm run benchmark:dry` PASS with all actions fail-closed UNTESTED; `npm run build -w @mochi/web` PASS; `git diff --check` PASS. No live Gemini, Flow, or Saydi calls occurred; no video generations or action promotions occurred. R7-B Dialogue Finalization is PASS / LOCKED locally / awaiting external audit. R8 is NEXT / NOT STARTED.

## R7-B Dialogue Finalization V1

R7-B final corrective implementation is locked locally at `696ffea000c4f804472ffaebdd180ec236e68546`. `DIALOGUE_V1` is a provider-neutral production input with the committed product/evidence/version/ordered-asset identity, `vi-VN`, one deterministic canonical South review voice identity, exactly four ordered finalized dialogues, and a deterministic typed input binding. The single pure binding authority compiles only the generation-relevant creative fields plus the four ordered R4/`KEY_POINTS_V1` scene bindings; no R4 dialogue draft, ProductTruth catalog, media, provider data, R7-A, Flow, or Saydi content enters it. The model cannot author or override the binding, and the pure upstream-binding validator rejects stale dialogue against current committed source, creative input, R4 scene context, or key-point metadata/text. Before any intelligence call, R7-B reuses `validateGlobalContinuityState(globalPlan.continuity, context, creativeDirection)` alongside R4 and `KEY_POINTS_V1` validation, so continuity voice, location, and committed-source contradictions fail closed. It uses one empty-media global generation call followed by one empty-media semantic gate, and fails closed without retries. It is independent of R5, R6, and R7-A. Verification: `npm run typecheck` PASS; `npm test` PASS (187 tests); `npm run benchmark:dry` PASS with action capability state unchanged and all benchmark actions fail-closed UNTESTED; `npm run build -w @mochi/web` PASS; `git diff --check` PASS. No new live Gemini, Flow, or Saydi calls occurred; no new generations or promotions occurred. R7-B is PASS / LOCKED locally / awaiting external audit. R8 is NEXT / NOT STARTED.

## R8 Deterministic Production Compiler V1

R8 is FINAL LOCKED / DIRECTLY AUDITED at corrective implementation `d13b6b307377189af40d2e14dd699ddc8341e748`. `PRODUCTION_CONTRACT_V1` is a provider-neutral top-level contract containing exactly four ordered eight-second, 9:16 scene contracts. It retains committed source identity, exact continuity, logical voice identity, Human Realism constraints, and a deterministic typed binding of every R4/R5/R4.1/R7-A/R7-B production value. The pure compiler validates the current R4 plan and continuity, uses `buildPlanningTruthCatalog` for R4.1, recomputes R5 and R6, requires R6 READY scenes, validates R7-A against exact R5, and proves R7-B's current upstream binding. One deterministic compiler builds the stored production prompt from validated values only; it copies Vietnamese dialogue byte-for-byte and contains no provider binding, R4 dialogue draft, or model-authored R8 content. Exact-key validation rejects malformed or undeclared fields, stale source bindings, reordered scenes, voice contradictions, and altered prompts. Provider neutrality is structural: the compiler cannot create provider/model/session/voice-binding fields, while validated product, key-point, and dialogue text are retained even if they contain provider-like words.

## P0 Production Snapshot Persistence V1

P0 is PASS / LOCKED locally / awaiting external audit at implementation `21de4528e318cf8d48ea8b0752fe0217a2ea1a0b`. It adds the provider-neutral `PRODUCTION_SNAPSHOT_V1` contract, which contains exact R8 `PRODUCTION_CONTRACT_V1` output plus project and committed source identity only. A server-only injected-root store recompiles R8 rather than accepting a manually constructed contract, validates the full snapshot, derives `ps_<64 lowercase hex SHA-256>` from sorted-key canonical JSON excluding `snapshotId`, and persists canonical UTF-8 JSON immutably. Temporary same-root writes publish with atomic no-overwrite semantics; valid duplicate saves are idempotent, while corrupt or conflicting existing paths fail closed. Loads validate the strict snapshot and R8 contract, source binding, and recomputed content ID before return. Verification: `npm run typecheck` PASS; `npm test` PASS (206 tests); `npm run benchmark:dry` PASS with all benchmark actions fail-closed `UNTESTED`; `npm run build -w @mochi/web` PASS; `git diff --check` PASS. No IntelligenceProvider, Gemini, Flow, or Saydi calls; no video generations or ActionCapability promotions. PRE-F1 INTEGRATION GATE is NEXT / NOT STARTED.

## PRE-F1-A Consolidated Production Runtime Integration Harness

PRE-F1-A is superseded by its FINAL LOCKED / DIRECTLY AUDITED bounded-replan correction at implementation `b1bf248c1eabacaf4a6c88abd67de138f6a98169`. The server-only runtime composes the existing R1→P0 authorities in the locked order, uses one injected provider-neutral IntelligenceProvider, requires all R6 scenes READY, persists/reloads/compares P0 snapshots, and exposes only a safe ordered trace. It retains runtime media solely at R1 and R2-B and has no Flow or Saydi path. The mocked complete fixture makes exactly 9 intelligence requests; all deterministic stages remain deterministic and snapshot IDs are stable. The development-only `pre-f1:live` runner is explicit-opt-in (`PRE_F1_LIVE=1` plus `GEMINI_API_KEY`, manifest, real image files, source version/project ID in that manifest, and snapshot root). Missing enablement/config prints `PRE_F1_LIVE_NOT_RUN` without calls; success reports only request count/stages, snapshot/product/scene IDs, READY statuses, and logical voice identity. Verification: `npm run typecheck` PASS; `npm test` PASS (216 tests); `npm run benchmark:dry` PASS with all actions still `UNTESTED`; `npm run build -w @mochi/web` PASS; `git diff --check` PASS. P0 is FINAL LOCKED / DIRECTLY AUDITED at `21de4528e318cf8d48ea8b0752fe0217a2ea1a0b`. PRE-F1-LIVE is BLOCKED BY EMPIRICAL ACTION CAPABILITY / NOT RUN; F1 is NOT STARTED. This does not claim PRE-F1 overall PASS. New live Gemini, Flow, and Saydi calls: 0; generations: 0; ActionCapability promotions: 0.

### PRE-F1-A direct-audit correction

At implementation `16a82a08607e3022f75d78bc8924461ae096da4d`, `pre-f1:live` now checks the trusted current ActionCapability state before it reads a manifest or image, constructs Gemini, creates a runtime, or constructs P0 storage. Since all physical ActionIds remain `UNTESTED`, enabled/configured invocation reports `PRE_F1_LIVE_BLOCKED` with zero provider/Gemini/Flow/Saydi calls, generations, or promotions. Missing enablement/config still reports `PRE_F1_LIVE_NOT_RUN`. The runner accepts no ActionCapability environment, manifest, JSON, or synthetic SAFE/RISKY override. A future trusted empirical map source will be connected only after the Flow benchmark/capability evidence foundation produces classifications under the locked 10-attempt / 0.90 SAFE / 0.60 RISKY policy. `production-runtime.ts`, its R6 READY behavior, and locked R1→P0 ordering are unchanged; only explicit test fixtures may supply SAFE actions. P0 is FINAL LOCKED / DIRECTLY AUDITED at `21de4528e318cf8d48ea8b0752fe0217a2ea1a0b`. PRE-F1-A is FINAL LOCKED / DIRECTLY AUDITED at `b1bf248c1eabacaf4a6c88abd67de138f6a98169`. PRE-F1-LIVE is BLOCKED BY EMPIRICAL ACTION CAPABILITY / NOT RUN; it is not the immediate next roadmap action. F1 production generation is NOT STARTED. Verification: `npm run typecheck` PASS; `npm test` PASS (219 tests); `npm run benchmark:dry` PASS; `npm run build -w @mochi/web` PASS; `git diff --check` PASS.

### PRE-F1-A bounded R6→R4 replan correction

At implementation `b1bf248c1eabacaf4a6c88abd67de138f6a98169`, the server orchestration restores the frozen R4 → initial R5/R6 → bounded replan → final R5/R6 READY → R7-A → R4.1 → R7-B → R8 → P0 order. It reuses `targetedReplan` and `MAX_SCENE_REPLAN_ATTEMPTS`, recomputes deterministic R5/R6 after each accepted replan, and fails closed before all downstream stages if no eligible SAFE alternative or no bounded resolution exists. R4.1 is created only from final R4, and R7-A/R7-B/R8/P0 consume only coherent final artifacts. The fully SAFE mock takes the no-op replan stage and still makes exactly 9 intelligence calls; a RISKY planned action test replans to SAFE and proves no stale action, objective, or reference artifact reaches downstream contracts. The current live runner remains BLOCKED BY EMPIRICAL ACTION CAPABILITY / NOT RUN before Gemini; the next prerequisite remains the Flow benchmark/capability evidence foundation. P0 is FINAL LOCKED / DIRECTLY AUDITED at `21de4528e318cf8d48ea8b0752fe0217a2ea1a0b`; PRE-F1-A is FINAL LOCKED / DIRECTLY AUDITED; F1 production generation is NOT STARTED. Verification: `npm run typecheck` PASS; `npm test` PASS (221 tests); `npm run benchmark:dry` PASS; `npm run build -w @mochi/web` PASS; `git diff --check` PASS. New live Gemini, Flow, and Saydi calls: 0; generations: 0; ActionCapability promotions: 0.
