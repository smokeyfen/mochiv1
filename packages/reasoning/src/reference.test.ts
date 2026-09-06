import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SCHEMA_VERSION,
  deriveReferenceLimitationCodes,
  deriveReferenceReadiness,
  validateReferenceAssessment,
  type ProductEvidence,
  type ProductInput,
  type ReferenceAssessment,
  type ReferenceAssetAssessment
} from '@mochi/contracts';
import {
  IntelligenceProviderError,
  type IntelligenceMediaInput,
  type IntelligenceProvider,
  type StructuredIntelligenceRequest
} from '@mochi/providers';
import {
  analyzeReferenceAssessment,
  buildReferenceAssessmentDecisionSchema,
  ReferenceAssessmentError,
  type ReferenceAssessmentDecision
} from './index.ts';

const sourceEvidenceVersion = 'evidence-v1';

const product = (): ProductInput => ({
  schemaVersion: SCHEMA_VERSION,
  productId: 'product-1',
  name: 'Reference bottle',
  details: 'Factual user input.',
  category: 'Beauty',
  assets: [
    { schemaVersion: SCHEMA_VERSION, assetId: 'asset-a', role: 'PRODUCT_REFERENCE', source: 'UPLOAD', mimeType: 'image/jpeg' },
    { schemaVersion: SCHEMA_VERSION, assetId: 'asset-b', role: 'PRODUCT_REFERENCE', source: 'UPLOAD', mimeType: 'image/png' }
  ]
});

const evidenceFor = (input: ProductInput): ProductEvidence => ({
  schemaVersion: SCHEMA_VERSION,
  productId: input.productId,
  canonicalAssetIds: ['asset-b', 'asset-a'],
  identityDescription: 'A reference bottle.',
  geometryNotes: ['A bottle body is visible.'],
  colorNotes: [],
  packagingNotes: [],
  labelNotes: [],
  claims: [],
  prohibitedInferences: ['Do not infer efficacy.'],
  uncertainties: [],
  contradictions: []
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

const decisionFor = (input: ProductInput, evidence: ProductEvidence): ReferenceAssessmentDecision => ({
  schemaVersion: SCHEMA_VERSION,
  productId: input.productId,
  sourceEvidenceVersion,
  canonicalAssetIds: evidence.canonicalAssetIds,
  assetAssessments: evidence.canonicalAssetIds.map(readyAsset)
});

const mediaFor = (evidence: ProductEvidence): readonly IntelligenceMediaInput[] => evidence.canonicalAssetIds.map(assetId => ({
  assetId,
  mimeType: assetId === 'asset-a' ? 'image/jpeg' : 'image/png',
  dataBase64: `base64-${assetId}`
}));

function stubProvider(output: unknown, failure?: unknown) {
  const requests: StructuredIntelligenceRequest<unknown>[] = [];
  const provider: IntelligenceProvider = {
    id: 'mock-intelligence',
    async analyzeStructured<T>(request: StructuredIntelligenceRequest<T>) {
      requests.push(request as StructuredIntelligenceRequest<unknown>);
      if (failure !== undefined) throw failure;
      return { data: request.parse(output) };
    }
  };
  return { provider, requests };
}

async function expectAssessmentError(promise: Promise<unknown>, code: ReferenceAssessmentError['code']) {
  await assert.rejects(promise, (error: unknown) => error instanceof ReferenceAssessmentError
    && error.code === code
    && error.message === `REFERENCE_ASSESSMENT_ERROR:${code}`);
}

test('valid canonical media and enum decision produce a complete deterministic READY assessment', async () => {
  const input = product();
  const evidence = evidenceFor(input);
  const { provider } = stubProvider(decisionFor(input, evidence));
  const result = await analyzeReferenceAssessment({
    product: input, evidence, sourceEvidenceVersion, media: mediaFor(evidence), intelligence: provider
  });

  assert.equal(result.productId, input.productId);
  assert.equal(result.sourceEvidenceVersion, sourceEvidenceVersion);
  assert.deepEqual(result.canonicalAssetIds, ['asset-b', 'asset-a']);
  assert.deepEqual(result.assetAssessments.map(item => item.assetId), ['asset-b', 'asset-a']);
  assert.equal(result.readiness, 'READY');
  assert.deepEqual(result.limitationCodes, []);
  assert.deepEqual(validateReferenceAssessment(result, input, evidence, sourceEvidenceVersion), []);
});

test('LIMITED and BLOCKED readiness plus limitation codes are derived locally', async () => {
  const input = product();
  const evidence = evidenceFor(input);
  const limited = decisionFor(input, evidence);
  limited.assetAssessments = [
    { ...readyAsset('asset-b'), geometryCoverage: 'MINIMAL', occlusion: 'SEVERE', multiProductAmbiguity: 'HIGH' },
    readyAsset('asset-a')
  ];
  const limitedProvider = stubProvider(limited);
  const limitedResult = await analyzeReferenceAssessment({
    product: input, evidence, sourceEvidenceVersion, media: mediaFor(evidence), intelligence: limitedProvider.provider
  });
  assert.equal(limitedResult.readiness, 'LIMITED');
  assert.deepEqual(limitedResult.limitationCodes, [
    'GEOMETRY_COVERAGE_MINIMAL', 'OCCLUSION_SEVERE', 'MULTI_PRODUCT_AMBIGUITY_HIGH'
  ]);

  const blocked = decisionFor(input, evidence);
  blocked.assetAssessments = [
    { ...readyAsset('asset-b'), targetVisibility: 'POOR', identityConfidence: 'LOW' },
    { ...readyAsset('asset-a'), targetVisibility: 'POOR', identityConfidence: 'LOW' }
  ];
  const blockedProvider = stubProvider(blocked);
  const blockedResult = await analyzeReferenceAssessment({
    product: input, evidence, sourceEvidenceVersion, media: mediaFor(evidence), intelligence: blockedProvider.provider
  });
  assert.equal(blockedResult.readiness, 'BLOCKED');
  assert.deepEqual(blockedResult.limitationCodes, ['TARGET_VISIBILITY_POOR', 'IDENTITY_CONFIDENCE_LOW']);
});

test('schema constrains exact source invariants and enum-only assessments', () => {
  const input = product();
  const evidence = evidenceFor(input);
  const schema = buildReferenceAssessmentDecisionSchema({ product: input, evidence, sourceEvidenceVersion });
  assert.deepEqual(schema.properties.productId.enum, ['product-1']);
  assert.deepEqual(schema.properties.sourceEvidenceVersion.enum, [sourceEvidenceVersion]);
  assert.deepEqual(schema.properties.canonicalAssetIds.enum, [['asset-b', 'asset-a']]);
  assert.deepEqual(schema.properties.assetAssessments.items.properties.assetId.enum, ['asset-b', 'asset-a']);
  assert.deepEqual(schema.properties.assetAssessments.items.properties.targetVisibility.enum, ['CLEAR', 'PARTIAL', 'POOR']);
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.assetAssessments.items.additionalProperties, false);
});

test('model cannot author product fact prose into final ReferenceAssessment', async () => {
  const input = product();
  const evidence = evidenceFor(input);
  const decision = { ...decisionFor(input, evidence), inventedSummary: 'This is an invented fact.' };
  const { provider } = stubProvider(decision);
  const result = await analyzeReferenceAssessment({
    product: input, evidence, sourceEvidenceVersion, media: mediaFor(evidence), intelligence: provider
  });
  assert.equal('inventedSummary' in result, false);
  assert.doesNotMatch(JSON.stringify(result), /invented fact|summary/i);
});

test('duplicate, missing, unknown, invalid, and reordered asset assessments fail closed', async () => {
  const input = product();
  const evidence = evidenceFor(input);
  const base = decisionFor(input, evidence);
  const cases: readonly ReferenceAssessmentDecision[] = [
    { ...base, assetAssessments: [readyAsset('asset-b'), readyAsset('asset-b')] },
    { ...base, assetAssessments: [readyAsset('asset-b')] },
    { ...base, assetAssessments: [readyAsset('asset-b'), readyAsset('unknown')] },
    { ...base, assetAssessments: [readyAsset('asset-a'), readyAsset('asset-b')] },
    { ...base, assetAssessments: [{ ...readyAsset('asset-b'), targetVisibility: 'INVENTED' as never }, readyAsset('asset-a')] }
  ];
  for (const decision of cases) {
    const { provider } = stubProvider(decision);
    await expectAssessmentError(analyzeReferenceAssessment({
      product: input, evidence, sourceEvidenceVersion, media: mediaFor(evidence), intelligence: provider
    }), 'INVALID_MODEL_OUTPUT');
  }
});

test('missing, duplicate, noncanonical, and invalid canonical media fail before intelligence', async () => {
  const input = product();
  const evidence = evidenceFor(input);
  const cases: readonly { media: readonly IntelligenceMediaInput[]; code: ReferenceAssessmentError['code'] }[] = [
    { media: [], code: 'MISSING_MEDIA' },
    { media: [mediaFor(evidence)[0]!], code: 'MISSING_MEDIA' },
    { media: [mediaFor(evidence)[0]!, mediaFor(evidence)[0]!], code: 'INVALID_MEDIA' },
    { media: [{ assetId: 'unknown', mimeType: 'image/jpeg', dataBase64: 'bytes' }, mediaFor(evidence)[1]!], code: 'INVALID_MEDIA' },
    { media: [{ ...mediaFor(evidence)[0]!, mimeType: 'video/mp4' }, mediaFor(evidence)[1]!], code: 'INVALID_MEDIA' },
    { media: [{ ...mediaFor(evidence)[0]!, dataBase64: ' ' }, mediaFor(evidence)[1]!], code: 'INVALID_MEDIA' }
  ];
  for (const scenario of cases) {
    const stub = stubProvider(decisionFor(input, evidence));
    await expectAssessmentError(analyzeReferenceAssessment({
      product: input, evidence, sourceEvidenceVersion, media: scenario.media, intelligence: stub.provider
    }), scenario.code);
    assert.equal(stub.requests.length, 0);
  }
});

test('invalid evidence and source version fail before intelligence', async () => {
  const input = product();
  const evidence = evidenceFor(input);
  const invalid = { ...evidence, canonicalAssetIds: ['unknown'] };
  const first = stubProvider(decisionFor(input, evidence));
  await expectAssessmentError(analyzeReferenceAssessment({
    product: input, evidence: invalid, sourceEvidenceVersion, media: mediaFor(evidence), intelligence: first.provider
  }), 'INVALID_EVIDENCE');
  assert.equal(first.requests.length, 0);

  const second = stubProvider(decisionFor(input, evidence));
  await expectAssessmentError(analyzeReferenceAssessment({
    product: input, evidence, sourceEvidenceVersion: ' ', media: mediaFor(evidence), intelligence: second.provider
  }), 'INVALID_SOURCE_VERSION');
  assert.equal(second.requests.length, 0);
});

test('request contains only canonical media and keeps policy separate from untrusted input', async () => {
  const input = product();
  const evidence = evidenceFor(input);
  const stub = stubProvider(decisionFor(input, evidence));
  await analyzeReferenceAssessment({
    product: input, evidence, sourceEvidenceVersion, media: mediaFor(evidence), intelligence: stub.provider
  });
  const request = stub.requests[0]!;
  assert.deepEqual(request.media.map(item => item.assetId), ['asset-b', 'asset-a']);
  assert.match(request.instruction, /REFERENCE ASSESSMENT RULES/);
  assert.match(request.inputText ?? '', /REFERENCE_ASSESSMENT_INPUT_JSON:/);
  assert.doesNotMatch(request.instruction, /Reference bottle|asset-a|Beauty/);
  assert.doesNotMatch(request.inputText ?? '', /audience|shootingContext|reviewerPersona|voiceGender|voiceRegion|dataBase64|base64-|GEMINI_API_KEY|mediaId|bearer|session/i);
  assert.equal(('creativeDirection' as string) in request, false);
});

test('malformed and provider failures are normalized safely', async () => {
  const input = product();
  const evidence = evidenceFor(input);
  const malformed = stubProvider({ assetAssessments: [] });
  await expectAssessmentError(analyzeReferenceAssessment({
    product: input, evidence, sourceEvidenceVersion, media: mediaFor(evidence), intelligence: malformed.provider
  }), 'INVALID_MODEL_OUTPUT');

  const generic = stubProvider(decisionFor(input, evidence), new Error('raw provider request detail'));
  await expectAssessmentError(analyzeReferenceAssessment({
    product: input, evidence, sourceEvidenceVersion, media: mediaFor(evidence), intelligence: generic.provider
  }), 'PROVIDER_FAILURE');

  const normalized = new IntelligenceProviderError('RATE_LIMIT', true);
  const provider = stubProvider(decisionFor(input, evidence), normalized);
  await assert.rejects(analyzeReferenceAssessment({
    product: input, evidence, sourceEvidenceVersion, media: mediaFor(evidence), intelligence: provider.provider
  }), (error: unknown) => error === normalized && error instanceof IntelligenceProviderError && error.code === 'RATE_LIMIT');
});

test('contract derivations reject caller-supplied readiness or limitation mutations', () => {
  const assessments = [readyAsset('asset-a')];
  assert.equal(deriveReferenceReadiness(assessments), 'READY');
  assert.deepEqual(deriveReferenceLimitationCodes(assessments), []);
  const input = product();
  const evidence = { ...evidenceFor(input), canonicalAssetIds: ['asset-a'] };
  const candidate: ReferenceAssessment = {
    schemaVersion: SCHEMA_VERSION,
    productId: input.productId,
    sourceEvidenceVersion,
    canonicalAssetIds: ['asset-a'],
    assetAssessments: assessments,
    readiness: 'BLOCKED',
    limitationCodes: ['OCCLUSION_SEVERE']
  };
  const issues = validateReferenceAssessment(candidate, input, evidence, sourceEvidenceVersion);
  assert.ok(issues.includes('readiness_mismatch'));
  assert.ok(issues.includes('limitation_codes_mismatch'));
});
