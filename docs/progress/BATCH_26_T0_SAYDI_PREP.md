# Batch 26 — T0-SAYDI-PREP Voice Identity and Provider Boundary

- Implementation commit: `8e2d6de4d342b3d2c30fb8bf8ebfa1c7d435c1d8`
- Scope: provider-neutral immutable voice identity, `VOICE_TIMING_V2`, generic VoiceProvider interface, and isolated mock-tested Saydi browser boundary.
- Files changed: `packages/contracts/src/index.ts`, `packages/core/src/index.ts`, `packages/core/src/voice-timing.test.ts`, `packages/providers/package.json`, `packages/providers/src/index.ts`, `packages/providers/src/voice.ts`, `packages/providers/src/saydi-browser-voice.ts`, `packages/providers/src/saydi-browser-voice.test.ts`, and `package-lock.json`.
- Commands: `npm run typecheck`, `npm test`, `npm run benchmark:dry`, `npm run build -w @mochi/web`, `git diff --check`.
- Verification: all commands PASS; `npm test` reports 158 passing tests. Dry benchmark remains fail-closed with `action_untested:PICK_UP` (and existing HOLD/ROTATE_SLOW UNTESTED results).
- Runtime accounting: Saydi calls 0; generated audio 0; Gemini calls 0; Flow calls 0; video generations 0; action promotions 0.
- Architecture deviations: none. Provider voice IDs, names, settings, and browser mechanics are restricted to `packages/providers`; Core/contracts retain only the immutable logical `voiceIdentityId` and provider-neutral metadata.
- Status: T0-SAYDI-PREP PASS / LOCKED. T0-LIVE Saydi browser automation, empirical timing, and human listening are NEXT / NOT STARTED. R7-B remains blocked on T0-LIVE.
