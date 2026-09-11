import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { SCHEMA_VERSION, type R2CommittedProductContext } from '@mochi/contracts';
import type { IntelligenceMediaInput, IntelligenceProvider, StructuredIntelligenceRequest } from '@mochi/providers';
import {
  ReferencePurposeErrorV1_2,
  assessReferencePurposesV1_2,
  validateReferencePurposesForContextV1_2,
  type ReferencePurposeDecisionV1_2
} from './index.ts';

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function context(): R2CommittedProductContext {
  return {
    schemaVersion: SCHEMA_VERSION,
    productId: 'serum-1',
    sourceEvidenceVersion: 'evidence-v1',
    canonicalAssetIds: ['asset-a', 'asset-b'],
    productTruth: {
      schemaVersion: SCHEMA_VERSION,
      productId: 'serum-1',
      sourceEvidenceVersion: 'evidence-v1',
      canonicalAssetIds: ['asset-a', 'asset-b'],
      name: 'Mochi Serum Chính Hãng',
      category: 'Beauty',
      identityDescription: 'An amber serum bottle.',
      facts: [
        { factId: 'geometry:0', kind: 'GEOMETRY', text: 'Bottle has a removable cap.', evidenceAssetIds: ['asset-a'] },
        { factId: 'color:0', kind: 'COLOR', text: 'Bottle is amber.', evidenceAssetIds: ['asset-b'] }
      ],
      allowedClaims: [
        { claimId: 'claim-1', text: 'The pump dispenses serum.', source: 'USER_INPUT', evidenceAssetIds: [] }
      ],
      prohibitedInferences: [],
      unresolvedUncertainties: [],
      unresolvedContradictions: [],
      exclusions: []
    },
    referenceAssessment: {
      schemaVersion: SCHEMA_VERSION,
      productId: 'serum-1',
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

function media(): readonly IntelligenceMediaInput[] {
  return [
    { assetId: 'asset-a', mimeType: 'image/jpeg', dataBase64: jpeg.toString('base64') },
    { assetId: 'asset-b', mimeType: 'image/png', dataBase64: png.toString('base64') }
  ];
}

function fingerprints() {
  return [
    { assetId: 'asset-a', mimeType: 'image/jpeg', sha256: createHash('sha256').update(jpeg).digest('hex') },
    { assetId: 'asset-b', mimeType: 'image/png', sha256: createHash('sha256').update(png).digest('hex') }
  ] as const;
}

function decision(): ReferencePurposeDecisionV1_2 {
  return {
    assetPurposes: [
      { assetId: 'asset-a', purpose: 'CANONICAL_REVIEWED_PRODUCT_IDENTITY', variantCompatibility: 'SAME_REVIEWED_VARIANT', factIds: [], claimIds: [] },
      { assetId: 'asset-b', purpose: 'FUNCTIONAL_STATE_REFERENCE', variantCompatibility: 'SAME_REVIEWED_VARIANT', factIds: [], claimIds: ['claim-1'] }
    ]
  };
}

function provider(output: unknown) {
  const requests: StructuredIntelligenceRequest<unknown>[] = [];
  const intelligence: IntelligenceProvider = {
    id: 'mock-reference-purpose',
    async analyzeStructured<T>(request: StructuredIntelligenceRequest<T>) {
      requests.push(request as StructuredIntelligenceRequest<unknown>);
      return { data: request.parse(output) };
    }
  };
  return { intelligence, requests };
}

test('assesses every canonical asset exactly once and separates canonical identity from supporting state authority', async () => {
  const input = context();
  const before = JSON.stringify(input);
  const mock = provider(decision());
  const result = await assessReferencePurposesV1_2(input, fingerprints(), media(), mock.intelligence);

  assert.deepEqual(result.canonicalAssetIds, ['asset-a', 'asset-b']);
  assert.deepEqual(result.referenceFingerprints, fingerprints());
  assert.deepEqual(result.references.map(reference => [reference.assetId, reference.purpose]), [
    ['asset-a', 'CANONICAL_REVIEWED_PRODUCT_IDENTITY'],
    ['asset-b', 'FUNCTIONAL_STATE_REFERENCE']
  ]);
  assert.deepEqual(result.references[0]?.authorityReferences, [
    { authority: 'PRODUCT_NAME', exactProductName: 'Mochi Serum Chính Hãng' }
  ]);
  assert.deepEqual(result.references[1]?.authorityReferences, [
    { authority: 'PRODUCT_TRUTH_CLAIM', claimId: 'claim-1' }
  ]);
  assert.equal(mock.requests.length, 1);
  assert.deepEqual(mock.requests[0]?.media.map(item => item.assetId), ['asset-a', 'asset-b']);
  assert.doesNotMatch(mock.requests[0]?.inputText ?? '', /creativeDirection|audience|shootingContext|dataBase64/);
  assert.equal(('creativeDirection' as string) in result, false);
  assert.equal(JSON.stringify(input), before);
});

test('preserves exact trusted fingerprint lineage and detects a changed old artifact', async () => {
  const trusted = fingerprints();
  const result = await assessReferencePurposesV1_2(context(), trusted, media(), provider(decision()).intelligence);
  assert.deepEqual(result.referenceFingerprints, trusted);
  assert.notEqual(result.referenceFingerprints, trusted);

  const changed = structuredClone(result);
  changed.referenceFingerprints = [
    { ...changed.referenceFingerprints[0]!, sha256: '0'.repeat(64) },
    changed.referenceFingerprints[1]!
  ];
  assert.deepEqual(validateReferencePurposesForContextV1_2(context(), changed, trusted), ['fingerprint_binding']);
});

test('artifact validation rejects malformed, reordered, duplicate, wrong-asset, wrong-MIME, and invalid-hash fingerprint bindings', async () => {
  const trusted = fingerprints();
  const result = await assessReferencePurposesV1_2(context(), trusted, media(), provider(decision()).intelligence);
  const invalidBindings: readonly unknown[] = [
    result.referenceFingerprints.slice(0, 1),
    [result.referenceFingerprints[1], result.referenceFingerprints[0]],
    [result.referenceFingerprints[0], result.referenceFingerprints[0]],
    [{ ...result.referenceFingerprints[0]!, assetId: 'unknown' }, result.referenceFingerprints[1]],
    [{ ...result.referenceFingerprints[0]!, mimeType: 'image/png' }, result.referenceFingerprints[1]],
    [{ ...result.referenceFingerprints[0]!, sha256: 'not-a-sha256' }, result.referenceFingerprints[1]]
  ];

  for (const referenceFingerprints of invalidBindings) {
    assert.equal(validateReferencePurposesForContextV1_2(context(), {
      ...result,
      referenceFingerprints
    }, trusted).includes('fingerprint_binding'), true);
  }
});

test('artifact validation rejects arbitrary other-variant IDs and canonical reviewed-identity mutation', async () => {
  const supportedOther = decision();
  supportedOther.assetPurposes = [
    supportedOther.assetPurposes[0]!,
    {
      ...supportedOther.assetPurposes[1]!,
      purpose: 'SUPPORTING_VARIANT',
      variantCompatibility: 'SUPPORTED_OTHER_VARIANT',
      factIds: [],
      claimIds: []
    }
  ];
  const result = await assessReferencePurposesV1_2(
    context(), fingerprints(), media(), provider(supportedOther).intelligence
  );
  const arbitrarySupportingId = structuredClone(result);
  arbitrarySupportingId.references = arbitrarySupportingId.references.map((reference, index) => index === 1
    ? { ...reference, productVariantId: 'provider-authored-other-variant' }
    : reference);
  assert.equal(
    validateReferencePurposesForContextV1_2(context(), arbitrarySupportingId, fingerprints())
      .includes('reference_identity_conflict'),
    true
  );

  const mutatedCanonical = structuredClone(result);
  mutatedCanonical.references = mutatedCanonical.references.map((reference, index) => index === 0
    ? { ...reference, productVariantId: result.references[1]!.productVariantId }
    : reference);
  assert.equal(
    validateReferencePurposesForContextV1_2(context(), mutatedCanonical, fingerprints())
      .includes('reference_identity_conflict'),
    true
  );
});

test('wrong, reordered, missing, duplicate, relabeled, stale, or MIME-inconsistent inputs fail before intelligence', async () => {
  const scenarios = [
    { fingerprints: fingerprints().slice(0, 1), media: media() },
    { fingerprints: [fingerprints()[1]!, fingerprints()[0]!], media: media() },
    { fingerprints: fingerprints(), media: media().slice(0, 1) },
    { fingerprints: fingerprints(), media: [media()[1]!, media()[0]!] },
    { fingerprints: fingerprints(), media: [media()[0]!, media()[0]!] },
    { fingerprints: fingerprints(), media: [{ ...media()[0]!, dataBase64: '' }, media()[1]!] },
    { fingerprints: fingerprints(), media: [{ ...media()[0]!, assetId: 'asset-b' }, media()[1]!] },
    { fingerprints: [{ ...fingerprints()[0]!, sha256: '0'.repeat(64) }, fingerprints()[1]!], media: media() },
    { fingerprints: fingerprints(), media: [{ ...media()[0]!, mimeType: 'image/png' }, media()[1]!] },
    { fingerprints: [{ ...fingerprints()[0]!, mimeType: 'image/png' }, fingerprints()[1]!], media: media() },
    { fingerprints: fingerprints(), media: [{ ...media()[0]!, dataBase64: png.toString('base64') }, media()[1]!] }
  ];
  for (const scenario of scenarios) {
    const mock = provider(decision());
    await assert.rejects(
      assessReferencePurposesV1_2(context(), scenario.fingerprints, scenario.media, mock.intelligence),
      (error: unknown) => error instanceof ReferencePurposeErrorV1_2
        && ['INVALID_FINGERPRINTS', 'INVALID_MEDIA'].includes(error.code)
    );
    assert.equal(mock.requests.length, 0);
  }
});

test('provider decisions are complete enum/ID-only assessments and conflict, ambiguity, prose, or replacement identity fails closed', async () => {
  const base = decision();
  const invalid: readonly unknown[] = [
    { assetPurposes: [base.assetPurposes[0]] },
    { assetPurposes: [base.assetPurposes[0], base.assetPurposes[0]] },
    { assetPurposes: [base.assetPurposes[1], base.assetPurposes[0]] },
    { assetPurposes: [{ ...base.assetPurposes[0], assetId: 'unknown' }, base.assetPurposes[1]] },
    { assetPurposes: [{ ...base.assetPurposes[0], variantCompatibility: 'CONFLICT' }, base.assetPurposes[1]] },
    { assetPurposes: [{ ...base.assetPurposes[0], variantCompatibility: 'AMBIGUOUS' }, base.assetPurposes[1]] },
    { assetPurposes: [{ ...base.assetPurposes[0], summary: 'invented prose' }, base.assetPurposes[1]] },
    { assetPurposes: [base.assetPurposes[0], { ...base.assetPurposes[1], referenceFingerprints: fingerprints() }] },
    { assetPurposes: [{ ...base.assetPurposes[0], purpose: 'SUPPORTING_VARIANT' }, base.assetPurposes[1]] },
    { assetPurposes: [base.assetPurposes[0], { ...base.assetPurposes[1], claimIds: ['unknown-claim'] }] }
  ];
  for (const output of invalid) {
    await assert.rejects(
      assessReferencePurposesV1_2(context(), fingerprints(), media(), provider(output).intelligence),
      (error: unknown) => error instanceof ReferencePurposeErrorV1_2
    );
  }
});

test('represents a supported other variant without changing canonical reviewed identity', async () => {
  const output = decision();
  output.assetPurposes = [
    output.assetPurposes[0]!,
    {
      ...output.assetPurposes[1]!,
      purpose: 'SUPPORTING_VARIANT',
      variantCompatibility: 'SUPPORTED_OTHER_VARIANT',
      factIds: [],
      claimIds: []
    }
  ];
  const result = await assessReferencePurposesV1_2(context(), fingerprints(), media(), provider(output).intelligence);

  assert.equal(result.reviewedVariantId, 'reviewed:serum-1');
  assert.equal(result.references[0]?.productVariantId, 'reviewed:serum-1');
  assert.equal(
    result.references[1]?.productVariantId,
    'supported-other:6cbd35824380b0b79220365eb95963f9480991a1a7ea2f42c8c8fe5150bd96c1'
  );
  assert.notEqual(result.references[1]?.productVariantId, result.reviewedVariantId);
});

test('only SUPPORTING_VARIANT accepts SUPPORTED_OTHER_VARIANT while conflict and ambiguity remain fail closed', async () => {
  for (const purpose of [
    'CANONICAL_REVIEWED_PRODUCT_IDENTITY',
    'SUPPORTING_FEATURE',
    'SUPPORTING_FUNCTION',
    'FUNCTIONAL_STATE_REFERENCE'
  ] as const) {
    const output = decision();
    output.assetPurposes = [
      output.assetPurposes[0]!,
      {
        ...output.assetPurposes[1]!,
        purpose,
        variantCompatibility: 'SUPPORTED_OTHER_VARIANT',
        factIds: purpose === 'SUPPORTING_FEATURE' ? ['geometry:0'] : [],
        claimIds: purpose === 'CANONICAL_REVIEWED_PRODUCT_IDENTITY' ? [] : ['claim-1']
      }
    ];
    await assert.rejects(
      assessReferencePurposesV1_2(context(), fingerprints(), media(), provider(output).intelligence),
      (error: unknown) => error instanceof ReferencePurposeErrorV1_2 && error.code === 'INVALID_MODEL_OUTPUT'
    );
  }

  for (const variantCompatibility of ['CONFLICT', 'AMBIGUOUS'] as const) {
    const output = decision();
    output.assetPurposes = [
      output.assetPurposes[0]!,
      { ...output.assetPurposes[1]!, purpose: 'SUPPORTING_VARIANT', variantCompatibility }
    ];
    await assert.rejects(
      assessReferencePurposesV1_2(context(), fingerprints(), media(), provider(output).intelligence),
      (error: unknown) => error instanceof ReferencePurposeErrorV1_2
        && error.code === (variantCompatibility === 'CONFLICT' ? 'REFERENCE_CONFLICT' : 'REFERENCE_AMBIGUOUS')
    );
  }
});

test('supporting same-variant roles remain supporting and never replace canonical reviewed identity', async () => {
  for (const purpose of ['SUPPORTING_FEATURE', 'SUPPORTING_FUNCTION', 'SUPPORTING_VARIANT'] as const) {
    const output = decision();
    output.assetPurposes = [
      output.assetPurposes[0],
      { ...output.assetPurposes[1], purpose, factIds: purpose === 'SUPPORTING_FEATURE' ? ['geometry:0'] : [], claimIds: purpose === 'SUPPORTING_FUNCTION' ? ['claim-1'] : [] }
    ];
    const result = await assessReferencePurposesV1_2(context(), fingerprints(), media(), provider(output).intelligence);
    assert.equal(result.references[0]?.purpose, 'CANONICAL_REVIEWED_PRODUCT_IDENTITY');
    assert.equal(result.references[1]?.purpose, purpose);
    assert.equal(result.references[1]?.productVariantId, result.reviewedVariantId);
  }
});
