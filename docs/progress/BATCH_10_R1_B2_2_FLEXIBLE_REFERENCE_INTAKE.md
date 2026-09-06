# Batch 10 — R1-B2.2 Flexible Product Reference Intake

Date: 2026-09-06

## Checkpoint

- Branch: `codex/feasibility-lock-candidate`
- Starting checkpoint: `226dcf76c3c93d8753eaa352d21fe8b19e10224d`
- Implementation commit: `a806ac485732510aa90185fac80d428b12d619be`
- Status: PASS

## Changes

- Added provider-neutral `PRODUCT_REFERENCE` while retaining every existing AssetRole.
- A ProductInput with one or many `PRODUCT_REFERENCE` assets is valid; no front, side, back, angle, or image-count requirement was added.
- apps/web now assigns `PRODUCT_REFERENCE` to every new image upload and shows only preview, MIME metadata, and remove control. Multi-select upload, runtime `assetId -> File` storage, object URL cleanup, ready-input invalidation, and canonical logical-asset preview are preserved.
- Product Evidence authoritative rules now treat arbitrary-order, packaging, text-heavy, in-hand, multi-product, and unrelated-background references conservatively. The target is identified from ProductInput factual values; ambiguous attribution records uncertainty. The output schema and instruction/inputText/media separation are unchanged.

## Verification

- `npm run typecheck`: PASS across seven workspaces.
- `npm test`: PASS, 69 tests total.
- `npm run benchmark:dry`: PASS with expected fail-closed `action_untested:PICK_UP`; all actions remain `UNTESTED`.
- `npm run build -w @mochi/web`: PASS.
- Evidence identifier audit: PASS; no Gemini, Flow, credential, runtime identifier, local path, or media-byte identifier appears in `packages/evidence`.
- Manual web reference-role selector: absent. Voice selects remain unchanged.

Live Gemini calls: 0. Flow calls: 0. Real video generation: 0. Action promotions: 0. apps/server source was unchanged. `main` was not merged, rebased, or cherry-picked.

## Next action

STOP. R1-B3A Server HTTP Analysis Boundary is NOT STARTED. Live runtime validation is DEFERRED until the R1 application milestone is complete.