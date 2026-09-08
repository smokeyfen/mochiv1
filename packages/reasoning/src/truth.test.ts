import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SCHEMA_VERSION,
  buildProductTruthCandidateFacts,
  validateProductTruth,
  type ProductEvidence,
  type ProductInput
} from '@mochi/contracts';
import {
  IntelligenceProviderError,
  type IntelligenceProvider,
  type StructuredIntelligenceRequest
} from '@mochi/providers';
import {
  analyzeProductTruth,
  buildProductTruthDecisionSchema,
  buildProductTruthInputText,
  ProductTruthError,
  type ProductTruthDecision
} from './index.ts';

const sourceEvidenceVersion = 'product-evidence-v1';

const product = (): ProductInput => ({
  schemaVersion: SCHEMA_VERSION,
  productId: 'cocoon-serum',
  name: 'Cocoon turmeric serum',
  details: 'User-supplied bottle details.',
  category: 'Beauty',
  assets: [
    { schemaVersion: SCHEMA_VERSION, assetId: 'reference-1', role: 'PRODUCT_REFERENCE', source: 'UPLOAD', mimeType: 'image/jpeg' },
    { schemaVersion: SCHEMA_VERSION, assetId: 'reference-2', role: 'PRODUCT_REFERENCE', source: 'UPLOAD', mimeType: 'image/jpeg' }
  ]
});

const evidenceFor = (input: ProductInput): ProductEvidence => ({
  schemaVersion: SCHEMA_VERSION,
  productId: input.productId,
  canonicalAssetIds: input.assets.map(asset => asset.assetId),
  identityDescription: 'A cylindrical Cocoon turmeric serum bottle.',
  geometryNotes: ['The bottle has a tall cylindrical body.', 'A small cap is visible.'],
  colorNotes: ['The package is predominantly yellow.'],
  packagingNotes: ['The bottle is presented as a capped retail package.'],
  labelNotes: ['A Cocoon label is visible.'],
  claims: [
    { claimId: 'claim-allowed', text: 'The product is named Cocoon turmeric serum.', source: 'USER_INPUT', evidenceAssetIds: [], allowed: true },
    { claimId: 'claim-blocked', text: 'The serum improves skin.', source: 'USER_INPUT', evidenceAssetIds: [], allowed: false }
  ],
  prohibitedInferences: ['Do not infer efficacy from appearance.'],
  uncertainties: [{ subject: 'Fine label wording', assetIds: ['reference-1'], reason: 'The text is too small to read.' }],
  contradictions: [{
    statements: ['Reference one looks pale yellow.', 'Reference two looks darker yellow.'],
    assetIds: ['reference-1', 'reference-2'],
    reason: 'Lighting differs between references.'
  }]
});

const completeDecision = (input: ProductInput, evidence: ProductEvidence): ProductTruthDecision => ({
  schemaVersion: SCHEMA_VERSION,
  productId: input.productId,
  sourceEvidenceVersion,
  canonicalAssetIds: evidence.canonicalAssetIds,
  retainedFactIds: buildProductTruthCandidateFacts(evidence).map(fact => fact.factId),
  exclusions: []
});

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

async function expectTruthError(promise: Promise<unknown>, code: ProductTruthError['code']) {
  await assert.rejects(promise, (error: unknown) => error instanceof ProductTruthError
    && error.code === code
    && error.message === `PRODUCT_TRUTH_ERROR:${code}`);
}

test('valid evidence and complete decision compile a deterministic ProductTruth', async () => {
  const input = product();
  const evidence = evidenceFor(input);
  const { provider } = stubProvider(completeDecision(input, evidence));
  const truth = await analyzeProductTruth({ product: input, evidence, sourceEvidenceVersion, intelligence: provider });

  assert.equal(truth.productId, input.productId);
  assert.equal(truth.sourceEvidenceVersion, sourceEvidenceVersion);
  assert.deepEqual(truth.canonicalAssetIds, evidence.canonicalAssetIds);
  assert.equal(truth.name, input.name);
  assert.equal(truth.category, input.category);
  assert.equal(truth.identityDescription, evidence.identityDescription);
  assert.deepEqual(truth.facts, buildProductTruthCandidateFacts(evidence).slice(1));
  assert.deepEqual(truth.allowedClaims, [{
    claimId: 'claim-allowed', text: 'The product is named Cocoon turmeric serum.', source: 'USER_INPUT', evidenceAssetIds: []
  }]);
  assert.deepEqual(truth.prohibitedInferences, evidence.prohibitedInferences);
  assert.deepEqual(truth.unresolvedUncertainties, evidence.uncertainties);
  assert.deepEqual(truth.unresolvedContradictions, evidence.contradictions);
  assert.deepEqual(validateProductTruth(truth, input, evidence, sourceEvidenceVersion), []);
});

test('an uncertain or contradicted candidate may be excluded while retained text stays exact', async () => {
  const input = product();
  const evidence = evidenceFor(input);
  const decision = completeDecision(input, evidence);
  decision.retainedFactIds = decision.retainedFactIds.filter(id => id !== 'geometry:1' && id !== 'packaging:0');
  decision.exclusions = [
    { factId: 'geometry:1', reason: 'UNCERTAIN' },
    { factId: 'packaging:0', reason: 'CONTRADICTED' }
  ];
  const { provider } = stubProvider(decision);
  const truth = await analyzeProductTruth({ product: input, evidence, sourceEvidenceVersion, intelligence: provider });

  assert.equal(truth.facts.some(fact => fact.factId === 'geometry:1'), false);
  assert.equal(truth.facts.some(fact => fact.factId === 'packaging:0'), false);
  assert.deepEqual(truth.exclusions, decision.exclusions);
  assert.equal(truth.facts[0]?.text, evidence.geometryNotes[0]);
});

test('Product Truth preserves composition uncertainty without turning it into a material fact', async () => {
  const input = product();
  const evidence = { ...evidenceFor(input), geometryNotes: ['A ribbed or folded body structure is visible.'], uncertainties: [{ subject: 'Material composition', assetIds: ['reference-1'], reason: 'Appearance does not establish material.' }] };
  const { provider } = stubProvider(completeDecision(input, evidence));
  const truth = await analyzeProductTruth({ product: input, evidence, sourceEvidenceVersion, intelligence: provider });
  assert.deepEqual(truth.facts.map(fact => fact.text), ['A ribbed or folded body structure is visible.', 'The package is predominantly yellow.', 'The bottle is presented as a capped retail package.', 'A Cocoon label is visible.']);
  assert.deepEqual(truth.unresolvedUncertainties, evidence.uncertainties);
  assert.doesNotMatch(JSON.stringify(truth), /paper|cardboard|bamboo|wood/i);
});

test('Product Truth has no Creative Direction input and is unchanged by browser-only creative controls', async () => {
  const input = product();
  const evidence = evidenceFor(input);
  const { provider, requests } = stubProvider(completeDecision(input, evidence));
  const truth = await analyzeProductTruth({ product: input, evidence, sourceEvidenceVersion, intelligence: provider });
  assert.equal('creativeDirection' in ({ product: input, evidence, sourceEvidenceVersion }), false);
  assert.doesNotMatch(buildProductTruthInputText({ product: input, evidence, sourceEvidenceVersion }), /audience|shootingContext|voiceGender|reviewerPersona|tone/i);
  assert.doesNotMatch(requests[0]?.inputText ?? '', /audience|shootingContext|voiceGender|reviewerPersona|tone/i);
  assert.equal(truth.identityDescription, evidence.identityDescription);
});

test('decision schema binds identity, version, assets, and candidate IDs to the exact source', () => {
  const input = product();
  const evidence = evidenceFor(input);
  const schema = buildProductTruthDecisionSchema({ product: input, evidence, sourceEvidenceVersion });
  assert.deepEqual(schema.properties.productId.enum, [input.productId]);
  assert.deepEqual(schema.properties.sourceEvidenceVersion.enum, [sourceEvidenceVersion]);
  assert.deepEqual(schema.properties.canonicalAssetIds.enum, [evidence.canonicalAssetIds]);
  assert.deepEqual(schema.properties.retainedFactIds.items.enum, buildProductTruthCandidateFacts(evidence).map(fact => fact.factId));
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.exclusions.items.additionalProperties, false);
});

test('the complete candidate partition rejects unknown, duplicate, overlap, and omitted IDs', async () => {
  const input = product();
  const evidence = evidenceFor(input);
  const cases: ProductTruthDecision[] = [
    { ...completeDecision(input, evidence), retainedFactIds: [...completeDecision(input, evidence).retainedFactIds, 'unknown'] },
    { ...completeDecision(input, evidence), retainedFactIds: [...completeDecision(input, evidence).retainedFactIds, 'geometry:0'] },
    { ...completeDecision(input, evidence), exclusions: [{ factId: 'geometry:0', reason: 'UNCERTAIN' }] },
    { ...completeDecision(input, evidence), retainedFactIds: completeDecision(input, evidence).retainedFactIds.slice(0, -1) },
    { ...completeDecision(input, evidence), exclusions: [{ factId: 'label:0', reason: 'UNCERTAIN' }, { factId: 'label:0', reason: 'CONTRADICTED' }] }
  ];
  for (const decision of cases) {
    const { provider } = stubProvider(decision);
    await expectTruthError(analyzeProductTruth({ product: input, evidence, sourceEvidenceVersion, intelligence: provider }), 'INVALID_MODEL_OUTPUT');
  }
});

test('identity exclusion fails closed as insufficient truth', async () => {
  const input = product();
  const evidence = evidenceFor(input);
  const decision = completeDecision(input, evidence);
  decision.retainedFactIds = decision.retainedFactIds.filter(id => id !== 'identity');
  decision.exclusions = [{ factId: 'identity', reason: 'INSUFFICIENT_SUPPORT' }];
  const { provider } = stubProvider(decision);
  await expectTruthError(
    analyzeProductTruth({ product: input, evidence, sourceEvidenceVersion, intelligence: provider }),
    'INSUFFICIENT_TRUTH'
  );
});

test('truth request keeps authoritative rules, untrusted factual input, and media separate', async () => {
  const input = product();
  const evidence = evidenceFor(input);
  const { provider, requests } = stubProvider(completeDecision(input, evidence));
  await analyzeProductTruth({ product: input, evidence, sourceEvidenceVersion, intelligence: provider });
  const request = requests[0]!;

  assert.deepEqual(request.media, []);
  assert.match(request.instruction, /PRODUCT TRUTH RULES/);
  assert.match(request.instruction, /Do not use creative direction/);
  assert.match(request.inputText ?? '', /PRODUCT_TRUTH_INPUT_JSON:/);
  assert.match(request.inputText ?? '', /Cocoon turmeric serum/);
  assert.match(request.inputText ?? '', /candidateFacts/);
  assert.doesNotMatch(request.instruction, /Cocoon turmeric serum|reference-1|Beauty/);
  assert.doesNotMatch(request.inputText ?? '', /audience|shootingContext|reviewerPersona|voiceGender|voiceRegion|dataBase64|GEMINI_API_KEY|mediaId|bearer|session/i);
  assert.equal(('creativeDirection' as string) in request, false);
});

test('invalid evidence and source version fail before intelligence execution', async () => {
  const input = product();
  const invalidEvidence = { ...evidenceFor(input), canonicalAssetIds: ['unknown'] };
  const first = stubProvider(completeDecision(input, evidenceFor(input)));
  await expectTruthError(
    analyzeProductTruth({ product: input, evidence: invalidEvidence, sourceEvidenceVersion, intelligence: first.provider }),
    'INVALID_EVIDENCE'
  );
  assert.equal(first.requests.length, 0);

  const second = stubProvider(completeDecision(input, evidenceFor(input)));
  await expectTruthError(
    analyzeProductTruth({ product: input, evidence: evidenceFor(input), sourceEvidenceVersion: ' ', intelligence: second.provider }),
    'INVALID_SOURCE_VERSION'
  );
  assert.equal(second.requests.length, 0);
});

test('malformed decision and generic provider failures fail closed without raw detail', async () => {
  const input = product();
  const evidence = evidenceFor(input);
  const malformed = stubProvider({ retainedFactIds: [] });
  await expectTruthError(
    analyzeProductTruth({ product: input, evidence, sourceEvidenceVersion, intelligence: malformed.provider }),
    'INVALID_MODEL_OUTPUT'
  );

  const failing = stubProvider(completeDecision(input, evidence), new Error('raw transport request and secret detail'));
  await expectTruthError(
    analyzeProductTruth({ product: input, evidence, sourceEvidenceVersion, intelligence: failing.provider }),
    'PROVIDER_FAILURE'
  );
});

test('normalized intelligence errors survive the ProductTruth boundary unchanged', async () => {
  const input = product();
  const evidence = evidenceFor(input);
  const providerError = new IntelligenceProviderError('UNAVAILABLE', true);
  const { provider } = stubProvider(completeDecision(input, evidence), providerError);
  await assert.rejects(
    analyzeProductTruth({ product: input, evidence, sourceEvidenceVersion, intelligence: provider }),
    (error: unknown) => error === providerError && error instanceof IntelligenceProviderError && error.code === 'UNAVAILABLE'
  );
});

test('contract validation rejects ProductTruth mutations and disallowed claims', async () => {
  const input = product();
  const evidence = evidenceFor(input);
  const { provider } = stubProvider(completeDecision(input, evidence));
  const truth = await analyzeProductTruth({ product: input, evidence, sourceEvidenceVersion, intelligence: provider });

  const withDisallowedClaim = {
    ...truth,
    allowedClaims: [...truth.allowedClaims, {
      claimId: 'claim-blocked', text: 'The serum improves skin.', source: 'USER_INPUT' as const, evidenceAssetIds: []
    }]
  };
  assert.ok(validateProductTruth(withDisallowedClaim, input, evidence, sourceEvidenceVersion).includes('claim_not_allowed_or_unknown:claim-blocked'));
  assert.ok(validateProductTruth({ ...truth, prohibitedInferences: [] }, input, evidence, sourceEvidenceVersion).includes('prohibited_inferences_mismatch'));
  assert.ok(validateProductTruth({ ...truth, unresolvedUncertainties: [] }, input, evidence, sourceEvidenceVersion).includes('uncertainties_mismatch'));
  assert.ok(validateProductTruth({ ...truth, unresolvedContradictions: [] }, input, evidence, sourceEvidenceVersion).includes('contradictions_mismatch'));
  assert.ok(validateProductTruth({ ...truth, facts: [{ ...truth.facts[0]!, text: 'model-authored rewrite' }] }, input, evidence, sourceEvidenceVersion).some(issue => issue.startsWith('fact_text_mismatch:')));
});
