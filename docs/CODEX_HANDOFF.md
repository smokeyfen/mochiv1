# MochiV1 — Codex Handoff

**Date:** 2026-09-06
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
- Historical Flow generations: 2 (24 credits)
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
- PRE-F1-A Integration Harness: **PASS / LOCKED locally / awaiting external audit** at implementation `b1bf248c1eabacaf4a6c88abd67de138f6a98169`
- F0-B Trusted Capability Evidence Foundation: **PASS / LOCKED locally / awaiting external audit**
- PRE-F1-LIVE: **BLOCKED BY EMPIRICAL ACTION CAPABILITY / NOT RUN**
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

Baseline transfer confidence is accepted for roadmap continuation because the completed real PICK_UP and HOLD canaries each have a valid, single reviewed RUBRIC-0 PASS observation. Those observations do not promote either action: the locked 10-attempt, 0.90 SAFE, and 0.60 RISKY policy remains in force.

F0-A.4 ROTATE_SLOW is DEFERRED. No additional per-action runtime validation is required while implementing R2-A, R2-B, R2 Commit Gate, R3, R4, R5, R6, R7-A, T0, R7-B, R8, and P0. These milestones must retain strict contracts, deterministic validation, unit/integration tests, provider-neutral boundaries, and fail-closed behavior.

The next consolidated runtime checkpoint is **PRE-F1 INTEGRATION GATE**, only after R8 and P0 are PASS / LOCKED. At PRE-F1, perform one consolidated real-runtime validation of the completed reasoning/compiler pipeline before implementing or enabling the final Flow runtime path.

## F0-B Trusted Capability Evidence Foundation

`F0_BOTTLE_BASELINE_CAPABILITY_V1` is the isolated, provider-neutral campaign authority for the canonical Cocoon bottle fixture. It contains only PICK_UP, HOLD, and ROTATE_SLOW, with 10 planned cases per action (30 total), and preserves the exact historical attempt-one case objects. The core trusted derivation accepts only explicitly supplied human-reviewed `BenchmarkObservation` records that pass `validateBenchmarkObservation`, have REAL_MODEL_VIDEO origin, match the fixture/archetype/action/case scope, and have globally unique observation, candidate-asset, and case IDs. It delegates all classification math to `classifyCapabilityEvidence` and `DEFAULT_CAPABILITY_PROMOTION_POLICY`; rejected evidence is reported rather than silently counted.

Current trusted evidence remains PICK_UP 1 reviewed PASS, HOLD 1 reviewed PASS, ROTATE_SLOW 0. All actions remain UNTESTED, current promotions are 0, campaignReady is false, and 28 reviewed attempts remain to reach the three minimum sample counts (9 / 9 / 10). This count does not guarantee SAFE. Rubric-0 remains the only human review rubric; no automatic review, observation creation, promotion, provider call, or PRE-F1 map connection exists. `npm run benchmark:capability:dry` is deterministic and repository-only. PRE-F1-A is FINAL LOCKED / DIRECTLY AUDITED at `b1bf248c1eabacaf4a6c88abd67de138f6a98169`; PRE-F1-LIVE remains BLOCKED / NOT RUN; F1 is NOT STARTED. Next after F0-B external audit: controlled Flow benchmark execution planning.

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

PRE-F1-A is PASS / LOCKED locally / awaiting external audit at implementation `89d722206955a251ca1f295ed643cc994a147e68`. The server-only runtime composes the existing R1→P0 authorities in the locked order, uses one injected provider-neutral IntelligenceProvider, requires all R6 scenes READY, persists/reloads/compares P0 snapshots, and exposes only a safe ordered trace. It retains runtime media solely at R1 and R2-B and has no Flow or Saydi path. The mocked complete fixture makes exactly 9 intelligence requests; all deterministic stages remain deterministic and snapshot IDs are stable. The development-only `pre-f1:live` runner is explicit-opt-in (`PRE_F1_LIVE=1` plus `GEMINI_API_KEY`, manifest, real image files, source version/project ID in that manifest, and snapshot root). Missing enablement/config prints `PRE_F1_LIVE_NOT_RUN` without calls; success reports only request count/stages, snapshot/product/scene IDs, READY statuses, and logical voice identity. Verification: `npm run typecheck` PASS; `npm test` PASS (216 tests); `npm run benchmark:dry` PASS with all actions still `UNTESTED`; `npm run build -w @mochi/web` PASS; `git diff --check` PASS. P0 is FINAL LOCKED / DIRECTLY AUDITED at `21de4528e318cf8d48ea8b0752fe0217a2ea1a0b`. PRE-F1-LIVE is NOT RUN; F1 is NOT STARTED. This does not claim PRE-F1 overall PASS. New live Gemini, Flow, and Saydi calls: 0; generations: 0; ActionCapability promotions: 0.

### PRE-F1-A direct-audit correction

At implementation `16a82a08607e3022f75d78bc8924461ae096da4d`, `pre-f1:live` now checks the trusted current ActionCapability state before it reads a manifest or image, constructs Gemini, creates a runtime, or constructs P0 storage. Since all physical ActionIds remain `UNTESTED`, enabled/configured invocation reports `PRE_F1_LIVE_BLOCKED` with zero provider/Gemini/Flow/Saydi calls, generations, or promotions. Missing enablement/config still reports `PRE_F1_LIVE_NOT_RUN`. The runner accepts no ActionCapability environment, manifest, JSON, or synthetic SAFE/RISKY override. A future trusted empirical map source will be connected only after the Flow benchmark/capability evidence foundation produces classifications under the locked 10-attempt / 0.90 SAFE / 0.60 RISKY policy. `production-runtime.ts`, its R6 READY behavior, and locked R1→P0 ordering are unchanged; only explicit test fixtures may supply SAFE actions. P0 is FINAL LOCKED / DIRECTLY AUDITED at `21de4528e318cf8d48ea8b0752fe0217a2ea1a0b`. PRE-F1-A remains PASS / LOCKED locally / awaiting external audit. PRE-F1-LIVE is BLOCKED BY EMPIRICAL ACTION CAPABILITY / NOT RUN; it is not the immediate next roadmap action. F1 production generation is NOT STARTED. Verification: `npm run typecheck` PASS; `npm test` PASS (219 tests); `npm run benchmark:dry` PASS; `npm run build -w @mochi/web` PASS; `git diff --check` PASS.

### PRE-F1-A bounded R6→R4 replan correction

At implementation `b1bf248c1eabacaf4a6c88abd67de138f6a98169`, the server orchestration restores the frozen R4 → initial R5/R6 → bounded replan → final R5/R6 READY → R7-A → R4.1 → R7-B → R8 → P0 order. It reuses `targetedReplan` and `MAX_SCENE_REPLAN_ATTEMPTS`, recomputes deterministic R5/R6 after each accepted replan, and fails closed before all downstream stages if no eligible SAFE alternative or no bounded resolution exists. R4.1 is created only from final R4, and R7-A/R7-B/R8/P0 consume only coherent final artifacts. The fully SAFE mock takes the no-op replan stage and still makes exactly 9 intelligence calls; a RISKY planned action test replans to SAFE and proves no stale action, objective, or reference artifact reaches downstream contracts. The current live runner remains BLOCKED BY EMPIRICAL ACTION CAPABILITY / NOT RUN before Gemini; the next prerequisite remains the Flow benchmark/capability evidence foundation. P0 is FINAL LOCKED / DIRECTLY AUDITED at `21de4528e318cf8d48ea8b0752fe0217a2ea1a0b`; PRE-F1-A remains PASS / LOCKED locally / awaiting external audit; F1 production generation is NOT STARTED. Verification: `npm run typecheck` PASS; `npm test` PASS (221 tests); `npm run benchmark:dry` PASS; `npm run build -w @mochi/web` PASS; `git diff --check` PASS. New live Gemini, Flow, and Saydi calls: 0; generations: 0; ActionCapability promotions: 0.
