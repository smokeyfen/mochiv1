import { SCHEMA_VERSION, type ProductEvidence, type ProductInput } from '@mochi/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { analyzeProductEvidence, ProductEvidenceClientError } from './product-evidence-client';

const product: ProductInput = {
  schemaVersion: SCHEMA_VERSION,
  productId: 'product-1',
  name: 'Mochi bottle',
  details: 'A factual bottle description',
  category: 'Beauty',
  assets: [{ schemaVersion: SCHEMA_VERSION, assetId: 'asset-1', role: 'PRODUCT_REFERENCE', source: 'UPLOAD', mimeType: 'image/jpeg' }]
};
const file = new File(['image bytes'], 'front.jpg', { type: 'image/jpeg' });
const evidence = (input: ProductInput = product): ProductEvidence => ({
  schemaVersion: SCHEMA_VERSION, productId: input.productId, canonicalAssetIds: input.assets.map(asset => asset.assetId),
  identityDescription: 'A small bottle', geometryNotes: ['Rounded bottle'], colorNotes: ['White'], packagingNotes: [], labelNotes: [],
  claims: [], prohibitedInferences: ['Do not infer ingredients'], uncertainties: [], contradictions: []
});
const success = (input = product) => new Response(JSON.stringify({ ok: true, evidence: evidence(input), analysisReceiptId:'par_test_receipt_0123456789', receiptVersion:'PRODUCT_ANALYSIS_RECEIPT_V1' }), { status: 200, headers: { 'content-type': 'application/json' } });

function request(overrides: Partial<Parameters<typeof analyzeProductEvidence>[0]> = {}) {
  return { product, filesByAssetId: new Map([['asset-1', file]]), ...overrides };
}

afterEach(() => vi.restoreAllMocks());

describe('analyzeProductEvidence', () => {
  it('posts only ProductInput and exact asset file parts to the relative endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(success());
    vi.stubGlobal('fetch', fetchMock);
    await analyzeProductEvidence(request());
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/product-evidence');
    expect(init.method).toBe('POST');
    expect(init.headers).toBeUndefined();
    const body = init.body as FormData;
    const sentProduct = JSON.parse(body.get('product') as string) as Record<string, unknown>;
    expect(sentProduct).toEqual(product);
    expect(sentProduct).not.toHaveProperty('creativeDirection');
    expect(sentProduct).not.toHaveProperty('projectId');
    expect(body.get('asset:asset-1')).toBe(file);
    expect([...body.keys()]).toEqual(['product', 'asset:asset-1']);
  });

  it('does not fetch for invalid factual input, missing file, or MIME mismatch', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(analyzeProductEvidence(request({ product: { ...product, name: '' } }))).rejects.toMatchObject({ code: 'INVALID_PRODUCT_INPUT' });
    await expect(analyzeProductEvidence(request({ filesByAssetId: new Map() }))).rejects.toMatchObject({ code: 'MISSING_MEDIA' });
    await expect(analyzeProductEvidence(request({ filesByAssetId: new Map([['asset-1', new File(['bytes'], 'a.png', { type: 'image/png' })]]) }))).rejects.toMatchObject({ code: 'INVALID_MEDIA' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects malformed, mismatched, and provider-detail responses without exposing details', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('not json', { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, evidence: { ...evidence(), productId: 'other-product' } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: false, error: { code: 'ANALYSIS_RATE_LIMITED', detail: 'raw provider secret' } }), { status: 429 }));
    vi.stubGlobal('fetch', fetchMock);
    for (const expected of ['INVALID_RESPONSE', 'INVALID_RESPONSE', 'ANALYSIS_RATE_LIMITED']) {
      await expect(analyzeProductEvidence(request())).rejects.toMatchObject({ code: expected });
    }
  });

  it('rejects a response that leaks a logical asset ID into user-facing evidence prose', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, evidence: { ...evidence(), identityDescription: 'The product in asset-1 is visible.' } }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(analyzeProductEvidence(request())).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });

  it('maps recognized safe server errors and network failures to browser-safe codes', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: false, error: { code: 'ANALYSIS_UNAVAILABLE' } }), { status: 503 }))
      .mockRejectedValueOnce(new Error('network transport detail'));
    vi.stubGlobal('fetch', fetchMock);
    await expect(analyzeProductEvidence(request())).rejects.toMatchObject({ code: 'ANALYSIS_UNAVAILABLE' });
    try { await analyzeProductEvidence(request()); } catch (error) {
      expect(error).toBeInstanceOf(ProductEvidenceClientError);
      expect(error).toMatchObject({ code: 'NETWORK_ERROR' });
      expect(String(error)).not.toContain('transport detail');
    }
  });

  it('preserves only Product Evidence validator categories while distinguishing provider invalid output', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: false, error: { code: 'PRODUCT_EVIDENCE_INVALID_MODEL_OUTPUT', issueCodes: ['unknown_canonical_asset'] } }), { status: 502 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: false, error: { code: 'PROVIDER_INVALID_RESPONSE' } }), { status: 502 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(analyzeProductEvidence(request())).rejects.toMatchObject({ code: 'PRODUCT_EVIDENCE_INVALID_MODEL_OUTPUT', issueCodes: ['unknown_canonical_asset'] });
    await expect(analyzeProductEvidence(request())).rejects.toMatchObject({ code: 'PROVIDER_INVALID_RESPONSE', issueCodes: [] });
  });

  it('accepts exact static material diagnostic detail codes', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ok: false,
      error: {
        code: 'PRODUCT_EVIDENCE_INVALID_MODEL_OUTPUT',
        issueCodes: [
          'unsupported_visual_material',
          'unsupported_visual_material_group_rubber',
          'material_certainty_uncertainty_overlap',
          'material_certainty_uncertainty_overlap_group_plastic'
        ]
      }
    }), { status: 502 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(analyzeProductEvidence(request())).rejects.toMatchObject({
      code: 'PRODUCT_EVIDENCE_INVALID_MODEL_OUTPUT',
      issueCodes: [
        'unsupported_visual_material',
        'unsupported_visual_material_group_rubber',
        'material_certainty_uncertainty_overlap',
        'material_certainty_uncertainty_overlap_group_plastic'
      ]
    });
  });

  it('rejects unknown and malformed material diagnostic detail codes fail-closed', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: false, error: { code: 'PRODUCT_EVIDENCE_INVALID_MODEL_OUTPUT', issueCodes: ['unsupported_visual_material_group_unknown'] } }), { status: 502 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: false, error: { code: 'PRODUCT_EVIDENCE_INVALID_MODEL_OUTPUT', issueCodes: ['unsupported_visual_material_group_rubber:asset-private-7b4b3d'] } }), { status: 502 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(analyzeProductEvidence(request())).rejects.toMatchObject({ code: 'INVALID_RESPONSE', issueCodes: [] });
    await expect(analyzeProductEvidence(request())).rejects.toMatchObject({ code: 'INVALID_RESPONSE', issueCodes: [] });
  });
});
