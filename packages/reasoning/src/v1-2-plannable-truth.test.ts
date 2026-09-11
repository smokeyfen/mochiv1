import assert from 'node:assert/strict';
import test from 'node:test';
import { SCHEMA_VERSION, type R2CommittedProductContext } from '@mochi/contracts';
import { evaluatePlannableTruthV1_2, type ReferencePurposesV1_2 } from './index.ts';

function context(): R2CommittedProductContext {
  return {
    schemaVersion: SCHEMA_VERSION,
    productId: 'product-1',
    sourceEvidenceVersion: 'evidence-v1',
    canonicalAssetIds: ['asset-a', 'asset-b'],
    productTruth: {
      schemaVersion: SCHEMA_VERSION,
      productId: 'product-1',
      sourceEvidenceVersion: 'evidence-v1',
      canonicalAssetIds: ['asset-a', 'asset-b'],
      name: 'Tên Sản Phẩm Chính Xác',
      category: 'Home',
      identityDescription: 'A reviewed bottle.',
      facts: [
        { factId: 'geometry:0', kind: 'GEOMETRY', text: 'Bottle has a removable cap.', evidenceAssetIds: ['asset-a'] },
        { factId: 'color:0', kind: 'COLOR', text: 'Bottle is blue.', evidenceAssetIds: ['asset-b'] }
      ],
      allowedClaims: [{ claimId: 'claim-1', text: 'The bottle can dispense liquid.', source: 'USER_INPUT', evidenceAssetIds: [] }],
      prohibitedInferences: [],
      unresolvedUncertainties: [],
      unresolvedContradictions: [],
      exclusions: [{ factId: 'label:0', reason: 'INSUFFICIENT_SUPPORT' }]
    },
    referenceAssessment: {
      schemaVersion: SCHEMA_VERSION,
      productId: 'product-1',
      sourceEvidenceVersion: 'evidence-v1',
      canonicalAssetIds: ['asset-a', 'asset-b'],
      assetAssessments: [
        { assetId: 'asset-a', targetVisibility: 'CLEAR', identityConfidence: 'HIGH', geometryCoverage: 'STRONG', labelReadability: 'CLEAR', occlusion: 'NONE', backgroundInterference: 'LOW', multiProductAmbiguity: 'NONE' },
        { assetId: 'asset-b', targetVisibility: 'CLEAR', identityConfidence: 'HIGH', geometryCoverage: 'STRONG', labelReadability: 'CLEAR', occlusion: 'NONE', backgroundInterference: 'LOW', multiProductAmbiguity: 'NONE' }
      ],
      readiness: 'READY',
      limitationCodes: []
    }
  };
}

function purposes(): ReferencePurposesV1_2 {
  return {
    referencePurposeVersion: 'REFERENCE_PURPOSES_V1_2',
    productId: 'product-1',
    sourceEvidenceVersion: 'evidence-v1',
    canonicalAssetIds: ['asset-a', 'asset-b'],
    referenceFingerprints: [
      { assetId: 'asset-a', mimeType: 'image/jpeg', sha256: 'a'.repeat(64) },
      { assetId: 'asset-b', mimeType: 'image/png', sha256: 'b'.repeat(64) }
    ],
    reviewedVariantId: 'reviewed:product-1',
    references: [
      { assetId: 'asset-a', purpose: 'CANONICAL_REVIEWED_PRODUCT_IDENTITY', productVariantId: 'reviewed:product-1', authorityReferences: [{ authority: 'PRODUCT_NAME', exactProductName: 'Tên Sản Phẩm Chính Xác' }] },
      { assetId: 'asset-b', purpose: 'SUPPORTING_FEATURE', productVariantId: 'reviewed:product-1', authorityReferences: [{ authority: 'PRODUCT_TRUTH_FACT', factId: 'color:0' }] }
    ]
  };
}

test('preserves exact Product Name plus FACT and CLAIM authority without rewriting R2', () => {
  const input = context();
  const before = JSON.stringify(input);
  const result = evaluatePlannableTruthV1_2(input, purposes());
  assert.equal(result.status, 'PASS');
  assert.deepEqual(result.reasonCodes, []);
  assert.deepEqual(result.plannableItems.map(item => [item.exactText, item.authorityReference]), [
    ['Tên Sản Phẩm Chính Xác', { authority: 'PRODUCT_NAME', exactProductName: 'Tên Sản Phẩm Chính Xác' }],
    ['Bottle has a removable cap.', { authority: 'PRODUCT_TRUTH_FACT', factId: 'geometry:0' }],
    ['Bottle is blue.', { authority: 'PRODUCT_TRUTH_FACT', factId: 'color:0' }],
    ['The bottle can dispense liquid.', { authority: 'PRODUCT_TRUTH_CLAIM', claimId: 'claim-1' }]
  ]);
  assert.deepEqual(result.blockedItems, [{ sourceId: 'label:0', reasonCodes: ['R2_EXCLUDED'] }]);
  assert.equal(JSON.stringify(input), before);
  assert.equal(('creativeDirection' as string) in result, false);
});

test('blocks only authorities affected by contradiction, unsafe uncertainty, or prohibited inference', () => {
  const input = context();
  input.productTruth.unresolvedContradictions = [{ statements: ['Bottle has a removable cap.', 'Bottle has no cap.'], assetIds: ['asset-a'], reason: 'Conflicting views.' }];
  input.productTruth.unresolvedUncertainties = [{ subject: 'Bottle is blue.', assetIds: ['asset-b'], reason: 'Lighting is uncertain.' }];
  input.productTruth.prohibitedInferences = ['The bottle can dispense liquid.'];
  const result = evaluatePlannableTruthV1_2(input, purposes());

  assert.equal(result.status, 'FAIL');
  assert.deepEqual(result.plannableItems.map(item => item.authorityReference), [
    { authority: 'PRODUCT_NAME', exactProductName: 'Tên Sản Phẩm Chính Xác' }
  ]);
  assert.deepEqual(result.blockedItems.map(item => [item.sourceId, item.reasonCodes]), [
    ['geometry:0', ['UNRESOLVED_CONTRADICTION']],
    ['color:0', ['UNSAFE_UNCERTAINTY']],
    ['claim-1', ['PROHIBITED_INFERENCE']],
    ['label:0', ['R2_EXCLUDED']]
  ]);
  assert.deepEqual(result.reasonCodes, ['NO_PLANNABLE_PRODUCT_TRUTH']);
});

test('an unrelated valid fact remains plannable when another fact is uncertain', () => {
  const input = context();
  input.productTruth.unresolvedUncertainties = [{ subject: 'Bottle has a removable cap.', assetIds: ['asset-a'], reason: 'Cap visibility is partial.' }];
  const result = evaluatePlannableTruthV1_2(input, purposes());
  assert.equal(result.status, 'PASS');
  assert.equal(result.plannableItems.some(item => item.exactText === 'Bottle is blue.'), true);
  assert.equal(result.plannableItems.some(item => item.exactText === 'Bottle has a removable cap.'), false);
});

test('blocks a paraphrased contradiction by shared evidence asset while preserving an unaffected fact', () => {
  const input = context();
  input.productTruth.unresolvedContradictions = [{
    statements: ['The cap appears permanently fixed.', 'The cap may detach.'],
    assetIds: ['asset-a'],
    reason: 'The same reference does not establish cap attachment.'
  }];
  const result = evaluatePlannableTruthV1_2(input, purposes());

  assert.equal(result.plannableItems.some(item => item.exactText === 'Bottle has a removable cap.'), false);
  assert.equal(result.plannableItems.some(item => item.exactText === 'Bottle is blue.'), true);
  assert.deepEqual(result.blockedItems.find(item => item.sourceId === 'geometry:0')?.reasonCodes, [
    'UNRESOLVED_CONTRADICTION'
  ]);
});

test('blocks asset-backed reference claims on same-asset uncertainty without suppressing unrelated user input', () => {
  const input = context();
  input.productTruth.allowedClaims = [
    ...input.productTruth.allowedClaims,
    {
      claimId: 'claim-reference',
      text: 'The closure twists free.',
      source: 'REFERENCE_EVIDENCE',
      evidenceAssetIds: ['asset-a']
    }
  ];
  input.productTruth.unresolvedUncertainties = [{
    subject: 'Cap attachment mechanism',
    assetIds: ['asset-a'],
    reason: 'The threading is not visible.'
  }];
  const result = evaluatePlannableTruthV1_2(input, purposes());

  assert.deepEqual(result.blockedItems.find(item => item.sourceId === 'claim-reference')?.reasonCodes, [
    'UNSAFE_UNCERTAINTY'
  ]);
  assert.deepEqual(result.blockedItems.find(item => item.sourceId === 'geometry:0')?.reasonCodes, [
    'UNSAFE_UNCERTAINTY'
  ]);
  assert.equal(result.plannableItems.some(item => item.exactText === 'The bottle can dispense liquid.'), true);
  assert.equal(result.plannableItems.some(item => item.exactText === 'Bottle is blue.'), true);
});

test('reference identity conflict and invalid R2 source binding fail with stable bounded reasons', () => {
  const conflicted = purposes();
  conflicted.references = conflicted.references.map((reference, index) => index === 1
    ? { ...reference, productVariantId: 'reviewed:other-product' }
    : reference);
  assert.deepEqual(evaluatePlannableTruthV1_2(context(), conflicted).reasonCodes, ['REFERENCE_IDENTITY_CONFLICT']);

  const stale = context();
  stale.sourceEvidenceVersion = 'stale';
  assert.deepEqual(evaluatePlannableTruthV1_2(stale, purposes()).reasonCodes, ['INVALID_COMMITTED_CONTEXT']);
});

test('malformed or deterministically inconsistent committed reference assessment is not accepted as valid R2 context', () => {
  const malformed = context();
  malformed.referenceAssessment.assetAssessments = [
    { ...malformed.referenceAssessment.assetAssessments[0]!, targetVisibility: 'INVENTED' as never },
    malformed.referenceAssessment.assetAssessments[1]!
  ];
  assert.deepEqual(evaluatePlannableTruthV1_2(malformed, purposes()).reasonCodes, ['INVALID_COMMITTED_CONTEXT']);

  const inconsistent = context();
  inconsistent.referenceAssessment.assetAssessments = inconsistent.referenceAssessment.assetAssessments.map(item => ({
    ...item, targetVisibility: 'POOR', identityConfidence: 'LOW'
  }));
  assert.deepEqual(evaluatePlannableTruthV1_2(inconsistent, purposes()).reasonCodes, ['INVALID_COMMITTED_CONTEXT']);
});

test('malformed Product Truth facts and unresolved-risk records fail closed as invalid committed context', () => {
  const invalidFact = context();
  invalidFact.productTruth.facts = [{ ...invalidFact.productTruth.facts[0]!, kind: 'INVENTED' as never }];
  assert.deepEqual(evaluatePlannableTruthV1_2(invalidFact, purposes()).reasonCodes, ['INVALID_COMMITTED_CONTEXT']);

  const invalidRisk = context();
  invalidRisk.productTruth.unresolvedContradictions = [{} as never];
  assert.deepEqual(evaluatePlannableTruthV1_2(invalidRisk, purposes()).reasonCodes, ['INVALID_COMMITTED_CONTEXT']);
});
