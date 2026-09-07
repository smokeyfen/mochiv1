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
  fireEvent.change(screen.getByLabelText('Audience'), { target: { value: 'Skincare shoppers' } });
  fireEvent.change(screen.getByLabelText('Shooting Context'), { target: { value: 'Vanity in daylight' } });
  fireEvent.change(screen.getByLabelText('Reviewer Persona'), { target: { value: 'Practical reviewer' } });
  fireEvent.change(screen.getByLabelText('Tone'), { target: { value: 'Warm and factual' } });
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

describe('App', () => {
  it('renders canonical product and creative form fields', () => {
    render(<App />);
    for (const label of ['Product Name', 'Product Details', 'Category', 'Add product images', 'Audience', 'Shooting Context', 'Reviewer Persona', 'Tone', 'Voice Gender']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
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
    expect(preview.creativeDirection.audience).toBe('Skincare shoppers');
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
    fireEvent.change(screen.getByLabelText('Audience'), { target: { value: 'New audience' } });
    expect(screen.queryByText('READY_FOR_ANALYSIS')).not.toBeInTheDocument();

    submitProject();
    fireEvent.change(screen.getByLabelText('Voice Gender'), { target: { value: 'MALE' } });
    expect(screen.queryByText('READY_FOR_ANALYSIS')).not.toBeInTheDocument();

  });

  it('locks the V1 voice surface to Female or Male with South review metadata', () => {
    render(<App />);
    enterValidProjectInput();
    fireEvent.change(screen.getByLabelText('Voice Gender'), { target: { value: 'MALE' } });
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
    expect(screen.queryByText(/Gemini|Flow|generate/i)).not.toBeInTheDocument();
  });

  it('posts factual product input only and renders validated Product Evidence', async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(evidenceResponse()));
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);
    enterValidProjectInput();
    fireEvent.click(screen.getByRole('button', { name: 'Analyze Product' }));
    expect(screen.getByRole('status')).toHaveTextContent('ANALYZING PRODUCT');
    await waitFor(() => expect(screen.getByText('PRODUCT_ANALYSIS_READY')).toBeInTheDocument());
    expect(screen.getByText('A compact white bottle')).toBeInTheDocument();
    expect(screen.getByText('Physical Evidence')).toBeInTheDocument();
    expect(screen.getByText('REFERENCE_EVIDENCE')).toBeInTheDocument();
    expect(screen.getByText('ALLOWED')).toBeInTheDocument();
    expect(screen.getByText('1 reference')).toBeInTheDocument();
    expect(screen.getByText('No recorded uncertainties.')).toBeInTheDocument();
    const body = fetchMock.mock.calls[0]?.[1]?.body as FormData;
    expect(JSON.parse(body.get('product') as string)).not.toHaveProperty('creativeDirection');
    expect([...body.keys()]).toEqual(['product', expect.stringMatching(/^asset:asset-/)]);
  });

  it('clears product evidence immediately after a factual edit and ignores a late result', async () => {
    let resolveFetch: ((value: Response) => void) | undefined;
    const fetchMock = vi.fn().mockImplementation(() => new Promise<Response>(resolve => { resolveFetch = resolve; }));
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);
    enterValidProjectInput();
    fireEvent.click(screen.getByRole('button', { name: 'Analyze Product' }));
    expect(screen.getByRole('status')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Product Name'), { target: { value: 'Changed bottle' } });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByText('Add factual product input and reference images, then analyze the product.')).toBeInTheDocument();
    resolveFetch!(evidenceResponse());
    await Promise.resolve();
    expect(screen.queryByText('PRODUCT_ANALYSIS_READY')).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('keeps evidence through creative edits but clears it on adding or removing a reference', async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(evidenceResponse()));
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);
    enterValidProjectInput();
    fireEvent.click(screen.getByRole('button', { name: 'Analyze Product' }));
    await waitFor(() => expect(screen.getByText('PRODUCT_ANALYSIS_READY')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Audience'), { target: { value: 'A new audience' } });
    expect(screen.getByText('PRODUCT_ANALYSIS_READY')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledOnce();
    selectProductImage('side.jpg');
    expect(screen.queryByText('PRODUCT_ANALYSIS_READY')).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove reference' })[0]!);
    expect(screen.getByText('Add factual product input and reference images, then analyze the product.')).toBeInTheDocument();
  });

  it('keeps provider and malformed response details out of the user-facing error', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: false, error: { code: 'ANALYSIS_UNAVAILABLE', detail: 'Bearer raw-secret' } }), { status: 503 }));
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);
    enterValidProjectInput();
    fireEvent.click(screen.getByRole('button', { name: 'Analyze Product' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('ANALYSIS UNAVAILABLE'));
    expect(screen.getByRole('alert')).not.toHaveTextContent('raw-secret');
    expect(screen.getByRole('alert')).not.toHaveTextContent('Bearer');
  });

  it('renders each claim allowed state directly without exposing supporting asset IDs', async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(evidenceResponse(assetIds => [
      { claimId: 'claim-allowed', text: 'Reference-supported bottle', source: 'REFERENCE_EVIDENCE', evidenceAssetIds: [...assetIds, ...assetIds], allowed: true },
      { claimId: 'claim-blocked', text: 'Unverified marketing claim', source: 'USER_INPUT', evidenceAssetIds: [], allowed: false }
    ])));
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);
    enterValidProjectInput();
    fireEvent.click(screen.getByRole('button', { name: 'Analyze Product' }));
    await waitFor(() => expect(screen.getByText('Reference-supported bottle')).toBeInTheDocument());
    expect(screen.getByText('REFERENCE_EVIDENCE')).toBeInTheDocument();
    expect(screen.getByText('USER_INPUT')).toBeInTheDocument();
    expect(screen.getByText('ALLOWED')).toBeInTheDocument();
    expect(screen.getByText('NOT ALLOWED')).toBeInTheDocument();
    expect(screen.getByText('2 references')).toBeInTheDocument();
    const body = fetchMock.mock.calls[0]?.[1]?.body as FormData;
    const assetId = (JSON.parse(body.get('product') as string) as { assets: readonly { assetId: string }[] }).assets[0]!.assetId;
    expect(screen.queryByText(assetId)).not.toBeInTheDocument();
    expect(screen.getByText('Unverified marketing claim').parentElement).toHaveTextContent('NOT ALLOWED');
  });
});
