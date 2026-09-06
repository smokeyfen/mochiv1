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
- T0-LIVE Saydi browser automation, empirical timing, and human listening: **NEXT / NOT STARTED**
- R7-B Dialogue Finalization: **BLOCKED on T0-LIVE**
- PRE-F1 INTEGRATION GATE: future runtime check after R8 and P0

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

This is a sequencing and boundary lock. It is not authorization to begin the next stage. Each stage requires an explicit task and acceptance gate.

## Empirical and PRE-F1 runtime policy

Baseline transfer confidence is accepted for roadmap continuation because the completed real PICK_UP and HOLD canaries each have a valid, single reviewed RUBRIC-0 PASS observation. Those observations do not promote either action: the locked 10-attempt, 0.90 SAFE, and 0.60 RISKY policy remains in force.

F0-A.4 ROTATE_SLOW is DEFERRED. No additional per-action runtime validation is required while implementing R2-A, R2-B, R2 Commit Gate, R3, R4, R5, R6, R7-A, T0, R7-B, R8, and P0. These milestones must retain strict contracts, deterministic validation, unit/integration tests, provider-neutral boundaries, and fail-closed behavior.

The next consolidated runtime checkpoint is **PRE-F1 INTEGRATION GATE**, only after R8 and P0 are PASS / LOCKED. At PRE-F1, perform one consolidated real-runtime validation of the completed reasoning/compiler pipeline before implementing or enabling the final Flow runtime path.

RUBRIC-0 still evaluates one generated benchmark scene against actual generated video, real product references, and the benchmark contract. It does not add artificial cross-scene continuity to F0. Pairwise and global continuity QC belong to the later production pipeline.

## Non-negotiable architecture locks

### Providers and credentials

- **Google Flow is the only video generator.** Flow / Omni Flash 1.1 usage stays behind a provider/infrastructure boundary.
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
- Local/free TTS is the planned V1 voice direction. Final assembly is a one-pass FFmpeg step only after approved production outputs.

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

T0-PREP is locked at `f51a9589ba413243e8b46fb0fad52b28f4ad8ce6`. It has no TTS provider or audio runtime. Its core compiler turns timing observations from exactly one `vi-VN` voice identity into a provider-neutral profile. The conservative rate is the nearest-rank lower-quartile measured rate; only measured data and explicit policy margin affect the eight-second budget. Profiles carry SYNTHETIC or EMPIRICAL provenance, and the empirical guard rejects synthetic fixtures. T0-LIVE is next and must supply measured local-TTS timing before R7-B may begin.

## T0-IDENTITY HARDENING + Saydi VoiceProvider Boundary

T0-SAYDI-PREP is locked at `8e2d6de4d342b3d2c30fb8bf8ebfa1c7d435c1d8`. `VOICE_TIMING_V2` requires an immutable provider-neutral `voiceIdentityId` in every timing calibration key and profile. Exact V1 i-VN review identities cover the four gender/region combinations. Since $sha, one canonical Core validator requires every identity, language, gender, region, and style field to correspond exactly; observations, persisted profiles, and Saydi binding construction all fail closed on contradiction. The generic VoiceProvider interface has no Saydi-specific fields. The isolated Saydi browser boundary owns optional provider voice IDs, names, settings, and browser mechanics, validates explicit bindings fail-closed, and is tested exclusively with mocks. No production binding is populated or guessed. No browser automation, Saydi request, audio generation, Gemini call, or Flow call occurred. T0-LIVE is next and must establish browser feasibility, exact binding, empirical timing, and human listening quality before R7-B begins.
