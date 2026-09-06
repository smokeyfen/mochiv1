# MochiV1 Feasibility Status

- Branch: `codex/feasibility-lock-candidate`
- Main bootstrap commit: `75fd0e5d80531de9d1bb8cbec9899c32d269fab4`
- Current verified implementation commit: `82d72d506dfb42d1d77babe1f6c819b829e52855`
- Superseded M2 video-path audit commit: `d8553db`
- Provider asset boundary correction: VERIFIED at `6ad9d0e`
- Current milestone: R0-A Canonical Project Input Contracts
- Milestone status: PASS — canonical provider-neutral project input boundary verified
- Next application milestone: R0-B apps/web Input Surface — NOT STARTED
- Flow milestone: M2-B Flow Video Canary — deferred until the reasoning pipeline is stable
- FEN V1 FEASIBILITY LOCK: BLOCKED pending Flow canary and controlled empirical video evidence
- Real generation count: 0
- Architecture deviations: none
- Next action: STOP. R0-B apps/web Input Surface is NOT STARTED and requires separate authorization.

No action has been promoted from `UNTESTED`.

Core `AssetRef` contains only schema version, logical asset identity and provider-agnostic metadata. Resolved provider asset bindings exist only in `packages/providers`.

M2-A provides `IntelligenceProvider` and a `Gemini35FlashIntelligenceProvider` for typed structured multimodal analysis only. `GEMINI_API_KEY` is read only at the provider configuration edge; a missing or blank key returns `INTELLIGENCE_PROVIDER_ERROR:CONFIGURATION` without exposing configuration values. The provider uses the fixed `gemini-3.5-flash` model and has no `generate` or `edit` video methods.

Locked execution order: M2-A PASS → R0-A Canonical Project Input Contracts → R0-B apps/web Input Surface → reasoning pipeline → Flow integration. Gemini 3.5 Flash remains reasoning-only. Google Flow remains the only planned video renderer and consumes Flow credits. Local/free TTS is the default future voice direction and will be benchmarked later.

R0-A adds `MochiProjectInput`, which composes factual `ProductInput` with separate `CreativeDirectionInput`. `ProductInput.audience` is intentionally retired; callers must provide the audience in `creativeDirection.audience`. `SCHEMA_VERSION` remains `1.0.0` because this repository has no persisted project-input payloads or external contract consumers; no migration artifact is required at this boundary. All logical assets remain provider-neutral.

Verification at `82d72d506dfb42d1d77babe1f6c819b829e52855`: `npm run typecheck` PASS; `npm test` PASS (28 tests); `npm run benchmark:dry` PASS with expected fail-closed `action_untested:PICK_UP`; `npm run build -w @mochi/web` PASS. No Gemini call, Flow call, or real video generation occurred.

Verification at `eccdeb2f34cedc471649c2e35f293d1cde85cec7`: `npm run typecheck` PASS; `npm test` PASS (20 tests); `npm run benchmark:dry` PASS with expected fail-closed `action_untested:PICK_UP`; `npm run build -w @mochi/web` PASS. Real generation count remains 0.
