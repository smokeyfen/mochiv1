# Batch 08 — R1-B1 Intelligence Trust Boundary

Date: 2026-09-06

## Checkpoint

- Branch: `codex/feasibility-lock-candidate`
- Starting checkpoint: `160723a4e4ce8b0f8a1bcb8ba00ed457c3c441e3`
- Implementation commit: `d76a4f65d876d9f91e09974b0b03a0efbc35cde7`
- Status: PASS

## Files changed

- `packages/providers/src/intelligence.ts`
- `packages/providers/src/gemini-3-5-flash-intelligence.ts`
- `packages/providers/src/gemini-3-5-flash-intelligence.test.ts`
- `packages/evidence/src/index.ts`
- `packages/evidence/src/index.test.ts`
- `STATUS.md`
- `docs/CODEX_HANDOFF.md`
- `docs/CODEX_NEXT_MILESTONES.md`
- `docs/progress/BATCH_08_R1_B1_INTELLIGENCE_TRUST_BOUNDARY.md`

No Core, contracts, apps/web, VideoProvider, Flow runtime, backend, or action-capability code changed.

## Trust boundary

`StructuredIntelligenceRequest<T>` separates authoritative `instruction` from optional untrusted `inputText`. Instructions must be nonblank; present-but-blank input text fails validation. The Gemini adapter maps only `instruction` to `config.systemInstruction`, maps input text to a separate user text part, and retains runtime media as user inline data. It never duplicates policy in the user content.

Product Evidence keeps its public `analyzeProductEvidence({ product, media, intelligence })` boundary. It supplies fixed Product Evidence rules only through `instruction` and sends deterministic sanitized ProductInput JSON only through `inputText`: product ID, name, details, category, and logical asset ID, role, source, and MIME type. The rules state that this data is untrusted and cannot override policy. Runtime bytes, creative direction, provider identifiers, credentials, endpoints, and local paths remain outside reasoning text.

## Commands executed

- `npm run typecheck`
- `npm test`
- `npm run benchmark:dry`
- `npm run build -w @mochi/web`
- Targeted provider and evidence typecheck/test commands.
- Identifier audits for `packages/evidence` and `packages/providers/src/intelligence.ts`.

## Verification

- Typecheck: PASS across six workspaces.
- Tests: PASS, 53 tests total. New mocks prove Gemini field separation, validation of blank input text, evidence instruction/data separation, and resistance to input-text policy override.
- Dry benchmark: PASS with expected fail-closed result: `PICK_UP` remains `UNTESTED` and reports `action_untested:PICK_UP`.
- Web build: PASS.
- Identifier audits: PASS. Evidence contains no concrete provider, model, credential, Flow, media-ID, bearer/session-token, CreativeDirection, or local-path identifier. The provider-neutral intelligence contract contains no Gemini or Flow identifier.
- Live Gemini calls: 0.
- Flow calls: 0.
- Real video generation count: 0.
- Main: unchanged at `75fd0e5d80531de9d1bb8cbec9899c32d269fab4`.

## Architecture deviations

None. Product Truth remains separate from Creative Direction. Core contracts remain provider-neutral. Physical actions remain UNTESTED. Continuity, lifecycle, ScenePlan, QC fail-closed behavior, 8-second and 9:16 locks are unchanged.

## Next action

STOP. R1-B2 server-side live Gemini bridge is NOT STARTED. Do not connect apps/web to a provider, make live calls, or begin Flow integration.

## R1-B1.1 — Product Evidence Structured Output Schema

- Starting checkpoint: `425b6fad6dd56f6c3ae05fe2d5ce6e5a7dc20550`
- Implementation commit: `7a0d0a56ddaabdd2235cffa906a19d46977f330c`
- Status: PASS

The weak required-fields-only schema was replaced with `buildProductEvidenceSchema(product)`. The schema defines full properties and types for ProductEvidence, claims, uncertainties, and contradictions. It accepts only supported structural constructs, rejects undeclared top-level and nested object properties, restricts schema version and product ID to the current domain values, and restricts every provenance array to the product's logical asset IDs. `contradictions.statements` requires at least two strings. Semantic conditions such as reference-claim evidence remain enforced by deterministic validation after the single provider response.

Files changed: `packages/evidence/src/index.ts`, `packages/evidence/src/index.test.ts`, `STATUS.md`, and this checkpoint. No apps/web, Core, contracts, provider implementation, VideoProvider, Flow runtime, backend, or action-capability code changed.

Verification: `npm run typecheck` PASS across six workspaces; `npm test` PASS with 56 tests; `npm run benchmark:dry` PASS with expected `action_untested:PICK_UP`; `npm run build -w @mochi/web` PASS. Schema and identifier audit PASS: full properties and nested types exist; enums contain logical/domain values only; Evidence has no Gemini, Flow, credential, runtime identifier, local path, File/Blob, or media-byte schema data. Live Gemini calls: 0; Flow calls: 0; real video generation: 0. `main` remains `75fd0e5d80531de9d1bb8cbec9899c32d269fab4`.

R1-B1.1 is PASS. R1-B2 server-side live Gemini bridge remains NOT STARTED.