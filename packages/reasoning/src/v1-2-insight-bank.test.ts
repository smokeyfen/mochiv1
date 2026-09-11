import assert from 'node:assert/strict';
import test from 'node:test';
import { SCHEMA_VERSION, type R2CommittedProductContext } from '@mochi/contracts';
import type { IntelligenceProvider, StructuredIntelligenceRequest } from '@mochi/providers';
import {
  ProductInsightBankErrorV1_2,
  compileProductInsightBankV1_2,
  rankProductInsightsV1_2,
  type ProductInsightScoreDecisionV1_2
} from './index.ts';

function context(): R2CommittedProductContext {
  return {
    schemaVersion: SCHEMA_VERSION,
    productId: 'product-1',
    sourceEvidenceVersion: 'evidence-v1',
    canonicalAssetIds: ['asset-a'],
    productTruth: {
      schemaVersion: SCHEMA_VERSION,
      productId: 'product-1',
      sourceEvidenceVersion: 'evidence-v1',
      canonicalAssetIds: ['asset-a'],
      name: 'Exact Product Name',
      category: 'Beauty',
      identityDescription: 'A bottle.',
      facts: [{ factId: 'geometry:0', kind: 'GEOMETRY', text: 'Bottle has a cap.', evidenceAssetIds: ['asset-a'] }],
      allowedClaims: [{ claimId: 'claim-1', text: 'Bottle dispenses serum.', source: 'USER_INPUT', evidenceAssetIds: [] }],
      prohibitedInferences: [],
      unresolvedUncertainties: [],
      unresolvedContradictions: [],
      exclusions: []
    },
    referenceAssessment: {
      schemaVersion: SCHEMA_VERSION,
      productId: 'product-1', sourceEvidenceVersion: 'evidence-v1', canonicalAssetIds: ['asset-a'],
      assetAssessments: [{ assetId: 'asset-a', targetVisibility: 'CLEAR', identityConfidence: 'HIGH', geometryCoverage: 'STRONG', labelReadability: 'CLEAR', occlusion: 'NONE', backgroundInterference: 'LOW', multiProductAmbiguity: 'NONE' }],
      readiness: 'READY', limitationCodes: []
    }
  };
}

function decision(): ProductInsightScoreDecisionV1_2 {
  return { insightScores: [
    { insightId: 'product-name', purchaseTrigger: 100, productAppeal: 0, visualDemonstrability: 0, relevanceUsefulness: 0, distinctiveness: 0 },
    { insightId: 'fact:geometry:0', purchaseTrigger: 0, productAppeal: 100, visualDemonstrability: 100, relevanceUsefulness: 0, distinctiveness: 0 },
    { insightId: 'claim:claim-1', purchaseTrigger: 0, productAppeal: 0, visualDemonstrability: 0, relevanceUsefulness: 100, distinctiveness: 100 }
  ] };
}

function provider(output: unknown) {
  const requests: StructuredIntelligenceRequest<unknown>[] = [];
  const intelligence: IntelligenceProvider = {
    id: 'mock-insight-score',
    async analyzeStructured<T>(request: StructuredIntelligenceRequest<T>) {
      requests.push(request as StructuredIntelligenceRequest<unknown>);
      return { data: request.parse(output) };
    }
  };
  return { intelligence, requests };
}

test('copies exact Product Name, FACT, and CLAIM text while compiler owns weighted utility', async () => {
  const input = context();
  const before = JSON.stringify(input);
  const mock = provider(decision());
  const bank = await compileProductInsightBankV1_2(input, mock.intelligence);
  assert.deepEqual(bank.insights.map(insight => [insight.insightId, insight.exactText, insight.utilityScore]), [
    ['product-name', 'Exact Product Name', 3500],
    ['fact:geometry:0', 'Bottle has a cap.', 4500],
    ['claim:claim-1', 'Bottle dispenses serum.', 2000]
  ]);
  assert.deepEqual(bank.insights.map(insight => insight.authorityReferences[0]), [
    { authority: 'PRODUCT_NAME', exactProductName: 'Exact Product Name' },
    { authority: 'PRODUCT_TRUTH_FACT', factId: 'geometry:0' },
    { authority: 'PRODUCT_TRUTH_CLAIM', claimId: 'claim-1' }
  ]);
  assert.deepEqual(rankProductInsightsV1_2(bank).map(insight => insight.insightId), [
    'fact:geometry:0', 'product-name', 'claim:claim-1'
  ]);
  assert.equal(mock.requests.length, 1);
  assert.deepEqual(mock.requests[0]?.media, []);
  assert.doesNotMatch(mock.requests[0]?.inputText ?? '', /creativeDirection|dataBase64|audience|shootingContext/);
  assert.equal(JSON.stringify(input), before);
});

test('ranking uses utility descending then stable insightId, never lexicographic score priority', async () => {
  const output = decision();
  output.insightScores = [
    { insightId: 'product-name', purchaseTrigger: 100, productAppeal: 0, visualDemonstrability: 0, relevanceUsefulness: 0, distinctiveness: 0 },
    { insightId: 'fact:geometry:0', purchaseTrigger: 0, productAppeal: 100, visualDemonstrability: 49, relevanceUsefulness: 0, distinctiveness: 0 },
    { insightId: 'claim:claim-1', purchaseTrigger: 100, productAppeal: 0, visualDemonstrability: 0, relevanceUsefulness: 0, distinctiveness: 0 }
  ];
  const bank = await compileProductInsightBankV1_2(context(), provider(output).intelligence);
  assert.deepEqual(rankProductInsightsV1_2(bank).map(insight => insight.insightId), [
    'claim:claim-1', 'product-name', 'fact:geometry:0'
  ]);
});

test('out-of-range, fractional, incomplete, duplicate, unknown, reordered, or prose-bearing score output fails closed', async () => {
  const base = decision();
  const invalid: readonly unknown[] = [
    { insightScores: base.insightScores.slice(0, 2) },
    { insightScores: [base.insightScores[0], base.insightScores[0], base.insightScores[2]] },
    { insightScores: [base.insightScores[1], base.insightScores[0], base.insightScores[2]] },
    { insightScores: [{ ...base.insightScores[0], insightId: 'unknown' }, base.insightScores[1], base.insightScores[2]] },
    { insightScores: [{ ...base.insightScores[0], purchaseTrigger: 101 }, base.insightScores[1], base.insightScores[2]] },
    { insightScores: [{ ...base.insightScores[0], purchaseTrigger: -1 }, base.insightScores[1], base.insightScores[2]] },
    { insightScores: [{ ...base.insightScores[0], purchaseTrigger: 1.5 }, base.insightScores[1], base.insightScores[2]] },
    { insightScores: [{ ...base.insightScores[0], factualSummary: 'invented prose' }, base.insightScores[1], base.insightScores[2]] }
  ];
  for (const output of invalid) {
    await assert.rejects(
      compileProductInsightBankV1_2(context(), provider(output).intelligence),
      (error: unknown) => error instanceof ProductInsightBankErrorV1_2 && error.code === 'INVALID_MODEL_OUTPUT'
    );
  }
});

test('compiler excludes risk-blocked authority instead of assigning arbitrary commercial scores', async () => {
  const input = context();
  input.productTruth.unresolvedContradictions = [{ statements: ['Bottle has a cap.', 'Bottle has no cap.'], assetIds: ['asset-a'], reason: 'Conflict.' }];
  const output = { insightScores: [decision().insightScores[0], decision().insightScores[2]] };
  const bank = await compileProductInsightBankV1_2(input, provider(output).intelligence);
  assert.deepEqual(bank.insights.map(insight => insight.insightId), ['product-name', 'claim:claim-1']);
});
