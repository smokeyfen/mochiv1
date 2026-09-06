# Batch 25 — T0-PREP Voice Timing Calibration Infrastructure

Implementation: `f51a9589ba413243e8b46fb0fad52b28f4ad8ce6`. T0-PREP adds provider-neutral timing contracts and a pure core engine only. It normalizes Vietnamese-oriented spoken units deterministically, rejects malformed/mixed timing observations, uses exact voice identity, and compiles a versioned VoiceTimingProfile. The target remains 8000 ms; explicit policy supplies safety margin and observation minimum.

Rates are units per second from measured observations. Median and conservative rate use the documented nearest-rank percentile; the conservative value is the lower quartile, never the fastest sample. The estimator returns FITS or TOO_LONG without changing dialogue. SYNTHETIC and EMPIRICAL provenance are explicit, and synthetic profiles fail the empirical readiness guard.

Verification PASS: `npm run typecheck`; `npm test` (150 tests); `npm run benchmark:dry`; `npm run build -w @mochi/web`; `git diff --check`. No TTS engine, audio output, Gemini call, Flow call, video generation, or action promotion occurred. T0-PREP is PASS / LOCKED. T0-LIVE is NEXT / NOT STARTED. R7-B is BLOCKED on T0-LIVE.
