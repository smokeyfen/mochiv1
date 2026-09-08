import { useEffect, useRef, useState, type ChangeEvent, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import {
  SCHEMA_VERSION,
  validateMochiProjectInput,
  type AssetRef,
  type MochiProjectInput,
  type ProductEvidence,
  type ProductInput,
  type VoiceGender
} from '@mochi/contracts';
import { analyzeProductEvidence, ProductEvidenceClientError, type ProductEvidenceClientErrorCode } from './product-evidence-client';
import { buildProduction, connectGemini, disconnectGemini, runSequence, uploadCandidate, ProductionClientError, type RuntimeStatus, type SceneView, type SequenceView } from './production-client';

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
      <section className="evidence-subsection"><h3>Claims</h3>{evidence.claims.length === 0 ? <p className="empty-evidence">No recorded claims.</p> : <ul className="claim-list">{evidence.claims.map(claim => <li key={claim.claimId}><span>{claim.text}</span><span className="evidence-source">{claim.source}</span><span className={`claim-allowed ${claim.allowed ? 'claim-allowed-yes' : 'claim-allowed-no'}`}>{claim.allowed ? 'ALLOWED' : 'NOT ALLOWED'}</span>{claim.source === 'REFERENCE_EVIDENCE' && <span className="claim-references">{claim.evidenceAssetIds.length} {claim.evidenceAssetIds.length === 1 ? 'reference' : 'references'}</span>}</li>)}</ul>}</section>
      <section className="evidence-subsection"><h3>Uncertainties</h3>{evidence.uncertainties.length === 0 ? <p className="empty-evidence">No recorded uncertainties.</p> : <ul>{evidence.uncertainties.map((item, index) => <li key={`${item.subject}-${index}`}><strong>{item.subject}:</strong> {item.reason}</li>)}</ul>}</section>
      <section className="evidence-subsection"><h3>Contradictions</h3>{evidence.contradictions.length === 0 ? <p className="empty-evidence">No recorded contradictions.</p> : <ul>{evidence.contradictions.map((item, index) => <li key={`${item.reason}-${index}`}>{item.statements.join(' / ')}: {item.reason}</li>)}</ul>}</section>
      <Notes title="Prohibited Inferences" notes={evidence.prohibitedInferences} />
    </section>
  );
}

function SceneCard({ scene, snapshotId, references, onUploaded }: { readonly scene: SceneView; readonly snapshotId: string; readonly references: ReadonlyMap<string, ReferenceAssetState>; readonly onUploaded: (scene:SceneView)=>void }) {
  const [showPrompt,setShowPrompt]=useState(false); const [error,setError]=useState<string|undefined>(); const [uploading,setUploading]=useState(false);
  const upload=async(file:File|undefined)=>{if(!file)return; setError(undefined); if(!file.type.startsWith('video/')){setError('Please select a video file (MP4 is recommended).');return;}setUploading(true);try{onUploaded(await uploadCandidate(snapshotId,scene,file));}catch(e){setError(e instanceof ProductionClientError?'Invalid or stale video.':'Scene QC failed.');}finally{setUploading(false);}};
  const gateList=(title:string,gates:readonly {gate:string;status:string}[]) => <div className="qc-gates"><strong>{title}</strong>{gates.map(g=><span key={g.gate} className={g.status==='PASS'?'gate-pass':'gate-fail'}>{g.gate.replaceAll('_',' ')} · {g.status}</span>)}</div>;
  return <article className="scene-card"><div className="scene-heading"><div><p className="status-label">Scene {scene.index} — {scene.role}</p><h3>{scene.primaryAction.replaceAll('_',' ')}</h3></div><span className={`lifecycle lifecycle-${scene.lifecycleStatus.toLowerCase()}`}>{uploading?'QC_RUNNING':scene.lifecycleStatus}</span></div><p><strong>Start → End:</strong> {scene.startSummary} → {scene.endSummary}</p><ol className="key-points"><li>{scene.keyPoints[0]}</li><li>{scene.keyPoints[1]}</li></ol><p><strong>Dialogue:</strong> {scene.dialogue}</p><p><strong>Voice:</strong> {scene.voiceLabel}</p><p><strong>Visual Rhythm:</strong> {scene.visualRhythm}</p><p><strong>Prompt:</strong> {scene.promptCharacterCount} / 3200 · {scene.promptBudgetStatus}</p><div className="scene-actions"><button type="button" className="secondary-button" onClick={()=>setShowPrompt(value=>!value)}>View Prompt</button><button type="button" className="secondary-button" onClick={()=>void navigator.clipboard?.writeText(scene.prompt)}>Copy Prompt</button></div>{showPrompt&&<pre className="prompt-view">{scene.prompt}</pre>}
    {scene.lifecycleStatus==='READY_FOR_FLOW'&&<section className="flow-panel"><h4>Generate externally in Flow</h4><p>Model: Omni Flash 1.1 · Duration: 8 seconds · Aspect: 9:16</p><p>Voice: {scene.voiceLabel}</p><div className="flow-thumbnails">{scene.referenceAssetIds.map(id=>{const reference=references.get(id);return reference?<img key={id} src={reference.previewUrl} alt="Required product reference"/>:null;})}</div><button type="button" className="secondary-button" onClick={()=>void navigator.clipboard?.writeText(scene.prompt)}>Copy Prompt</button><label className="file-picker">Upload Generated MP4<input aria-label={`Upload Generated MP4 Scene ${scene.index}`} type="file" accept="video/mp4,video/*" onChange={event=>void upload(event.target.files?.[0])}/></label>{error&&<p role="alert" className="analysis-error">{error}</p>}</section>}
    {scene.qcReport&&<section className="qc-panel"><h4>{scene.qcReport.result==='SCENE_QC_PASS'?'Scene QC PASS':'Scene QC FAIL'}</h4>{gateList('Product and framing',scene.qcReport.frameGates)}{gateList('Action and timing',scene.qcReport.temporalGates)}{gateList('Speech',scene.qcReport.speechGates)}<p><strong>Expected dialogue:</strong> {scene.qcReport.expectedDialogue}</p><p><strong>Detected transcript:</strong> {scene.qcReport.detectedTranscript}</p><p><strong>Exact dialogue match:</strong> {scene.qcReport.exactDialogueMatch}</p><p className={scene.qcReport.presentationDynamics.status==='WARN'?'presentation-warn':'gate-pass'}>Presentation Dynamics · {scene.qcReport.presentationDynamics.status}: {scene.qcReport.presentationDynamics.notes}</p></section>}
  </article>;
}

function ProductionWorkspace({ readyInput, references, files }: { readonly readyInput:MochiProjectInput|null; readonly references:readonly ReferenceAssetState[]; readonly files:ReadonlyMap<string,File> }) {
  const [status,setStatus]=useState<RuntimeStatus>('GEMINI_NOT_CONFIGURED'); const [key,setKey]=useState(''); const [snapshotId,setSnapshotId]=useState<string>(); const [scenes,setScenes]=useState<SceneView[]>([]); const [sequence,setSequence]=useState<SequenceView>(); const [message,setMessage]=useState<string>();
  const referenceMap=new Map(references.map(reference=>[reference.asset.assetId,reference]));
  const connect=async()=>{try{setStatus(await connectGemini(key));setKey('');setMessage(undefined);}catch{setMessage('Gemini could not be connected. Check the key and try again.');}};
  const build=async()=>{if(!readyInput){setMessage('Validate the setup before building production.');return;}try{const result=await buildProduction(readyInput,files);setSnapshotId(result.snapshotId);setScenes(result.scenes);setSequence(undefined);setMessage(undefined);}catch(error){setMessage(error instanceof ProductionClientError&&error.code==='GEMINI_NOT_CONFIGURED'?'Gemini is not connected.':'Production build failed. Review the setup and product analysis.');}};
  const canSequence=scenes.length===4&&scenes.every(scene=>scene.lifecycleStatus==='QC_PASS');
  return <section className="production-workspace" aria-labelledby="production-title"><p className="status-label">Production</p><h2 id="production-title">Production Workspace</h2><div className="runtime-row"><span>Runtime status: <strong>{status}</strong></span><label>Gemini API Key<input aria-label="Gemini API Key" type="password" value={key} onChange={event=>setKey(event.target.value)}/></label><button type="button" className="primary-button" onClick={()=>void connect()} disabled={!key}>Connect</button><button type="button" className="secondary-button" onClick={()=>void disconnectGemini().then(setStatus)}>Disconnect</button></div><p>Connection is held only in this server process and clears on restart.</p><button type="button" className="primary-button" onClick={()=>void build()} disabled={status!=='GEMINI_READY'}>Build Production Plan</button>{message&&<p role="alert" className="analysis-error">{message}</p>}{snapshotId&&<p className="status-label">Production snapshot: PERSISTED</p>}{scenes.length>0&&<div className="scene-grid">{scenes.map(scene=><SceneCard key={scene.sceneId} scene={scene} snapshotId={snapshotId!} references={referenceMap} onUploaded={updated=>setScenes(current=>current.map(scene=>scene.sceneId===updated.sceneId?updated:scene))}/>)}</div>}{scenes.length>0&&<section className="sequence-panel"><h3>Sequence continuity</h3><button type="button" className="primary-button" disabled={!canSequence} onClick={()=>void runSequence(snapshotId!).then(setSequence).catch(()=>setMessage('Continuity QC failed.'))}>Run Continuity Check</button>{!canSequence&&<p>Upload and pass Scene QC for all four scenes to enable continuity checking.</p>}{sequence&&<div><p className={sequence.status==='FOUR_SCENE_SEQUENCE_PASS'?'gate-pass':'gate-fail'}>{sequence.status}</p>{sequence.pairs.map((pair,index)=><div key={pair.fromSceneId}><strong>Pair {index+1} → {index+2}</strong>{pair.gates.map(g=><span key={g.gate} className={g.status==='PASS'?'gate-pass':'gate-fail'}>{g.gate.replaceAll('_',' ')} {g.status}</span>)}</div>)}<div><strong>Global</strong>{sequence.globalGates.map(g=><span key={g.gate} className={g.status==='PASS'?'gate-pass':'gate-fail'}>{g.gate.replaceAll('_',' ')} {g.status}</span>)}</div><p className={sequence.visualVariation==='WARN'?'presentation-warn':'gate-pass'}>Visual Variation: {sequence.visualVariation}</p></div>}</section>}</section>;
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
  const [voiceGender, setVoiceGender] = useState<VoiceGender>('FEMALE');
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
    creativeDirection: { audience, shootingContext, reviewerPersona, tone, voiceStyle: 'review', voiceGender, voiceRegion: 'SOUTH' }
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
        <section className="form-card" aria-labelledby="creative-title"><h2 id="creative-title">Creative Direction</h2><div className="field-grid"><label>Audience<input value={audience} onChange={event => updateCreativeValue(setAudience, event.target.value)} /></label><label>Shooting Context<input value={shootingContext} onChange={event => updateCreativeValue(setShootingContext, event.target.value)} /></label><label>Reviewer Persona<input value={reviewerPersona} onChange={event => updateCreativeValue(setReviewerPersona, event.target.value)} /></label><label>Tone<input value={tone} onChange={event => updateCreativeValue(setTone, event.target.value)} /></label><label>Voice Gender<select value={voiceGender} onChange={event => updateCreativeValue(setVoiceGender, event.target.value as VoiceGender)}><option value="FEMALE">FEMALE</option><option value="MALE">MALE</option></select></label></div></section>
        <button className="primary-button" type="submit">Validate project input</button>
      </form>
      {analysisState === 'IDLE' && <section className="analysis-panel" aria-labelledby="analysis-empty-title"><h2 id="analysis-empty-title">Product Analysis</h2><p className="empty-evidence">Add factual product input and reference images, then analyze the product.</p></section>}
      {analysisState === 'READY' && productEvidence !== null && <ProductEvidencePanel evidence={productEvidence} />}
      {validationIssues.length > 0 && <section className="validation-errors" aria-labelledby="validation-title" role="alert"><h2 id="validation-title">Project input needs attention</h2><ul>{validationIssues.map(issue => <li key={issue}>{formatIssue(issue)}</li>)}</ul></section>}
      {readyInput !== null && <section className="ready-state" aria-labelledby="ready-title"><p className="status-label">READY_FOR_ANALYSIS</p><h2 id="ready-title">Setup validated</h2><p>Your validated setup is ready for production planning.</p><details><summary>Developer Details</summary><pre data-testid="canonical-input-preview">{JSON.stringify(readyInput, null, 2)}</pre></details></section>}
      {analysisState === 'READY' && productEvidence !== null && <ProductionWorkspace readyInput={readyInput} references={referenceAssets} files={filesByAssetId.current} />}
    </main>
  );
}
