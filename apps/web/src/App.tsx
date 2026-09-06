import { useEffect, useRef, useState, type ChangeEvent, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import {
  SCHEMA_VERSION,
  validateMochiProjectInput,
  type AssetRef,
  type MochiProjectInput,
  type ProductEvidence,
  type ProductInput,
  type VoiceGender,
  type VoiceRegion
} from '@mochi/contracts';
import { analyzeProductEvidence, ProductEvidenceClientError, type ProductEvidenceClientErrorCode } from './product-evidence-client';

interface ReferenceAssetState { readonly asset: AssetRef; readonly previewUrl: string; }
type AnalysisState = 'IDLE' | 'ANALYZING' | 'READY' | 'ERROR';

function createLogicalId(prefix: string): string {
  const randomId = globalThis.crypto?.randomUUID?.();
  return `${prefix}-${randomId ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

function createPreviewUrl(file: File): string {
  return typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : `preview-${createLogicalId('asset')}`;
}

function revokePreviewUrl(url: string): void {
  if (typeof URL.revokeObjectURL === 'function' && url.startsWith('blob:')) URL.revokeObjectURL(url);
}

const formatIssue = (issue: string): string => issue.replaceAll('_', ' ');
const formatAnalysisError = (code: ProductEvidenceClientErrorCode): string => code.replaceAll('_', ' ');

function Notes({ title, notes }: { readonly title: string; readonly notes: readonly string[] }) {
  return <section className="evidence-subsection"><h3>{title}</h3>{notes.length === 0 ? <p className="empty-evidence">No recorded evidence.</p> : <ul>{notes.map(note => <li key={note}>{note}</li>)}</ul>}</section>;
}

function ProductEvidencePanel({ evidence }: { readonly evidence: ProductEvidence }) {
  return (
    <section className="analysis-panel" aria-labelledby="analysis-title">
      <p className="status-label">PRODUCT_ANALYSIS_READY</p>
      <h2 id="analysis-title">Product Analysis</h2>
      <section className="evidence-subsection"><h3>Identity</h3><p>{evidence.identityDescription}</p></section>
      <section className="evidence-subsection"><h3>Physical Evidence</h3><div className="evidence-grid"><Notes title="Geometry" notes={evidence.geometryNotes} /><Notes title="Colors" notes={evidence.colorNotes} /><Notes title="Packaging" notes={evidence.packagingNotes} /><Notes title="Visible Labels" notes={evidence.labelNotes} /></div></section>
      <section className="evidence-subsection"><h3>Claims</h3>{evidence.claims.length === 0 ? <p className="empty-evidence">No recorded claims.</p> : <ul>{evidence.claims.map(claim => <li key={claim.claimId}>{claim.text} <span className="evidence-source">{claim.source}</span></li>)}</ul>}</section>
      <section className="evidence-subsection"><h3>Uncertainties</h3>{evidence.uncertainties.length === 0 ? <p className="empty-evidence">No recorded uncertainties.</p> : <ul>{evidence.uncertainties.map((item, index) => <li key={`${item.subject}-${index}`}><strong>{item.subject}:</strong> {item.reason}</li>)}</ul>}</section>
      <section className="evidence-subsection"><h3>Contradictions</h3>{evidence.contradictions.length === 0 ? <p className="empty-evidence">No recorded contradictions.</p> : <ul>{evidence.contradictions.map((item, index) => <li key={`${item.reason}-${index}`}>{item.statements.join(' / ')}: {item.reason}</li>)}</ul>}</section>
      <Notes title="Prohibited Inferences" notes={evidence.prohibitedInferences} />
    </section>
  );
}

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
  const [analysisState, setAnalysisState] = useState<AnalysisState>('IDLE');
  const [productEvidence, setProductEvidence] = useState<ProductEvidence | null>(null);
  const [analysisError, setAnalysisError] = useState<ProductEvidenceClientErrorCode | null>(null);
  const filesByAssetId = useRef(new Map<string, File>());
  const previewUrls = useRef(new Set<string>());
  const analysisAbort = useRef<AbortController | null>(null);
  const analysisGeneration = useRef(0);

  const invalidateReadyInput = () => setReadyInput(null);
  const invalidateProductEvidence = () => {
    analysisGeneration.current += 1;
    analysisAbort.current?.abort();
    analysisAbort.current = null;
    setProductEvidence(null);
    setAnalysisError(null);
    setAnalysisState('IDLE');
  };
  const updateFactualValue = <T,>(setter: Dispatch<SetStateAction<T>>, value: T) => {
    invalidateReadyInput();
    invalidateProductEvidence();
    setter(value);
  };
  const updateCreativeValue = <T,>(setter: Dispatch<SetStateAction<T>>, value: T) => {
    invalidateReadyInput();
    setter(value);
  };

  useEffect(() => () => {
    analysisAbort.current?.abort();
    for (const previewUrl of previewUrls.current) revokePreviewUrl(previewUrl);
    previewUrls.current.clear();
    filesByAssetId.current.clear();
  }, []);

  const buildProductInput = (): ProductInput => ({
    schemaVersion: SCHEMA_VERSION, productId, name: productName, details: productDetails, category,
    assets: referenceAssets.map(reference => reference.asset)
  });
  const buildProjectInput = (): MochiProjectInput => ({
    schemaVersion: SCHEMA_VERSION, projectId, product: buildProductInput(),
    creativeDirection: { audience, shootingContext, reviewerPersona, tone, voiceStyle, voiceGender, voiceRegion }
  });

  const handleReferenceSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const additions = Array.from(event.target.files ?? []).filter(file => file.type.startsWith('image/')).map(file => {
      const assetId = createLogicalId('asset');
      const previewUrl = createPreviewUrl(file);
      filesByAssetId.current.set(assetId, file);
      previewUrls.current.add(previewUrl);
      return { asset: { schemaVersion: SCHEMA_VERSION, assetId, role: 'PRODUCT_REFERENCE' as const, source: 'UPLOAD' as const, mimeType: file.type }, previewUrl };
    });
    if (additions.length > 0) {
      invalidateReadyInput();
      invalidateProductEvidence();
      setReferenceAssets(current => [...current, ...additions]);
    }
    event.target.value = '';
  };

  const removeReference = (assetId: string) => {
    const removed = referenceAssets.find(reference => reference.asset.assetId === assetId);
    if (removed === undefined) return;
    revokePreviewUrl(removed.previewUrl);
    previewUrls.current.delete(removed.previewUrl);
    filesByAssetId.current.delete(assetId);
    setReferenceAssets(current => current.filter(reference => reference.asset.assetId !== assetId));
    invalidateReadyInput();
    invalidateProductEvidence();
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const projectInput = buildProjectInput();
    const issues = validateMochiProjectInput(projectInput);
    setValidationIssues(issues);
    setReadyInput(issues.length === 0 ? projectInput : null);
  };

  const analyze = async () => {
    const controller = new AbortController();
    const requestGeneration = analysisGeneration.current + 1;
    analysisGeneration.current = requestGeneration;
    analysisAbort.current?.abort();
    analysisAbort.current = controller;
    setProductEvidence(null);
    setAnalysisError(null);
    setAnalysisState('ANALYZING');
    try {
      const evidence = await analyzeProductEvidence({ product: buildProductInput(), filesByAssetId: filesByAssetId.current, signal: controller.signal });
      if (analysisGeneration.current === requestGeneration && !controller.signal.aborted) {
        setProductEvidence(evidence);
        setAnalysisState('READY');
      }
    } catch (error) {
      if (analysisGeneration.current !== requestGeneration || controller.signal.aborted) return;
      setAnalysisError(error instanceof ProductEvidenceClientError ? error.code : 'INVALID_RESPONSE');
      setAnalysisState('ERROR');
    } finally {
      if (analysisGeneration.current === requestGeneration) analysisAbort.current = null;
    }
  };

  return (
    <main className="shell">
      <header className="page-header"><p className="eyebrow">MochiV1 · Project setup</p><h1>POV On-Hand Review</h1><p>Enter factual product details and creative direction. Product analysis uses only factual product input and image references.</p></header>
      <form className="project-form" noValidate onSubmit={submit}>
        <section className="form-card" aria-labelledby="product-title">
          <h2 id="product-title">Product</h2>
          <div className="field-grid"><label>Product Name<input value={productName} onChange={event => updateFactualValue(setProductName, event.target.value)} /></label><label>Category<input value={category} onChange={event => updateFactualValue(setCategory, event.target.value)} /></label></div>
          <label>Product Details<textarea rows={4} value={productDetails} onChange={event => updateFactualValue(setProductDetails, event.target.value)} /></label>
          <div className="references" aria-labelledby="references-title"><div><h3 id="references-title">Product reference images</h3><p>Images are browser runtime state. The project contract keeps logical asset references only.</p></div><label className="file-picker">Add product images<input aria-label="Add product images" type="file" accept="image/*" multiple onChange={handleReferenceSelection} /></label></div>
          {referenceAssets.length > 0 && <ul className="reference-list" aria-label="Selected product reference images">{referenceAssets.map(reference => <li key={reference.asset.assetId} className="reference-card"><img src={reference.previewUrl} alt={`Preview for ${reference.asset.assetId}`} /><div><p>{reference.asset.mimeType}</p><button type="button" className="secondary-button" onClick={() => removeReference(reference.asset.assetId)}>Remove reference</button></div></li>)}</ul>}
          <button className="primary-button" type="button" onClick={() => void analyze()} disabled={analysisState === 'ANALYZING'}>{analysisState === 'ANALYZING' ? 'Analyzing Product…' : 'Analyze Product'}</button>
          {analysisState === 'ANALYZING' && <p role="status" className="analysis-status">ANALYZING PRODUCT</p>}
          {analysisState === 'ERROR' && analysisError !== null && <p role="alert" className="analysis-error">Product analysis could not be completed: {formatAnalysisError(analysisError)}.</p>}
        </section>
        <section className="form-card" aria-labelledby="creative-title"><h2 id="creative-title">Creative Direction</h2><div className="field-grid"><label>Audience<input value={audience} onChange={event => updateCreativeValue(setAudience, event.target.value)} /></label><label>Shooting Context<input value={shootingContext} onChange={event => updateCreativeValue(setShootingContext, event.target.value)} /></label><label>Reviewer Persona<input value={reviewerPersona} onChange={event => updateCreativeValue(setReviewerPersona, event.target.value)} /></label><label>Tone<input value={tone} onChange={event => updateCreativeValue(setTone, event.target.value)} /></label><label>Voice Style<input value={voiceStyle} onChange={event => updateCreativeValue(setVoiceStyle, event.target.value)} /></label><label>Voice Gender<select value={voiceGender} onChange={event => updateCreativeValue(setVoiceGender, event.target.value as VoiceGender)}><option value="FEMALE">FEMALE</option><option value="MALE">MALE</option></select></label><label>Voice Region<select value={voiceRegion} onChange={event => updateCreativeValue(setVoiceRegion, event.target.value as VoiceRegion)}><option value="SOUTH">SOUTH</option><option value="NORTH">NORTH</option></select></label></div></section>
        <button className="primary-button" type="submit">Validate project input</button>
      </form>
      {analysisState === 'IDLE' && <section className="analysis-panel" aria-labelledby="analysis-empty-title"><h2 id="analysis-empty-title">Product Analysis</h2><p className="empty-evidence">Add factual product input and reference images, then analyze the product.</p></section>}
      {analysisState === 'READY' && productEvidence !== null && <ProductEvidencePanel evidence={productEvidence} />}
      {validationIssues.length > 0 && <section className="validation-errors" aria-labelledby="validation-title" role="alert"><h2 id="validation-title">Project input needs attention</h2><ul>{validationIssues.map(issue => <li key={issue}>{formatIssue(issue)}</li>)}</ul></section>}
      {readyInput !== null && <section className="ready-state" aria-labelledby="ready-title"><p className="status-label">READY_FOR_ANALYSIS</p><h2 id="ready-title">Canonical MochiProjectInput</h2><p>This development preview contains only the validated provider-neutral project contract.</p><pre data-testid="canonical-input-preview">{JSON.stringify(readyInput, null, 2)}</pre></section>}
    </main>
  );
}
