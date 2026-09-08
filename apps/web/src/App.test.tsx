import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

const createObjectUrl = vi.fn((file: File) => `blob:preview-${file.name}`);
const revokeObjectUrl = vi.fn();

beforeEach(() => {
  createObjectUrl.mockClear();
  revokeObjectUrl.mockClear();
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectUrl });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectUrl });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function selectProductImages(names: readonly string[] = ['front.jpg']) {
  const images = names.map(name => new File(['image bytes'], name, { type: 'image/jpeg' }));
  fireEvent.change(screen.getByLabelText('Add product images'), { target: { files: images } });
}

function selectProductImage(name = 'front.jpg') {
  selectProductImages([name]);
}

function enterValidProjectInput() {
  fireEvent.change(screen.getByLabelText('Product Name'), { target: { value: 'Mochi bottle' } });
  fireEvent.change(screen.getByLabelText('Product Details'), { target: { value: 'Factual bottle description' } });
  fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'Beauty' } });
  fireEvent.change(screen.getByLabelText('Audience'), { target: { value: 'PRACTICAL_BUYERS' } });
  fireEvent.change(screen.getByLabelText('Shooting Context'), { target: { value: 'INDOOR_TABLE_REVIEW' } });
  selectProductImage();
}

function submitProject() {
  fireEvent.click(screen.getByRole('button', { name: 'Validate project input' }));
}

function evidenceResponse(claims?: readonly Record<string, unknown>[] | ((assetIds: readonly string[]) => readonly Record<string, unknown>[])): Response {
  const request = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
  const body = request.mock.calls.at(-1)?.[1]?.body as FormData;
  const product = JSON.parse(body.get('product') as string) as { productId: string; assets: readonly { assetId: string }[] };
  return new Response(JSON.stringify({
    ok: true,
    evidence: {
      schemaVersion: '1.0.0', productId: product.productId, canonicalAssetIds: product.assets.map(asset => asset.assetId),
      identityDescription: 'A compact white bottle', geometryNotes: ['Rounded bottle'], colorNotes: ['White'], packagingNotes: ['Pump top'], labelNotes: ['Front label'],
      claims: typeof claims === 'function' ? claims(product.assets.map(asset => asset.assetId)) : claims ?? [{ claimId: 'claim-1', text: 'Bottle shown in reference', source: 'REFERENCE_EVIDENCE', evidenceAssetIds: product.assets.map(asset => asset.assetId), allowed: true }],
      prohibitedInferences: ['Do not infer ingredients'], uncertainties: [], contradictions: []
    }
  }), { status: 200, headers: { 'content-type': 'application/json' } });
}
const statusResponse=(status:'GEMINI_READY'|'GEMINI_NOT_CONFIGURED') => new Response(JSON.stringify({ok:true,status}),{status:200,headers:{'content-type':'application/json'}});
function mockReadyRuntime(analysis:(()=>Response)|undefined=undefined) {
  const fetchMock=vi.fn().mockImplementation((url:unknown)=>String(url)==='/api/runtime/status'?Promise.resolve(statusResponse('GEMINI_READY')):Promise.resolve(analysis?.() ?? new Response('{}')));
  vi.stubGlobal('fetch',fetchMock); return fetchMock;
}

describe('App', () => {
  it('renders the simplified deterministic creative controls', () => {
    render(<App />);
    for (const label of ['Product Name', 'Product Details', 'Category', 'Add product images', 'Audience', 'Shooting Context']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
    expect(screen.getByLabelText('Audience').tagName).toBe('SELECT');
    expect(screen.getByLabelText('Shooting Context').tagName).toBe('SELECT');
    expect(screen.getAllByRole('option', { name: /Tự động theo sản phẩm/ })).toHaveLength(2);
    expect(screen.getByLabelText('Audience')).toHaveValue('AUTO_PRODUCT_FIT');
    expect(screen.getByLabelText('Shooting Context')).toHaveValue('AUTO_PRODUCT_FIT');
    expect(screen.queryByLabelText('Reviewer Persona')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Tone')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'NỮ' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'NAM' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByLabelText('Voice Style')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Voice Region')).not.toBeInTheDocument();
  });

  it('fails closed when blank input is submitted', () => {
    render(<App />);
    submitProject();
    expect(screen.getByRole('alert')).toHaveTextContent('Project input needs attention');
    expect(screen.queryByText('READY_FOR_ANALYSIS')).not.toBeInTheDocument();
  });

  it('builds a valid canonical input with audience under creativeDirection', () => {
    render(<App />);
    enterValidProjectInput();
    submitProject();
    expect(screen.getByText('READY_FOR_ANALYSIS')).toBeInTheDocument();
    const preview = JSON.parse(screen.getByTestId('canonical-input-preview').textContent ?? '{}');
    expect(preview.projectId).toMatch(/^project-/);
    expect(preview.product.productId).toMatch(/^product-/);
    expect(preview.creativeDirection.audience).toBe('PRACTICAL_BUYERS');
    expect(preview.product.audience).toBeUndefined();
    expect(preview.creativeDirection).toMatchObject({ voiceGender: 'FEMALE', voiceRegion: 'SOUTH' });
  });

  it('invalidates READY_FOR_ANALYSIS after product edits and requires revalidation', () => {
    render(<App />);
    enterValidProjectInput();
    submitProject();
    expect(screen.getByText('READY_FOR_ANALYSIS')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Product Name'), { target: { value: 'Updated Mochi bottle' } });
    expect(screen.queryByText('READY_FOR_ANALYSIS')).not.toBeInTheDocument();
    expect(screen.queryByTestId('canonical-input-preview')).not.toBeInTheDocument();

    submitProject();
    const preview = JSON.parse(screen.getByTestId('canonical-input-preview').textContent ?? '{}');
    expect(preview.product.name).toBe('Updated Mochi bottle');
  });

  it('invalidates READY_FOR_ANALYSIS after creative or voice gender edits', () => {
    render(<App />);
    enterValidProjectInput();
    submitProject();
    fireEvent.change(screen.getByLabelText('Audience'), { target: { value: 'GIFT_BUYERS' } });
    expect(screen.queryByText('READY_FOR_ANALYSIS')).not.toBeInTheDocument();

    submitProject();
    fireEvent.click(screen.getByRole('button', { name: 'NAM' }));
    expect(screen.queryByText('READY_FOR_ANALYSIS')).not.toBeInTheDocument();

  });

  it('locks the V1 voice surface to Female or Male with South review metadata', () => {
    render(<App />);
    enterValidProjectInput();
    fireEvent.click(screen.getByRole('button', { name: 'NAM' }));
    submitProject();
    const preview = JSON.parse(screen.getByTestId('canonical-input-preview').textContent ?? '{}');
    expect(preview.creativeDirection).toMatchObject({ voiceGender: 'MALE', voiceRegion: 'SOUTH', voiceStyle: 'review' });
    expect(screen.queryByRole('option', { name: 'NORTH' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Voice Region')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Voice Style')).not.toBeInTheDocument();
  });

  it('creates a generic logical product reference and removes it from canonical input', () => {
    render(<App />);
    enterValidProjectInput();
    expect(screen.getByAltText(/Preview for asset-/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Reference role for asset-/)).not.toBeInTheDocument();
    submitProject();
    const preview = JSON.parse(screen.getByTestId('canonical-input-preview').textContent ?? '{}');
    expect(preview.product.assets[0]).toMatchObject({ role: 'PRODUCT_REFERENCE', source: 'UPLOAD', mimeType: 'image/jpeg' });
    fireEvent.click(screen.getByRole('button', { name: 'Remove reference' }));
    expect(screen.queryByText('READY_FOR_ANALYSIS')).not.toBeInTheDocument();
    submitProject();
    expect(screen.getByRole('alert')).toHaveTextContent('assets required');
    expect(screen.queryByText('READY_FOR_ANALYSIS')).not.toBeInTheDocument();
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:preview-front.jpg');
  });

  it('removes a selected image from a still-valid canonical input', () => {
    render(<App />);
    enterValidProjectInput();
    selectProductImage('side.jpg');
    submitProject();
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove reference' })[0]!);
    submitProject();
    const preview = JSON.parse(screen.getByTestId('canonical-input-preview').textContent ?? '{}');
    expect(preview.product.assets).toHaveLength(1);
    expect(preview.product.assets[0].assetId).not.toBeUndefined();
  });

  it('assigns PRODUCT_REFERENCE to multiple arbitrary uploads and invalidates READY_FOR_ANALYSIS on add/remove', () => {
    render(<App />);
    enterValidProjectInput();
    submitProject();
    selectProductImages(['any-order-one.jpg', 'any-order-two.png']);
    expect(screen.queryByText('READY_FOR_ANALYSIS')).not.toBeInTheDocument();

    submitProject();
    const preview = JSON.parse(screen.getByTestId('canonical-input-preview').textContent ?? '{}');
    expect(preview.product.assets).toHaveLength(3);
    expect(preview.product.assets.every((asset: { role: string }) => asset.role === 'PRODUCT_REFERENCE')).toBe(true);
    expect(screen.queryByRole('combobox', { name: /reference role/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Remove reference' })[0]!);
    expect(screen.queryByText('READY_FOR_ANALYSIS')).not.toBeInTheDocument();
  });

  it('keeps browser runtime data out of canonical preview while exposing the Product Analysis action', () => {
    render(<App />);
    enterValidProjectInput();
    submitProject();
    const preview = screen.getByTestId('canonical-input-preview').textContent ?? '';
    expect(preview).not.toContain('blob:');
    expect(preview).not.toContain('front.jpg');
    expect(preview).not.toMatch(/[A-Z]:\\|\/Users\/|\/home\//);
    expect(preview).not.toMatch(/File|Blob|Gemini|Flow|generate/i);
    expect(screen.getByRole('button', { name: 'Analyze Product' })).toBeInTheDocument();
    expect(screen.getByText('Runtime Setup')).toBeInTheDocument();
  });

  it('posts factual product input only and renders validated Product Evidence', async () => {
    const fetchMock = mockReadyRuntime(() => evidenceResponse());
    render(<App />);
    enterValidProjectInput();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Analyze Product' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Analyze Product' }));
    expect(screen.getByRole('status')).toHaveTextContent('ANALYZING PRODUCT');
    await waitFor(() => expect(screen.getByText('PRODUCT_ANALYSIS_READY')).toBeInTheDocument());
    expect(screen.getByText('A compact white bottle')).toBeInTheDocument();
    expect(screen.getByText('Physical Evidence')).toBeInTheDocument();
    expect(screen.getByText('REFERENCE_EVIDENCE')).toBeInTheDocument();
    expect(screen.getByText('ALLOWED')).toBeInTheDocument();
    expect(screen.getByText('1 reference')).toBeInTheDocument();
    expect(screen.getByText('No recorded uncertainties.')).toBeInTheDocument();
    const body = fetchMock.mock.calls.find(call => String(call[0]) === '/api/product-evidence')?.[1]?.body as FormData;
    expect(JSON.parse(body.get('product') as string)).not.toHaveProperty('creativeDirection');
    expect([...body.keys()]).toEqual(['product', expect.stringMatching(/^asset:asset-/)]);
  });

  it('clears product evidence immediately after a factual edit and ignores a late result', async () => {
    let resolveFetch: ((value: Response) => void) | undefined;
    const fetchMock = vi.fn().mockImplementation((url:unknown) => String(url)==='/api/runtime/status'?Promise.resolve(statusResponse('GEMINI_READY')):new Promise<Response>(resolve => { resolveFetch = resolve; }));
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);
    enterValidProjectInput();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Analyze Product' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Analyze Product' }));
    expect(screen.getByRole('status')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Product Name'), { target: { value: 'Changed bottle' } });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByText('Add factual product input and reference images, then analyze the product.')).toBeInTheDocument();
    resolveFetch!(evidenceResponse());
    await Promise.resolve();
    expect(screen.queryByText('PRODUCT_ANALYSIS_READY')).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(call => String(call[0]) === '/api/product-evidence')).toHaveLength(1);
  });

  it('keeps evidence through creative edits but clears it on adding or removing a reference', async () => {
    const fetchMock = mockReadyRuntime(() => evidenceResponse());
    render(<App />);
    enterValidProjectInput();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Analyze Product' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Analyze Product' }));
    await waitFor(() => expect(screen.getByText('PRODUCT_ANALYSIS_READY')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Audience'), { target: { value: 'YOUNG_ADULTS_GEN_Z' } });
    expect(screen.getByText('PRODUCT_ANALYSIS_READY')).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(call => String(call[0]) === '/api/product-evidence')).toHaveLength(1);
    selectProductImage('side.jpg');
    expect(screen.queryByText('PRODUCT_ANALYSIS_READY')).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove reference' })[0]!);
    expect(screen.getByText('Add factual product input and reference images, then analyze the product.')).toBeInTheDocument();
  });

  it('keeps provider and malformed response details out of the user-facing error', async () => {
    mockReadyRuntime(() => new Response(JSON.stringify({ ok: false, error: { code: 'ANALYSIS_UNAVAILABLE', detail: 'Bearer raw-secret' } }), { status: 503 }));
    render(<App />);
    enterValidProjectInput();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Analyze Product' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Analyze Product' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('ANALYSIS UNAVAILABLE'));
    expect(screen.getByRole('alert')).not.toHaveTextContent('raw-secret');
    expect(screen.getByRole('alert')).not.toHaveTextContent('Bearer');
  });

  it('renders each claim allowed state directly without exposing supporting asset IDs', async () => {
    const fetchMock = mockReadyRuntime(() => evidenceResponse(assetIds => [
      { claimId: 'claim-allowed', text: 'Reference-supported bottle', source: 'REFERENCE_EVIDENCE', evidenceAssetIds: [...assetIds, ...assetIds], allowed: true },
      { claimId: 'claim-blocked', text: 'Unverified marketing claim', source: 'USER_INPUT', evidenceAssetIds: [], allowed: false }
    ]));
    render(<App />);
    enterValidProjectInput();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Analyze Product' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Analyze Product' }));
    await waitFor(() => expect(screen.getByText('Reference-supported bottle')).toBeInTheDocument());
    expect(screen.getByText('REFERENCE_EVIDENCE')).toBeInTheDocument();
    expect(screen.getByText('USER_INPUT')).toBeInTheDocument();
    expect(screen.getByText('ALLOWED')).toBeInTheDocument();
    expect(screen.getByText('NOT ALLOWED')).toBeInTheDocument();
    expect(screen.getByText('2 references')).toBeInTheDocument();
    const body = fetchMock.mock.calls.find(call => String(call[0]) === '/api/product-evidence')?.[1]?.body as FormData;
    const assetId = (JSON.parse(body.get('product') as string) as { assets: readonly { assetId: string }[] }).assets[0]!.assetId;
    expect(screen.queryByText(assetId)).not.toBeInTheDocument();
    expect(screen.getByText('Unverified marketing claim').parentElement).toHaveTextContent('NOT ALLOWED');
  });

  it('owns Runtime Setup before analysis and gates analysis through safe server status', async () => {
    const apiKey='browser-only-test-secret';
    const fetchMock=vi.fn().mockImplementation((url:unknown, init?:RequestInit) => {
      const path=String(url);
      if(path==='/api/runtime/status') return Promise.resolve(statusResponse('GEMINI_NOT_CONFIGURED'));
      if(path==='/api/runtime/connect') { expect(JSON.parse(String(init?.body))).toEqual({apiKey}); return Promise.resolve(statusResponse('GEMINI_READY')); }
      if(path==='/api/runtime/disconnect') return Promise.resolve(statusResponse('GEMINI_NOT_CONFIGURED'));
      return Promise.resolve(evidenceResponse());
    });
    vi.stubGlobal('fetch',fetchMock);
    render(<App />);
    expect(screen.getByText('Runtime Setup')).toBeInTheDocument();
    expect(screen.queryByText('Production Workspace')).not.toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/runtime/status'));
    const analyze=screen.getByRole('button',{name:'Analyze Product'});
    expect(analyze).toBeDisabled();
    expect(screen.getByText('Connect Gemini to analyze the product.')).toBeInTheDocument();
    enterValidProjectInput();
    const selectedBefore=screen.getByAltText(/Preview for asset-/).getAttribute('src');
    fireEvent.change(screen.getByLabelText('Gemini API Key'),{target:{value:apiKey}});
    fireEvent.click(screen.getByRole('button',{name:'Connect'}));
    await waitFor(() => expect(screen.getByText('GEMINI_READY')).toBeInTheDocument());
    expect(analyze).toBeEnabled();
    expect(document.body.textContent).not.toContain(apiKey);
    expect(window.localStorage.getItem('GEMINI_API_KEY')).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:'Disconnect'}));
    await waitFor(() => expect(screen.getByText('GEMINI_NOT_CONFIGURED')).toBeInTheDocument());
    expect(analyze).toBeDisabled();
    expect(screen.getByAltText(/Preview for asset-/).getAttribute('src')).toBe(selectedBefore);
  });
});
