# Batch 13 — R1-B3B.2 apps/web Product Evidence UI

- Branch: `codex/feasibility-lock-candidate`
- Application implementation commit: `e236d02f2a994684dee23f5b8c372ac67a261f86`
- Status: PASS
- Scope: browser-only Product Evidence client and factual analysis UI

## Changed files

- `apps/web/src/product-evidence-client.ts`
- `apps/web/src/product-evidence-client.test.ts`
- `apps/web/src/App.tsx`
- `apps/web/src/App.test.tsx`
- `apps/web/src/styles.css`

## Behavior recorded

The client posts relative `POST /api/product-evidence` multipart data only. `product` is a `ProductInput` JSON part and each logical asset has exactly one `asset:<assetId>` browser File part. It does not attach manual content-type headers and never serializes creative direction, project IDs, provider identifiers, object URLs, paths, credentials, or runtime transport details.

The client fail-closes before fetch for invalid ProductInput, absent files, non-image or empty files, and MIME mismatches. It strictly decodes successful responses and runs `validateProductEvidence` against the submitted factual product before rendering. Browser-visible failures use only stable safe codes.

Factual product mutations abort and clear the current analysis, and a request-generation token ignores late results. Creative-direction mutations do not fetch, abort, or clear factual evidence; they continue to invalidate the separate canonical project-input preview.

## Verification

- `npm run typecheck` — PASS
- `npm test` — PASS, 86 tests
- `npm run benchmark:dry` — PASS with expected fail-closed `action_untested:PICK_UP`
- `npm run build -w @mochi/web` — PASS

## Runtime accounting and locks

- Live Gemini calls: 0
- Flow calls: 0
- Real video generation: 0
- Action promotions: 0; all ActionIds remain `UNTESTED`
- Architecture deviations: none
- R1 Application Path: IMPLEMENTED
- Deferred Live Runtime Validation: NOT RUN
- R2 Product Truth / Blueprint: NOT STARTED

STOP. Do not begin R2 or a live runtime validation without explicit authorization.
