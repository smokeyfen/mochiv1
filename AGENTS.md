# MochiV1 Agent Instructions

This repository is the source of truth for MochiV1, the repo-first implementation of FEN V1.

## Product target

V1 is **POV Authentic On-Hand Review** for TikTok Affiliate product videos.

User-facing success means:

Product input -> Blueprint -> 4 scenes -> internal validation/generation/QC/repair -> only APPROVED scenes -> final ready-to-upload MP4.

The system may retry or repair internally. It must never expose a candidate as final merely because generation succeeded.

## Mandatory reading order

Before changing code, read:

1. `CODEX_START_HERE.md`
2. `docs/CODEX_HANDOFF.md`
3. `docs/ARCHITECTURE.md`
4. `docs/M0-ACCEPTANCE.md`
5. `docs/FEN_V1_PROJECT_HANDOFF.md`
6. Relevant tests and source files for the current task

## Development policy

- Work one milestone and one objective at a time.
- Do not advance to a later milestone until the current acceptance gate passes.
- Preserve working modules. Do not refactor unrelated code during a fix or milestone.
- Prefer deterministic code over additional LLM/model calls.
- Keep TypeScript strict.
- Add or update tests for non-trivial domain behavior.
- Run all relevant typechecks/tests before declaring PASS.
- Report exact commands run and PASS/FAIL results.
- If a required external dependency, model credential, or real product reference is unavailable, fail closed and stop at the correct gate. Do not fake empirical evidence.

## Locked V1 domain rules

- V1 is On-Hand only. No KOC face.
- Exactly 4 scenes: HOOK, FEATURE, PROOF, CTA.
- Scene duration is 8 seconds.
- Aspect ratio is 9:16.
- One scene = one primary physical objective.
- All physical actions start `UNTESTED`.
- Only real benchmark evidence may promote actions to `SAFE` or `RISKY`.
- `UNTESTED` and `AVOID` actions fail feasibility preflight.
- Continuity is state-driven from V1.0.
- State continuity is more important than pixel continuity.
- Generation output is a Candidate, not Final.
- QC is fail-closed.
- A critical QC failure blocks approval.
- Voice-over is a separate track from video generation in V1.
- Product truth and creative direction are separate concerns.
- Do not invent product claims.

## Architecture boundaries

Core contracts must remain provider-agnostic.

Never leak these into Core contracts:

- Flow `mediaId`
- Gemini file URI
- bearer/session token
- provider operation name
- provider endpoint
- Flow project internals

Provider-specific identifiers belong only in provider/adapter layers.

Do not silently fall back to a weaker generation mode. If a contract requires a capability and the provider lacks it, return a capability error.

## Quality priority

1. Correctness
2. Product fidelity
3. Human realism
4. Requirement adherence
5. Continuity
6. Reliability
7. Maintainability
8. Cost
9. Speed

Do not optimize credits, latency, batch generation, or UI polish before reliability gates pass.

## UI policy

UI is deliberately minimal.

- Static, readable, desktop-first.
- No animation requirement.
- No canvas, node graph, fancy timeline, or decorative system unless explicitly requested later.
- UI is not a milestone by itself. Video correctness is.

## Current milestone discipline

Current exported baseline is M0: Contracts + feasibility harness skeleton.

The next domain gate is **FEN V1 FEASIBILITY LOCK**.

Do NOT implement Product Evidence, Planner, Flow runtime, full QC/repair, or production assembly before the feasibility benchmark foundation is ready and real action evidence exists.

## Git / change hygiene

- Keep commits small and milestone-scoped.
- Do not rewrite unrelated history.
- Update docs when a contract or locked decision changes.
- Never commit secrets, generated bearer tokens, `.env`, raw credentials, or private user data.
- Keep model/provider artifacts outside tracked source unless they are sanitized deterministic fixtures.
