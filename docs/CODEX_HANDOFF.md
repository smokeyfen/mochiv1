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
- R2-A Product Truth: **NEXT / NOT STARTED**
- PRE-F1 INTEGRATION GATE: future runtime check after R8 and P0

The completed live path is:

`apps/web` → relative `POST /api/product-evidence` → `apps/server` → Gemini 3.5 Flash → validated `ProductEvidence` → Product Analysis UI.

This path is locked. It keeps browser runtime files separate from logical AssetRefs, sends only factual ProductInput to Product Evidence, validates output deterministically, and keeps credentials server-side.

## Current repository responsibilities

- `apps/web`: the only user-facing surface; Product Input and locked Product Evidence experience.
- `apps/server`: server-only Product Evidence boundary and native development HTTP adapter.
- `packages/contracts`: provider-neutral contracts, validation, benchmark observations, and Rubric-0 scoring contract.
- `packages/core`: feasibility, continuity carryover, lifecycle, and ActionCapability policy.
- `packages/evidence`: provider-neutral factual product evidence boundary.
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
