import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  SCHEMA_VERSION,
  validateMochiProjectInput,
  type AssetRef,
  type AssetRole,
  type MochiProjectInput,
  type VoiceGender,
  type VoiceRegion
} from '@mochi/contracts';

const PRODUCT_REFERENCE_ROLES = [
  'PRODUCT_FRONT',
  'PRODUCT_SIDE',
  'PRODUCT_BACK',
  'PRODUCT_IN_HAND'
] as const satisfies readonly AssetRole[];
type ProductReferenceRole = typeof PRODUCT_REFERENCE_ROLES[number];

interface ReferenceAssetState {
  readonly asset: AssetRef;
  readonly previewUrl: string;
}

function createLogicalId(prefix: string): string {
  const randomId = globalThis.crypto?.randomUUID?.();
  return `${prefix}-${randomId ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

function createPreviewUrl(file: File): string {
  return typeof URL.createObjectURL === 'function'
    ? URL.createObjectURL(file)
    : `preview-${createLogicalId('asset')}`;
}

function revokePreviewUrl(url: string): void {
  if (typeof URL.revokeObjectURL === 'function' && url.startsWith('blob:')) URL.revokeObjectURL(url);
}

const formatIssue = (issue: string): string => issue.replaceAll('_', ' ');

export function App() {
  const [projectId] = useState(() => createLogicalId('project'));
  const [productId] = useState(() => createLogicalId('product'));
  const [productName, setProductName] = useState('');
  const [productDetails, setProductDetails] = useState('');
  const [category, setCategory] = useState('');
  const [audience, setAudience] = useState('');
  const [shootingContext, setShootingContext] = useState('');
  const [reviewerPersona, setReviewerPersona] = useState('');
  const [tone, setTone] = useState('');
  const [voiceStyle, setVoiceStyle] = useState('');
  const [voiceGender, setVoiceGender] = useState<VoiceGender>('FEMALE');
  const [voiceRegion, setVoiceRegion] = useState<VoiceRegion>('SOUTH');
  const [referenceAssets, setReferenceAssets] = useState<readonly ReferenceAssetState[]>([]);
  const [validationIssues, setValidationIssues] = useState<readonly string[]>([]);
  const [readyInput, setReadyInput] = useState<MochiProjectInput | null>(null);
  const filesByAssetId = useRef(new Map<string, File>());
  const previewUrls = useRef(new Set<string>());

  useEffect(() => () => {
    for (const previewUrl of previewUrls.current) revokePreviewUrl(previewUrl);
    previewUrls.current.clear();
    filesByAssetId.current.clear();
  }, []);

  const buildProjectInput = (): MochiProjectInput => ({
    schemaVersion: SCHEMA_VERSION,
    projectId,
    product: {
      schemaVersion: SCHEMA_VERSION,
      productId,
      name: productName,
      details: productDetails,
      category,
      assets: referenceAssets.map(reference => reference.asset)
    },
    creativeDirection: { audience, shootingContext, reviewerPersona, tone, voiceStyle, voiceGender, voiceRegion }
  });

  const handleReferenceSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const additions = Array.from(event.target.files ?? [])
      .filter(file => file.type.startsWith('image/'))
      .map(file => {
        const assetId = createLogicalId('asset');
        const previewUrl = createPreviewUrl(file);
        filesByAssetId.current.set(assetId, file);
        previewUrls.current.add(previewUrl);
        return {
          asset: {
            schemaVersion: SCHEMA_VERSION,
            assetId,
            role: 'PRODUCT_FRONT' as const,
            source: 'UPLOAD' as const,
            mimeType: file.type
          },
          previewUrl
        };
      });
    setReferenceAssets(current => [...current, ...additions]);
    event.target.value = '';
  };

  const updateReferenceRole = (assetId: string, role: ProductReferenceRole) => {
    setReferenceAssets(current => current.map(reference => reference.asset.assetId === assetId
      ? { ...reference, asset: { ...reference.asset, role } }
      : reference
    ));
  };

  const removeReference = (assetId: string) => {
    const removed = referenceAssets.find(reference => reference.asset.assetId === assetId);
    if (removed !== undefined) {
      revokePreviewUrl(removed.previewUrl);
      previewUrls.current.delete(removed.previewUrl);
      filesByAssetId.current.delete(assetId);
    }
    setReferenceAssets(current => current.filter(reference => reference.asset.assetId !== assetId));
    setReadyInput(null);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const projectInput = buildProjectInput();
    const issues = validateMochiProjectInput(projectInput);
    setValidationIssues(issues);
    setReadyInput(issues.length === 0 ? projectInput : null);
  };

  return (
    <main className="shell">
      <header className="page-header">
        <p className="eyebrow">MochiV1 · Project setup</p>
        <h1>POV On-Hand Review</h1>
        <p>Enter factual product details and creative direction. Analysis begins only after the canonical input is valid.</p>
      </header>

      <form className="project-form" noValidate onSubmit={submit}>
        <section aria-labelledby="product-title">
          <h2 id="product-title">Product</h2>
          <div className="field-grid">
            <label>Product Name<input value={productName} onChange={event => setProductName(event.target.value)} /></label>
            <label>Category<input value={category} onChange={event => setCategory(event.target.value)} /></label>
          </div>
          <label>Product Details<textarea rows={4} value={productDetails} onChange={event => setProductDetails(event.target.value)} /></label>

          <div className="references" aria-labelledby="references-title">
            <div><h3 id="references-title">Product reference images</h3><p>Images are browser runtime state. The project contract keeps logical asset references only.</p></div>
            <label className="file-picker">Add product images<input aria-label="Add product images" type="file" accept="image/*" multiple onChange={handleReferenceSelection} /></label>
          </div>
          {referenceAssets.length > 0 && (
            <ul className="reference-list" aria-label="Selected product reference images">
              {referenceAssets.map(reference => (
                <li key={reference.asset.assetId} className="reference-card">
                  <img src={reference.previewUrl} alt={`Preview for ${reference.asset.assetId}`} />
                  <div>
                    <label>Reference role for {reference.asset.assetId}
                      <select value={reference.asset.role} onChange={event => updateReferenceRole(reference.asset.assetId, event.target.value as ProductReferenceRole)}>
                        {PRODUCT_REFERENCE_ROLES.map(role => <option key={role} value={role}>{role}</option>)}
                      </select>
                    </label>
                    <p>{reference.asset.mimeType}</p>
                    <button type="button" className="secondary-button" onClick={() => removeReference(reference.asset.assetId)}>Remove reference</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="creative-title">
          <h2 id="creative-title">Creative Direction</h2>
          <div className="field-grid">
            <label>Audience<input value={audience} onChange={event => setAudience(event.target.value)} /></label>
            <label>Shooting Context<input value={shootingContext} onChange={event => setShootingContext(event.target.value)} /></label>
            <label>Reviewer Persona<input value={reviewerPersona} onChange={event => setReviewerPersona(event.target.value)} /></label>
            <label>Tone<input value={tone} onChange={event => setTone(event.target.value)} /></label>
            <label>Voice Style<input value={voiceStyle} onChange={event => setVoiceStyle(event.target.value)} /></label>
            <label>Voice Gender<select value={voiceGender} onChange={event => setVoiceGender(event.target.value as VoiceGender)}><option value="FEMALE">FEMALE</option><option value="MALE">MALE</option></select></label>
            <label>Voice Region<select value={voiceRegion} onChange={event => setVoiceRegion(event.target.value as VoiceRegion)}><option value="SOUTH">SOUTH</option><option value="NORTH">NORTH</option></select></label>
          </div>
        </section>

        <button className="primary-button" type="submit">Validate project input</button>
      </form>

      {validationIssues.length > 0 && (
        <section className="validation-errors" aria-labelledby="validation-title" role="alert">
          <h2 id="validation-title">Project input needs attention</h2>
          <ul>{validationIssues.map(issue => <li key={issue}>{formatIssue(issue)}</li>)}</ul>
        </section>
      )}

      {readyInput !== null && (
        <section className="ready-state" aria-labelledby="ready-title">
          <p className="status-label">READY_FOR_ANALYSIS</p>
          <h2 id="ready-title">Canonical MochiProjectInput</h2>
          <p>This development preview contains only the validated provider-neutral project contract.</p>
          <pre data-testid="canonical-input-preview">{JSON.stringify(readyInput, null, 2)}</pre>
        </section>
      )}
    </main>
  );
}
