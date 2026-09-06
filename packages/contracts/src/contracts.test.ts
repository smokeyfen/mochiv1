import test from 'node:test';
import assert from 'node:assert/strict';
import type { AssetRef, AssetRole, BenchmarkObservation, GoldenProductFixture, MochiProjectInput, ProductEvidence, ProductInput, ScenePlan } from './index.ts';
import {
  BENCHMARK_DIMENSIONS,
  RUBRIC_0,
  RUBRIC_0_VERSION,
  SCHEMA_VERSION,
  deriveBenchmarkVerdict,
  validateBenchmarkObservation,
  validateGoldenProductFixture,
  validateMochiProjectInput,
  validateProductEvidence,
  validateProductInput,
  validateScenePlan
} from './index.ts';

test('product input rejects missing assets', () => {
  const input: ProductInput = {
    schemaVersion: SCHEMA_VERSION, productId:'p1', name:'Bottle', details:'Test', category:'Beauty', assets:[]
  };
  assert.ok(validateProductInput(input).includes('assets_required'));
});

test('generic PRODUCT_REFERENCE accepts one or many arbitrary product images', () => {
  const asset = (assetId: string): AssetRef => ({
    schemaVersion: SCHEMA_VERSION,
    assetId,
    role: 'PRODUCT_REFERENCE',
    source: 'UPLOAD',
    mimeType: 'image/jpeg'
  });
  const oneReference: ProductInput = {
    schemaVersion: SCHEMA_VERSION, productId: 'p1', name: 'Bottle', details: 'Test', category: 'Beauty', assets: [asset('reference-1')]
  };
  const manyReferences: ProductInput = { ...oneReference, assets: [asset('reference-1'), asset('reference-2'), asset('reference-3')] };
  assert.deepEqual(validateProductInput(oneReference), []);
  assert.deepEqual(validateProductInput(manyReferences), []);
});

test('generic references do not require front, side, or back coverage and existing roles remain valid', () => {
  const roles: readonly AssetRole[] = [
    'PRODUCT_REFERENCE', 'PRODUCT_FRONT', 'PRODUCT_SIDE', 'PRODUCT_BACK', 'PRODUCT_IN_HAND',
    'HAND_REFERENCE', 'ENVIRONMENT_REFERENCE', 'FIRST_FRAME', 'LAST_FRAME'
  ];
  for (const role of roles) {
    const input: ProductInput = {
      schemaVersion: SCHEMA_VERSION, productId: `p-${role}`, name: 'Bottle', details: 'Test', category: 'Beauty',
      assets: [{ schemaVersion: SCHEMA_VERSION, assetId: `asset-${role}`, role, source: 'UPLOAD', mimeType: 'image/jpeg' }]
    };
    assert.deepEqual(validateProductInput(input), []);
  }
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

const validProductEvidence = (product: ProductInput): ProductEvidence => ({
  schemaVersion: SCHEMA_VERSION,
  productId: product.productId,
  canonicalAssetIds: product.assets.map(asset => asset.assetId),
  identityDescription: 'A factual product identity description.',
  geometryNotes: ['A visible cylindrical form.'],
  colorNotes: ['A visible light color.'],
  packagingNotes: ['A visible capped package.'],
  labelNotes: ['A visible label.'],
  claims: [{ claimId: 'claim-1', text: 'User supplied product name.', source: 'USER_INPUT', evidenceAssetIds: [], allowed: true }],
  prohibitedInferences: ['No efficacy inference.'],
  uncertainties: [],
  contradictions: []
});

const validBenchmarkObservation = (): BenchmarkObservation => ({
  schemaVersion: SCHEMA_VERSION,
  rubricVersion: RUBRIC_0_VERSION,
  observationId: 'observation-1',
  benchmarkCaseId: 'case-1',
  fixtureId: 'fixture-1',
  archetype: 'BOTTLE',
  actionId: 'PICK_UP',
  evidenceOrigin: 'REAL_MODEL_VIDEO',
  candidateAssetId: 'candidate-1',
  reviewerId: 'reviewer-1',
  reviewedAt: '2026-09-06T00:00:00.000Z',
  dimensions: BENCHMARK_DIMENSIONS.map(dimension => ({ dimension, passed: true, critical: true, notes: 'Visible pass.' })),
  verdict: 'PASS',
  reviewerNotes: 'Human review fixture only.'
});

test('Rubric-0 covers every existing benchmark dimension', () => {
  assert.equal(RUBRIC_0.version, RUBRIC_0_VERSION);
  assert.deepEqual(RUBRIC_0.dimensions.map(definition => definition.dimension), BENCHMARK_DIMENSIONS);
  assert.ok(RUBRIC_0.dimensions.every(definition => definition.passCriteria.length > 0 && definition.failExamples.length > 0));
});

test('a fully passing Rubric-0 observation derives PASS', () => {
  const observation = validBenchmarkObservation();
  assert.equal(deriveBenchmarkVerdict(observation.dimensions), 'PASS');
  assert.deepEqual(validateBenchmarkObservation(observation), []);
});

test('any single required Rubric-0 dimension failure derives FAIL', () => {
  for (const failedDimension of BENCHMARK_DIMENSIONS) {
    const observation = validBenchmarkObservation();
    observation.dimensions = observation.dimensions.map(result =>
      result.dimension === failedDimension ? { ...result, passed: false, notes: 'Observed failure.' } : result
    );
    observation.verdict = 'FAIL';
    assert.equal(deriveBenchmarkVerdict(observation.dimensions), 'FAIL', failedDimension);
    assert.deepEqual(validateBenchmarkObservation(observation), [], failedDimension);
  }
});

test('missing or duplicate Rubric-0 dimensions are rejected', () => {
  const missing = validBenchmarkObservation();
  missing.dimensions = missing.dimensions.slice(1);
  missing.verdict = 'FAIL';
  assert.ok(validateBenchmarkObservation(missing).includes('missing_dimension:PRODUCT_FIDELITY'));

  const duplicate = validBenchmarkObservation();
  duplicate.dimensions = [...duplicate.dimensions, duplicate.dimensions[0]!];
  duplicate.verdict = 'FAIL';
  assert.ok(validateBenchmarkObservation(duplicate).includes('duplicate_dimension:PRODUCT_FIDELITY'));
});

test('wrong or missing Rubric-0 version and malformed dimension data are rejected', () => {
  const wrongVersion = validBenchmarkObservation();
  wrongVersion.rubricVersion = 'RUBRIC_1' as never;
  assert.ok(validateBenchmarkObservation(wrongVersion).includes('rubric_version'));

  const missingVersion = validBenchmarkObservation();
  missingVersion.rubricVersion = undefined as never;
  assert.ok(validateBenchmarkObservation(missingVersion).includes('rubric_version'));

  const malformed = validBenchmarkObservation();
  malformed.dimensions = [{ dimension: 'PRODUCT_FIDELITY', passed: true, critical: true, notes: '' }] as never;
  malformed.verdict = 'FAIL';
  assert.ok(validateBenchmarkObservation(malformed).includes('malformed_dimension_result'));
});

test('a manually supplied PASS cannot override a derived Rubric-0 FAIL', () => {
  const observation = validBenchmarkObservation();
  observation.dimensions = observation.dimensions.map(result =>
    result.dimension === 'PRODUCT_FIDELITY' ? { ...result, passed: false, notes: 'Wrong SKU.' } : result
  );
  assert.equal(deriveBenchmarkVerdict(observation.dimensions), 'FAIL');
  const issues = validateBenchmarkObservation(observation);
  assert.ok(issues.includes('verdict_inconsistent_with_rubric'));
  assert.ok(issues.includes('critical_failure_cannot_pass'));
});

test('product, hand, action, and physics failures cannot be marked PASS', () => {
  for (const failedDimension of ['PRODUCT_FIDELITY', 'HAND_ANATOMY', 'ACTION_COMPLETION', 'PHYSICS'] as const) {
    const observation = validBenchmarkObservation();
    observation.dimensions = observation.dimensions.map(result =>
      result.dimension === failedDimension ? { ...result, passed: false, notes: 'Critical review failure.' } : result
    );
    const issues = validateBenchmarkObservation(observation);
    assert.ok(issues.includes('verdict_inconsistent_with_rubric'), failedDimension);
    assert.ok(issues.includes('critical_failure_cannot_pass'), failedDimension);
  }
});

test('ProductEvidence fails closed for invalid logical provenance and structured entries', () => {
  const product = validProjectInput().product;
  const evidence = validProductEvidence(product);
  evidence.canonicalAssetIds = ['product-front', 'product-front', 'unknown'];
  evidence.identityDescription = ' ';
  evidence.geometryNotes = [''];
  evidence.claims = [
    { claimId: 'claim-1', text: '', source: 'REFERENCE_EVIDENCE', evidenceAssetIds: [], allowed: true },
    { claimId: 'claim-1', text: 'Duplicate claim', source: 'USER_INPUT', evidenceAssetIds: ['unknown'], allowed: false }
  ];
  evidence.uncertainties = [{ subject: '', assetIds: ['unknown'], reason: '' }];
  evidence.contradictions = [{ statements: ['Only one statement'], assetIds: ['unknown'], reason: '' }];
  const issues = validateProductEvidence(evidence, product);
  for (const issue of [
    'duplicate_canonical_asset:product-front', 'unknown_canonical_asset:unknown', 'identity_description',
    'blank_geometry_note', 'claim_text:claim-1', 'reference_claim_requires_evidence:claim-1',
    'duplicate_claim:claim-1', 'unknown_claim_asset:claim-1:unknown', 'uncertainty_subject',
    'unknown_uncertainty_asset:unknown', 'contradiction_statements', 'unknown_contradiction_asset:unknown'
  ]) assert.ok(issues.includes(issue));
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
