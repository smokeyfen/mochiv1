import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App, DeliveryCenter } from './App';
import type { DeliveryManifest } from './production-client';

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

const delivery:DeliveryManifest={version:'DELIVERY_PACKAGE_V1',status:'READY_FOR_DELIVERY',outputs:[
  {filename:'scene-01.mp4',mimeType:'video/mp4'},{filename:'scene-02.mp4',mimeType:'video/mp4'},{filename:'scene-03.mp4',mimeType:'video/mp4'},{filename:'scene-04.mp4',mimeType:'video/mp4'},{filename:'key-points.txt',mimeType:'text/plain; charset=utf-8'}
]};

function evidenceResponse(claims?: readonly Record<string, unknown>[] | ((assetIds: readonly string[]) => readonly Record<string, unknown>[])): Response {
  const request = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
  const body = request.mock.calls.at(-1)?.[1]?.body as FormData;
  const product = JSON.parse(body.get('product') as string) as { productId: string; assets: readonly { assetId: string }[] };
  return new Response(JSON.stringify({
    ok: true,
    analysisReceiptId: 'par_test_receipt_0123456789', receiptVersion: 'PRODUCT_ANALYSIS_RECEIPT_V1',
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

  it('derives setup readiness without a manual validation action', () => {
    render(<App />);
    expect(screen.getByRole('alert')).toHaveTextContent('Setup needs attention');
    expect(screen.queryByRole('button', { name: /Validate project input/i })).not.toBeInTheDocument();
  });

  it('builds a valid canonical input with audience under creativeDirection', () => {
    render(<App />);
    enterValidProjectInput();
    expect(screen.getByText('Setup ready')).toBeInTheDocument();
    expect(screen.getByRole('button',{name:'Create 4-scene plan'})).toBeDisabled();
  });

  it('keeps automatic validation current after product edits', () => {
    render(<App />);
    enterValidProjectInput();
    fireEvent.change(screen.getByLabelText('Product Name'), { target: { value: 'Updated Mochi bottle' } });
    expect(screen.getByText('Setup ready')).toBeInTheDocument();
  });

  it('keeps setup ready after creative or voice gender edits', () => {
    render(<App />);
    enterValidProjectInput();
    fireEvent.change(screen.getByLabelText('Audience'), { target: { value: 'GIFT_BUYERS' } });
    expect(screen.getByText('Setup ready')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'NAM' }));
    expect(screen.getByText('Setup ready')).toBeInTheDocument();

  });

  it('locks the V1 voice surface to Female or Male with South review metadata', () => {
    render(<App />);
    enterValidProjectInput();
    fireEvent.click(screen.getByRole('button', { name: 'NAM' }));
    expect(screen.queryByRole('option', { name: 'NORTH' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Voice Region')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Voice Style')).not.toBeInTheDocument();
  });

  it('creates a generic logical product reference and removes it from canonical input', () => {
    render(<App />);
    enterValidProjectInput();
    expect(screen.getByAltText('Product reference preview')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Reference role for asset-/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(screen.getByRole('alert')).toHaveTextContent('assets required');
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:preview-front.jpg');
  });

  it('removes a selected image from a still-valid canonical input', () => {
    render(<App />);
    enterValidProjectInput();
    selectProductImage('side.jpg');
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0]!);
    expect(screen.getAllByRole('button', { name: 'Remove' })).toHaveLength(1);
  });

  it('assigns PRODUCT_REFERENCE to multiple arbitrary uploads and invalidates READY_FOR_ANALYSIS on add/remove', () => {
    render(<App />);
    enterValidProjectInput();
    selectProductImages(['any-order-one.jpg', 'any-order-two.png']);
    expect(screen.queryByRole('combobox', { name: /reference role/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0]!);
  });

  it('keeps browser runtime data out of canonical preview while exposing the Product Analysis action', () => {
    render(<App />);
    enterValidProjectInput();
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
    await waitFor(() => expect(screen.getByText('Analysis locked to current product + references')).toBeInTheDocument());
    expect(screen.getByText('A compact white bottle')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'View analysis details'}));
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
    expect(screen.queryByText('Analysis locked to current product + references')).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(call => String(call[0]) === '/api/product-evidence')).toHaveLength(1);
  });

  it('keeps evidence through creative edits but clears it on adding or removing a reference', async () => {
    const fetchMock = mockReadyRuntime(() => evidenceResponse());
    render(<App />);
    enterValidProjectInput();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Analyze Product' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Analyze Product' }));
    await waitFor(() => expect(screen.getByText('Analysis locked to current product + references')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Audience'), { target: { value: 'YOUNG_ADULTS_GEN_Z' } });
    expect(screen.getByText('Analysis locked to current product + references')).toBeInTheDocument();
    expect(fetchMock.mock.calls.filter(call => String(call[0]) === '/api/product-evidence')).toHaveLength(1);
    selectProductImage('side.jpg');
    expect(screen.queryByText('Analysis locked to current product + references')).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0]!);
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
    await waitFor(() => expect(screen.getByText('Analysis locked to current product + references')).toBeInTheDocument()); fireEvent.click(screen.getByRole('button',{name:'View analysis details'}));
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
    expect(screen.getByLabelText('Gemini API Key')).toHaveValue('');
    expect(screen.getByRole('button',{name:'Connect'})).toBeInTheDocument();
    expect(screen.queryByRole('button',{name:'Disconnect'})).not.toBeInTheDocument();
    expect(screen.getByText('Connect Gemini to analyze the product.')).toBeInTheDocument();
    enterValidProjectInput();
    const selectedBefore=screen.getByAltText('Product reference preview').getAttribute('src');
    fireEvent.change(screen.getByLabelText('Gemini API Key'),{target:{value:apiKey}});
    fireEvent.click(screen.getByRole('button',{name:'Connect'}));
    await waitFor(() => expect(screen.getByText('GEMINI_READY')).toBeInTheDocument());
    expect(analyze).toBeEnabled();
    expect(screen.getByText('Model')).toBeInTheDocument();
    expect(screen.getByText('Gemini 3.5 Flash-Lite')).toBeInTheDocument();
    expect(screen.getByText('LOCKED')).toBeInTheDocument();
    expect(screen.queryByLabelText('Gemini API Key')).not.toBeInTheDocument();
    expect(screen.queryByRole('button',{name:'Connect'})).not.toBeInTheDocument();
    expect(screen.getByRole('button',{name:'Disconnect'})).toBeInTheDocument();
    expect(document.body.textContent).not.toContain(apiKey);
    expect(window.localStorage.getItem('GEMINI_API_KEY')).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:'Disconnect'}));
    await waitFor(() => expect(screen.getByText('GEMINI_NOT_CONFIGURED')).toBeInTheDocument());
    expect(screen.getByLabelText('Gemini API Key')).toHaveValue('');
    expect(screen.queryByText('LOCKED')).not.toBeInTheDocument();
    expect(analyze).toBeDisabled();
    expect(screen.getByAltText('Product reference preview').getAttribute('src')).toBe(selectedBefore);
  });

  it('renders the safe production runtime stage without exposing a raw failure', async () => {
    const fetchMock=vi.fn().mockImplementation((url:unknown) => {
      if(String(url)==='/api/runtime/status') return Promise.resolve(statusResponse('GEMINI_READY'));
      if(String(url)==='/api/product-evidence') return Promise.resolve(evidenceResponse());
      if(String(url)==='/api/production/build') return Promise.resolve(new Response(JSON.stringify({ok:false,error:{code:'PRODUCTION_BUILD_FAILED',stage:'R6_BOUNDED_REPLAN',trace:'provider exception raw-secret'}}),{status:400,headers:{'content-type':'application/json'}}));
      return Promise.resolve(new Response('{}'));
    });
    vi.stubGlobal('fetch',fetchMock);
    render(<App />);
    enterValidProjectInput();
    await waitFor(()=>expect(screen.getByRole('button',{name:'Analyze Product'})).toBeEnabled());
    fireEvent.click(screen.getByRole('button',{name:'Analyze Product'}));
    await waitFor(()=>expect(screen.getByText('Analysis locked to current product + references')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button',{name:'Create 4-scene plan'}));
    await waitFor(()=>expect(screen.getByRole('alert')).toHaveTextContent('The planned physical actions could not be validated.'));
    expect(screen.getByRole('alert')).not.toHaveTextContent('raw-secret');
    expect(screen.getByRole('alert')).not.toHaveTextContent('provider exception');
  });

  it('shows Delivery Center only after READY_FOR_DELIVERY and displays exactly five filenames', () => {
    render(<DeliveryCenter snapshotId="snapshot-1" delivery={{...delivery,status:'NOT_READY'}} onDelivery={vi.fn()} />);
    expect(screen.queryByRole('heading',{name:'Delivery'})).not.toBeInTheDocument();
    render(<DeliveryCenter snapshotId="snapshot-1" delivery={delivery} onDelivery={vi.fn()} />);
    expect(screen.getByRole('heading',{name:'Delivery'})).toBeInTheDocument();
    expect(delivery.outputs.map(output=>screen.getByText(output.filename))).toHaveLength(5);
  });

  it('downloads the exact requested individual delivery filename', async () => {
    const click=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{}); const bytes=new Uint8Array([7,8,9]);
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(bytes,{status:200})));
    render(<DeliveryCenter snapshotId="snapshot-1" delivery={delivery} onDelivery={vi.fn()} />);
    fireEvent.click(screen.getByRole('button',{name:'Download Scene 2'}));
    await waitFor(()=>expect(globalThis.fetch).toHaveBeenCalledWith('/api/production/delivery/scene-02.mp4?snapshotId=snapshot-1'));
    expect(click).toHaveBeenCalledTimes(1); const blob=createObjectUrl.mock.calls.at(-1)?.[0] as Blob; expect(blob.size).toBe(bytes.length);
  });

  it('writes all five exact outputs through the folder picker', async () => {
    const writes:{name:string;blob:Blob}[]=[]; const picker=vi.fn().mockResolvedValue({getFileHandle:async(name:string)=>({createWritable:async()=>({write:async(blob:Blob)=>{writes.push({name,blob});},close:async()=>{}})})}); Object.defineProperty(window,'showDirectoryPicker',{configurable:true,value:picker});
    const fetchMock=vi.fn().mockImplementation((url:unknown)=>String(url)==='/api/production/delivery/receipt'?Promise.resolve(new Response(JSON.stringify({ok:true,delivery:{...delivery,status:'DELIVERED'}}))):Promise.resolve(new Response(`bytes:${String(url)}`))); vi.stubGlobal('fetch',fetchMock); const onDelivery=vi.fn();
    render(<DeliveryCenter snapshotId="snapshot-1" delivery={delivery} onDelivery={onDelivery} />); fireEvent.click(screen.getByRole('button',{name:'Save 5 files to folder'}));
    await waitFor(()=>expect(onDelivery).toHaveBeenCalledWith(expect.objectContaining({status:'DELIVERED'}))); expect(writes.map(item=>item.name)).toEqual(delivery.outputs.map(output=>output.filename)); expect(writes.every(item=>item.blob.size>0)).toBe(true);
  });

  it('keeps individual-download fallback when the directory picker is unavailable', async () => {
    Object.defineProperty(window,'showDirectoryPicker',{configurable:true,value:undefined}); const click=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{}); const fetchMock=vi.fn().mockImplementation((url:unknown)=>String(url)==='/api/production/delivery/receipt'?Promise.resolve(new Response(JSON.stringify({ok:true,delivery:{...delivery,status:'DELIVERED'}}))):Promise.resolve(new Response('fallback'))); vi.stubGlobal('fetch',fetchMock);
    render(<DeliveryCenter snapshotId="snapshot-1" delivery={delivery} onDelivery={vi.fn()} />); fireEvent.click(screen.getByRole('button',{name:'Save 5 files to folder'}));
    await waitFor(()=>expect(fetchMock.mock.calls.filter(call=>String(call[0]).startsWith('/api/production/delivery/scene-'))).toHaveLength(4)); expect(fetchMock.mock.calls.some(call=>String(call[0]).includes('key-points.txt'))).toBe(true); expect(click).toHaveBeenCalledTimes(5);
  });
});
