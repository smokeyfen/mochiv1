import test from 'node:test';
import assert from 'node:assert/strict';
import type { GoldenProductFixture, ProductInput, ScenePlan } from './index.ts';
import { SCHEMA_VERSION, validateGoldenProductFixture, validateProductInput, validateScenePlan } from './index.ts';

test('product input rejects missing assets', () => {
  const input: ProductInput = {
    schemaVersion: SCHEMA_VERSION, productId:'p1', name:'Bottle', details:'Test', category:'Beauty', audience:'Adults', assets:[]
  };
  assert.ok(validateProductInput(input).includes('assets_required'));
});

test('scene plan locks duration and aspect', () => {
  const scene = {
    schemaVersion: SCHEMA_VERSION, sceneId:'s1', index:1, role:'HOOK', durationSeconds:6, aspectRatio:'16:9',
    primaryObjective:'Pick up', dialogue:'Test', startState:{productState:{},propState:{},heldBy:'NONE',productOrientation:'FRONT',productPosition:'TABLE'},
    actions:[{action:'PICK_UP',objective:'Pick up',complexity:1}],
    endState:{productState:{},propState:{},heldBy:'RIGHT_HAND',productOrientation:'FRONT',productPosition:'CENTER'}, requiredAssetIds:['a1']
  } as unknown as ScenePlan;
  const issues = validateScenePlan(scene);
  assert.ok(issues.includes('duration_must_be_8'));
  assert.ok(issues.includes('aspect_must_be_9_16'));
});

test('golden fixture fails closed without verified truth and real references', () => {
  const fixture: GoldenProductFixture = {
    schemaVersion: SCHEMA_VERSION,
    fixtureId: 'bottle-pending',
    archetype: 'BOTTLE',
    productTruth: {
      verificationStatus: 'PENDING_REAL_REFERENCES',
      allowedClaims: [],
      prohibitedInferences: ['All product claims']
    },
    expectedReferenceRoles: ['PRODUCT_FRONT'],
    referenceAssets: [],
    physicalRiskNotes: ['Grip and label fidelity require empirical review.']
  };
  const issues = validateGoldenProductFixture(fixture);
  assert.ok(issues.includes('product_truth_unverified'));
  assert.ok(issues.includes('real_reference_assets_required'));
  assert.ok(issues.includes('missing_reference_role:PRODUCT_FRONT'));
});

test('generated references cannot satisfy golden fixture evidence', () => {
  const fixture: GoldenProductFixture = {
    schemaVersion: SCHEMA_VERSION,
    fixtureId: 'bottle-generated',
    archetype: 'BOTTLE',
    productTruth: {
      verificationStatus: 'VERIFIED',
      productId: 'product-1',
      name: 'Verified bottle',
      identityDescription: 'Verified only for validation coverage.',
      allowedClaims: [],
      prohibitedInferences: ['No unsupported claims']
    },
    expectedReferenceRoles: ['PRODUCT_FRONT'],
    referenceAssets: [{
      schemaVersion: SCHEMA_VERSION,
      assetId: 'generated-front',
      role: 'PRODUCT_FRONT',
      source: 'GENERATED',
      mimeType: 'image/png',
      sha256: 'validation-only-hash',
      providerBindings: {}
    }],
    physicalRiskNotes: []
  };
  assert.ok(validateGoldenProductFixture(fixture).includes('reference_must_be_real_upload:generated-front'));
});
