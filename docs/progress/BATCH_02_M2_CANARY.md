# Batch 02 — M2 Real Omni Canary

Date: 2026-09-06

## Checkpoint

- Branch: `codex/feasibility-lock-candidate`
- Starting commit: `2e17c83`
- M2 prerequisite audit commit: `d8553db`
- Status: BLOCKED at prerequisite gate

## Files changed

- `STATUS.md`
- `docs/progress/BATCH_02_M2_CANARY.md`
- `docs/progress/BATCH_03_BENCHMARK.md`
- `docs/progress/BATCH_04_FEASIBILITY_LOCK.md`

No provider or Core source code changed.

## Commands executed

- Environment variable name audit for `GEMINI`, `GOOGLE`, `VERTEX`, `API_KEY` and `GENAI` — no matching credential variables found.
- Repository image inventory for PNG, JPEG, WebP and JFIF files, excluding dependencies and build output — no tracked product reference images found.
- Official Gemini API documentation audit — confirmed the current stable model code and API surface described below.

## Typecheck status

PASS at the preceding M1 checkpoint across all five workspaces.

## Test status

PASS at the preceding M1 checkpoint: 14 tests.

## Benchmark status

- Dry benchmark: PASS with expected fail-closed behavior.
- Real canary: BLOCKED before dispatch.
- `PICK_UP`: `UNTESTED`.

## Official capability audit

Official Google documentation reviewed on 2026-09-06:

- Gemini video overview: <https://ai.google.dev/gemini-api/docs/video>
- Gemini Omni Flash guide: <https://ai.google.dev/gemini-api/docs/omni>
- Gemini Omni Flash model card: <https://ai.google.dev/gemini-api/docs/models/gemini-omni-flash>
- Interactions API reference: <https://ai.google.dev/api/interactions-api>

The current documented model code is `gemini-omni-1.1-flash`. It uses the Interactions API, accepts image inputs, supports portrait `9:16`, and documents 3–10 second video output. The Interactions API exposes a video response `duration` field, so an M2 implementation must request exactly 8 seconds and reject any output that does not verify as 8 seconds.

## Real generation count

0

## Blockers

1. No `GEMINI_API_KEY` or equivalent Google provider credential is configured in the process environment.
2. The GitHub source-of-truth repository contains no user-approved real product reference images.
3. No fixture has verified product identity/truth metadata tied to hashed uploaded references.

These are mandatory M2 prerequisites. A text-only or fabricated-image generation would not test product-reference fidelity and cannot count as the authorized real Omni canary.

## Architecture deviations

None. The provider boundary was not bypassed, no provider identifier entered Core, no candidate was generated, and no action classification changed.

## Next action

Configure the credential outside Git and add a user-approved real product reference set plus verified fixture metadata. Then implement the smallest Gemini Omni provider adapter and run one exact 8-second, 9:16 reference-conditioned canary.
