import test from 'node:test';
import assert from 'node:assert/strict';
import type { AssetRef, GoldenProductFixture, MochiProjectInput, ProductInput, ScenePlan } from './index.ts';
import {
  SCHEMA_VERSION,
  validateGoldenProductFixture,
  validateMochiProjectInput,
  validateProductInput,
  validateScenePlan
} from './index.ts';

test('product input rejects missing assets', () => {
  const input: ProductInput = {
    schemaVersion: SCHEMA_VERSION, productId:'p1', name:'Bottle', details:'Test', category:'Beauty', assets:[]
  };
  assert.ok(validateProductInput(input).includes('assets_required'));
});

const validProjectInput = (): MochiProjectInput => ({
  schemaVersion: SCHEMA_VERSION,
  projectId: 'project-1',
  product: {
    schemaVersion: SCHEMA_VERSION,
    productId: 'product-1',
    name: 'Verified bottle',
    details: 'A factual product description.',
    category: 'Beauty',
    assets: [{
      schemaVersion: SCHEMA_VERSION,
      assetId: 'product-front',
      role: 'PRODUCT_FRONT',
      source: 'UPLOAD',
      mimeType: 'image/jpeg'
    }]
  },
  creativeDirection: {
    audience: 'Adults shopping for skincare',
    shootingContext: 'Natural daylight vanity review',
    reviewerPersona: 'Practical on-hand reviewer',
    tone: 'Warm and factual',
    voiceStyle: 'Conversational Vietnamese',
    voiceGender: 'FEMALE',
    voiceRegion: 'SOUTH'
  }
});

test('canonical Mochi project input accepts valid separate product and creative concerns', () => {
  assert.deepEqual(validateMochiProjectInput(validProjectInput()), []);
});

test('ProductInput validation propagates into project validation', () => {
  const project = validProjectInput();
  project.product = { ...project.product, assets: [] };
  assert.ok(validateMochiProjectInput(project).includes('assets_required'));
});

test('project validation rejects a missing ProductInput', () => {
  const project = validProjectInput();
  project.product = undefined as never;
  assert.ok(validateMochiProjectInput(project).includes('product_input'));
});

test('project validation rejects a blank project ID', () => {
  const project = validProjectInput();
  project.projectId = '   ';
  assert.ok(validateMochiProjectInput(project).includes('project_id'));
});

test('project validation rejects blank creative fields', () => {
  const project = validProjectInput();
  project.creativeDirection = {
    ...project.creativeDirection,
    audience: '',
    shootingContext: ' ',
    reviewerPersona: '',
    tone: ' ',
    voiceStyle: ''
  };
  const issues = validateMochiProjectInput(project);
  for (const issue of ['audience', 'shooting_context', 'reviewer_persona', 'tone', 'voice_style']) {
    assert.ok(issues.includes(issue));
  }
});

test('project validation accepts both supported voice genders and regions', () => {
  for (const voiceGender of ['MALE', 'FEMALE'] as const) {
    for (const voiceRegion of ['SOUTH', 'NORTH'] as const) {
      const project = validProjectInput();
      project.creativeDirection = { ...project.creativeDirection, voiceGender, voiceRegion };
      assert.deepEqual(validateMochiProjectInput(project), []);
    }
  }
});

test('project validation rejects unsupported voice gender and region', () => {
  const project = validProjectInput();
  project.creativeDirection = {
    ...project.creativeDirection,
    voiceGender: 'OTHER' as never,
    voiceRegion: 'CENTRAL' as never
  };
  const issues = validateMochiProjectInput(project);
  assert.ok(issues.includes('voice_gender'));
  assert.ok(issues.includes('voice_region'));
});

test('canonical project input contains no provider-specific identifier fields', () => {
  const project = validProjectInput();
  assert.deepEqual(Object.keys(project).sort(), ['creativeDirection', 'product', 'projectId', 'schemaVersion']);
  assert.deepEqual(Object.keys(project.product).sort(), [
    'assets', 'category', 'details', 'name', 'productId', 'schemaVersion'
  ]);
  assert.deepEqual(Object.keys(project.creativeDirection).sort(), [
    'audience', 'reviewerPersona', 'shootingContext', 'tone', 'voiceGender', 'voiceRegion', 'voiceStyle'
  ]);
});

test('core asset reference requires no provider-specific binding', () => {
  const asset: AssetRef = {
    schemaVersion: SCHEMA_VERSION,
    assetId: 'product-front',
    role: 'PRODUCT_FRONT',
    source: 'UPLOAD',
    mimeType: 'image/jpeg',
    sha256: 'logical-content-hash',
    viewAngle: 'front',
    qualityScore: 1
  };
  assert.equal('providerBindings' in asset, false);
  assert.deepEqual(Object.keys(asset).sort(), [
    'assetId', 'mimeType', 'qualityScore', 'role', 'schemaVersion', 'sha256', 'source', 'viewAngle'
  ]);
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
      sha256: 'validation-only-hash'
    }],
    physicalRiskNotes: []
  };
  assert.ok(validateGoldenProductFixture(fixture).includes('reference_must_be_real_upload:generated-front'));
});
