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

All ActionIds start UNTESTED. Only empirical Omni feasibility evidence can promote them to SAFE or RISKY. AVOID and UNTESTED actions fail feasibility preflight.

## UI

Minimal, static, readable. No animation requirement. UI is not a product milestone; video correctness is.
