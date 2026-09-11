import assert from 'node:assert/strict';
import test from 'node:test';
import { SCHEMA_VERSION, type R2CommittedProductContext } from '@mochi/contracts';
import type { IntelligenceProvider, StructuredIntelligenceRequest } from '@mochi/providers';
import {
  ProductAffordanceProfileErrorV1_2,
  compileProductAffordanceProfileV1_2,
  type AffordanceClassificationDecisionV1_2,
  type ReferencePurposesV1_2
} from './index.ts';

function context(): R2CommittedProductContext {
  return {
    schemaVersion: SCHEMA_VERSION, productId: 'product-1', sourceEvidenceVersion: 'evidence-v1', canonicalAssetIds: ['asset-a', 'asset-b'],
    productTruth: {
      schemaVersion: SCHEMA_VERSION, productId: 'product-1', sourceEvidenceVersion: 'evidence-v1', canonicalAssetIds: ['asset-a', 'asset-b'],
      name: 'Pump Bottle', category: 'Beauty', identityDescription: 'A pump bottle.',
      facts: [
        { factId: 'geometry:0', kind: 'GEOMETRY', text: 'Bottle has a removable cap.', evidenceAssetIds: ['asset-a'] },
        { factId: 'color:0', kind: 'COLOR', text: 'Bottle is amber.', evidenceAssetIds: ['asset-b'] }
      ],
      allowedClaims: [{ claimId: 'claim-1', text: 'The pump dispenses serum.', source: 'USER_INPUT', evidenceAssetIds: [] }],
      prohibitedInferences: [], unresolvedUncertainties: [], unresolvedContradictions: [], exclusions: []
    },
    referenceAssessment: {
      schemaVersion: SCHEMA_VERSION, productId: 'product-1', sourceEvidenceVersion: 'evidence-v1', canonicalAssetIds: ['asset-a', 'asset-b'],
      assetAssessments: [
        { assetId: 'asset-a', targetVisibility: 'CLEAR', identityConfidence: 'HIGH', geometryCoverage: 'STRONG', labelReadability: 'CLEAR', occlusion: 'NONE', backgroundInterference: 'LOW', multiProductAmbiguity: 'NONE' },
        { assetId: 'asset-b', targetVisibility: 'CLEAR', identityConfidence: 'HIGH', geometryCoverage: 'STRONG', labelReadability: 'CLEAR', occlusion: 'NONE', backgroundInterference: 'LOW', multiProductAmbiguity: 'NONE' }
      ], readiness: 'READY', limitationCodes: []
    }
  };
}

function purposes(): ReferencePurposesV1_2 {
  return {
    referencePurposeVersion: 'REFERENCE_PURPOSES_V1_2', productId: 'product-1', sourceEvidenceVersion: 'evidence-v1',
    canonicalAssetIds: ['asset-a', 'asset-b'], reviewedVariantId: 'reviewed:product-1',
    references: [
      { assetId: 'asset-a', purpose: 'CANONICAL_REVIEWED_PRODUCT_IDENTITY', productVariantId: 'reviewed:product-1', authorityReferences: [{ authority: 'PRODUCT_NAME', exactProductName: 'Pump Bottle' }] },
      { assetId: 'asset-b', purpose: 'SUPPORTING_FUNCTION', productVariantId: 'reviewed:product-1', authorityReferences: [{ authority: 'PRODUCT_TRUTH_CLAIM', claimId: 'claim-1' }] }
    ]
  };
}

function decision(): AffordanceClassificationDecisionV1_2 {
  return { authorityAssessments: [
    { authority: 'PRODUCT_TRUTH_FACT', authorityId: 'geometry:0', affordanceKinds: ['HAS_CAP', 'CAN_REMOVE_CAP'] },
    { authority: 'PRODUCT_TRUTH_FACT', authorityId: 'color:0', affordanceKinds: [] },
    { authority: 'PRODUCT_TRUTH_CLAIM', authorityId: 'claim-1', affordanceKinds: ['CAN_DISPENSE'] }
  ] };
}

function provider(output: unknown) {
  const requests: StructuredIntelligenceRequest<unknown>[] = [];
  const intelligence: IntelligenceProvider = {
    id: 'mock-affordance',
    async analyzeStructured<T>(request: StructuredIntelligenceRequest<T>) {
      requests.push(request as StructuredIntelligenceRequest<unknown>);
      return { data: request.parse(output) };
    }
  };
  return { intelligence, requests };
}

test('derives functional affordances only from exact FACT/CLAIM authority and uses references only as support', async () => {
  const input = context();
  const before = JSON.stringify(input);
  const mock = provider(decision());
  const profile = await compileProductAffordanceProfileV1_2(input, purposes(), mock.intelligence);
  assert.deepEqual(profile.affordances.map(item => [item.kind, item.authorityReferences, item.supportingReferenceAssetIds]), [
    ['CAN_DISPENSE', [{ authority: 'PRODUCT_TRUTH_CLAIM', claimId: 'claim-1' }], ['asset-b']],
    ['CAN_REMOVE_CAP', [{ authority: 'PRODUCT_TRUTH_FACT', factId: 'geometry:0' }], []],
    ['HAS_CAP', [{ authority: 'PRODUCT_TRUTH_FACT', factId: 'geometry:0' }], []]
  ]);
  assert.equal(mock.requests.length, 1);
  assert.deepEqual(mock.requests[0]?.media, []);
  assert.doesNotMatch(mock.requests[0]?.inputText ?? '', /creativeDirection|dataBase64|audience|shootingContext/);
  assert.equal(JSON.stringify(input), before);
});

test('Product Name is never offered as functional affordance authority', async () => {
  const input = context();
  input.productTruth.facts = [];
  input.productTruth.allowedClaims = [];
  const referencePurposes = purposes();
  referencePurposes.references = [
    referencePurposes.references[0]!,
    {
      assetId: 'asset-b',
      purpose: 'SUPPORTING_VARIANT',
      productVariantId: 'reviewed:product-1',
      authorityReferences: [{ authority: 'PRODUCT_NAME', exactProductName: 'Pump Bottle' }]
    }
  ];
  const mock = provider({ authorityAssessments: [] });
  const profile = await compileProductAffordanceProfileV1_2(input, referencePurposes, mock.intelligence);
  assert.deepEqual(profile.affordances, []);
  assert.doesNotMatch(mock.requests[0]?.inputText ?? '', /"authority":"PRODUCT_NAME"/);
});

test('absent classification excludes an affordance and supporting references cannot create one', async () => {
  const output = decision();
  output.authorityAssessments = output.authorityAssessments.map(item => ({ ...item, affordanceKinds: [] }));
  const profile = await compileProductAffordanceProfileV1_2(context(), purposes(), provider(output).intelligence);
  assert.deepEqual(profile.affordances, []);
});

test('unknown authority, unsupported kind, prose, duplicates, reordering, and incomplete decisions fail closed', async () => {
  const base = decision();
  const invalid: readonly unknown[] = [
    { authorityAssessments: base.authorityAssessments.slice(0, 2) },
    { authorityAssessments: [base.authorityAssessments[0], base.authorityAssessments[0], base.authorityAssessments[2]] },
    { authorityAssessments: [base.authorityAssessments[1], base.authorityAssessments[0], base.authorityAssessments[2]] },
    { authorityAssessments: [{ ...base.authorityAssessments[0], authorityId: 'unknown' }, base.authorityAssessments[1], base.authorityAssessments[2]] },
    { authorityAssessments: [{ ...base.authorityAssessments[0], affordanceKinds: ['CAN_FLY'] }, base.authorityAssessments[1], base.authorityAssessments[2]] },
    { authorityAssessments: [{ ...base.authorityAssessments[0], prose: 'invented' }, base.authorityAssessments[1], base.authorityAssessments[2]] }
  ];
  for (const output of invalid) {
    await assert.rejects(
      compileProductAffordanceProfileV1_2(context(), purposes(), provider(output).intelligence),
      (error: unknown) => error instanceof ProductAffordanceProfileErrorV1_2 && error.code === 'INVALID_MODEL_OUTPUT'
    );
  }
});

test('contradicted or uncertain truth cannot authorize a functional affordance', async () => {
  const input = context();
  input.productTruth.unresolvedContradictions = [{ statements: ['Bottle has a removable cap.', 'Bottle has no cap.'], assetIds: ['asset-a'], reason: 'Conflict.' }];
  const output = decision();
  output.authorityAssessments = output.authorityAssessments.slice(1);
  const profile = await compileProductAffordanceProfileV1_2(input, purposes(), provider(output).intelligence);
  assert.equal(profile.affordances.some(item => item.kind === 'HAS_CAP' || item.kind === 'CAN_REMOVE_CAP'), false);
});
