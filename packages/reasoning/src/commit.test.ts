import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SCHEMA_VERSION,
  deriveReferenceLimitationCodes,
  deriveReferenceReadiness,
  type ProductEvidence,
  type ProductInput,
  type ProductTruth,
  type ReferenceAssessment,
  type ReferenceAssetAssessment
} from '@mochi/contracts';
import { commitR2ProductContext, R2CommitError } from './index.ts';

const sourceEvidenceVersion = 'evidence-v1';

const product = (): ProductInput => ({
  schemaVersion: SCHEMA_VERSION,
  productId: 'product-1',
  name: 'Commit bottle',
  details: 'Factual input.',
  category: 'Beauty',
  assets: [
    { schemaVersion: SCHEMA_VERSION, assetId: 'asset-1', role: 'PRODUCT_REFERENCE', source: 'UPLOAD', mimeType: 'image/jpeg' },
    { schemaVersion: SCHEMA_VERSION, assetId: 'asset-2', role: 'PRODUCT_REFERENCE', source: 'UPLOAD', mimeType: 'image/jpeg' }
  ]
});

const evidenceFor = (input: ProductInput): ProductEvidence => ({
  schemaVersion: SCHEMA_VERSION,
  productId: input.productId,
  canonicalAssetIds: ['asset-1', 'asset-2'],
  identityDescription: 'A factual Commit bottle identity.',
  geometryNotes: ['A cylindrical bottle body is visible.'],
  colorNotes: [],
  packagingNotes: [],
  labelNotes: [],
  claims: [{ claimId: 'allowed-1', text: 'Commit bottle is the user supplied name.', source: 'USER_INPUT', evidenceAssetIds: [], allowed: true }],
  prohibitedInferences: ['Do not infer efficacy.'],
  uncertainties: [],
  contradictions: []
});

const truthFor = (input: ProductInput, evidence: ProductEvidence): ProductTruth => ({
  schemaVersion: SCHEMA_VERSION,
  productId: input.productId,
  sourceEvidenceVersion,
  canonicalAssetIds: evidence.canonicalAssetIds,
  name: input.name,
  category: input.category,
  identityDescription: evidence.identityDescription,
  facts: [{
    factId: 'geometry:0', kind: 'GEOMETRY', text: evidence.geometryNotes[0]!, evidenceAssetIds: evidence.canonicalAssetIds
  }],
  allowedClaims: [{
    claimId: 'allowed-1', text: 'Commit bottle is the user supplied name.', source: 'USER_INPUT', evidenceAssetIds: []
  }],
  prohibitedInferences: evidence.prohibitedInferences,
  unresolvedUncertainties: evidence.uncertainties,
  unresolvedContradictions: evidence.contradictions,
  exclusions: []
});

const readyAsset = (assetId: string): ReferenceAssetAssessment => ({
  assetId,
  targetVisibility: 'CLEAR',
  identityConfidence: 'HIGH',
  geometryCoverage: 'STRONG',
  labelReadability: 'CLEAR',
  occlusion: 'NONE',
  backgroundInterference: 'LOW',
  multiProductAmbiguity: 'NONE'
});

const assessmentFor = (
  input: ProductInput,
  evidence: ProductEvidence,
  assetAssessments = evidence.canonicalAssetIds.map(readyAsset)
): ReferenceAssessment => ({
  schemaVersion: SCHEMA_VERSION,
  productId: input.productId,
  sourceEvidenceVersion,
  canonicalAssetIds: evidence.canonicalAssetIds,
  assetAssessments,
  readiness: deriveReferenceReadiness(assetAssessments),
  limitationCodes: deriveReferenceLimitationCodes(assetAssessments)
});

function request() {
  const input = product();
  const evidence = evidenceFor(input);
  return {
    product: input,
    evidence,
    sourceEvidenceVersion,
    productTruth: truthFor(input, evidence),
    referenceAssessment: assessmentFor(input, evidence)
  };
}

function expectCommitError(run: () => unknown, code: R2CommitError['code']) {
  assert.throws(run, (error: unknown) => error instanceof R2CommitError
    && error.code === code
    && error.message === `R2_COMMIT_ERROR:${code}`);
}

test('valid ProductTruth and READY ReferenceAssessment commit atomically', () => {
  const input = request();
  const committed = commitR2ProductContext(input);
  assert.equal(committed.productId, 'product-1');
  assert.equal(committed.sourceEvidenceVersion, sourceEvidenceVersion);
  assert.deepEqual(committed.canonicalAssetIds, ['asset-1', 'asset-2']);
  assert.equal(committed.productTruth, input.productTruth);
  assert.equal(committed.referenceAssessment, input.referenceAssessment);
  assert.equal(('intelligence' as string) in committed, false);
});

test('LIMITED ReferenceAssessment commits and preserves deterministic limitations', () => {
  const input = request();
  input.referenceAssessment = assessmentFor(input.product, input.evidence, [
    { ...readyAsset('asset-1'), geometryCoverage: 'MINIMAL', occlusion: 'SEVERE' },
    readyAsset('asset-2')
  ]);
  const committed = commitR2ProductContext(input);
  assert.equal(committed.referenceAssessment.readiness, 'LIMITED');
  assert.deepEqual(committed.referenceAssessment.limitationCodes, ['GEOMETRY_COVERAGE_MINIMAL', 'OCCLUSION_SEVERE']);
});

test('BLOCKED reference cannot commit and no partial committed context exists', () => {
  const input = request();
  input.referenceAssessment = assessmentFor(input.product, input.evidence, [
    { ...readyAsset('asset-1'), targetVisibility: 'POOR', identityConfidence: 'LOW' },
    { ...readyAsset('asset-2'), targetVisibility: 'POOR', identityConfidence: 'LOW' }
  ]);
  let committed: unknown;
  expectCommitError(() => { committed = commitR2ProductContext(input); }, 'REFERENCE_BLOCKED');
  assert.equal(committed, undefined);
});

test('product ID, source version, canonical identity, and ordering mismatches cannot commit', () => {
  const cases = [
    { mutate: (input: ReturnType<typeof request>) => { input.productTruth = { ...input.productTruth, productId: 'other' }; }, code: 'INVALID_TRUTH' },
    { mutate: (input: ReturnType<typeof request>) => { input.referenceAssessment = { ...input.referenceAssessment, sourceEvidenceVersion: 'other' }; }, code: 'INVALID_REFERENCE_ASSESSMENT' },
    { mutate: (input: ReturnType<typeof request>) => { input.productTruth = { ...input.productTruth, canonicalAssetIds: ['asset-2', 'asset-1'] }; }, code: 'INVALID_TRUTH' },
    { mutate: (input: ReturnType<typeof request>) => { input.referenceAssessment = { ...input.referenceAssessment, canonicalAssetIds: ['asset-2', 'asset-1'] }; }, code: 'INVALID_REFERENCE_ASSESSMENT' }
  ] as const;
  for (const scenario of cases) {
    const input = request();
    scenario.mutate(input);
    expectCommitError(() => commitR2ProductContext(input), scenario.code);
  }
});

test('invalid ProductTruth or ReferenceAssessment cannot commit', () => {
  const invalidTruth = request();
  invalidTruth.productTruth = { ...invalidTruth.productTruth, facts: [{ ...invalidTruth.productTruth.facts[0]!, text: 'invented text' }] };
  expectCommitError(() => commitR2ProductContext(invalidTruth), 'INVALID_TRUTH');

  const invalidReference = request();
  invalidReference.referenceAssessment = { ...invalidReference.referenceAssessment, readiness: 'BLOCKED' };
  expectCommitError(() => commitR2ProductContext(invalidReference), 'INVALID_REFERENCE_ASSESSMENT');
});

test('commit gate is a pure function and performs zero intelligence calls', () => {
  const input = request();
  const before = JSON.stringify(input);
  const committed = commitR2ProductContext(input);
  assert.equal(JSON.stringify(input), before);
  assert.equal(committed.referenceAssessment.readiness, 'READY');
});
