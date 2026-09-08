# MochiV1 Architecture Lock — M0

## Source of truth

GitHub repository.

## Runtime boundaries

Core -> provider-agnostic Production Contract -> VideoProvider.

Provider-specific identifiers (Flow mediaId, Gemini file URI, bearer/session tokens, operation names) must never enter Core contracts.

## V1 lifecycle

PLANNED -> PREFLIGHT_PASS -> GENERATING -> GENERATED -> QC_PENDING -> APPROVED | REJECTED

Skipping QC is forbidden.

## Continuity

Continuity state is part of V1.0, not a later add-on.

Each scene owns START STATE -> ACTION -> END STATE. Cross-scene handoff must preserve product and prop state unless an explicit cut permits a documented hidden transition.

## Physical-action policy

All ActionIds start UNTESTED. Only empirical evidence from the Flow video feasibility benchmark can promote them to SAFE or RISKY. Intelligence-provider analysis alone can never promote an action. AVOID and UNTESTED actions fail feasibility preflight.

## Provider separation

Gemini 3.5 Flash-Lite is an intelligence and multimodal-analysis provider only. It must not implement `VideoProvider`. Actual video generation is a separate responsibility reserved for a future Google Flow adapter using Flow credits.

## UI

Minimal, static, readable. No animation requirement. UI is not a product milestone; video correctness is.
