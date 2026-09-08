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
import { buildProduction, connectGemini, deliveryManifest, deliveryOutput, disconnectGemini, recordDelivery, replaceFailedCandidate, runFinalAcceptance, runSequence, runtimeStatus, uploadCandidate, ProductionClientError, type DeliveryManifest, type DeliveryOutputName, type FinalAcceptanceView, type RuntimeStatus, type SceneView, type SequenceView } from './production-client';

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

function RuntimeSetup({ status, onStatus }: { readonly status: RuntimeStatus; readonly onStatus:(status:RuntimeStatus)=>void }) {
  const [key,setKey]=useState(''); const [error,setError]=useState<string>();
  useEffect(()=>{if(status==='GEMINI_NOT_CONFIGURED')setKey('');},[status]);
  const connect=async()=>{try{onStatus(await connectGemini(key));setKey('');setError(undefined);}catch{setError('Gemini could not be connected. Check the key and try again.');}};
  const disconnect=async()=>{try{onStatus(await disconnectGemini());setKey('');setError(undefined);}catch{setError('Gemini could not be disconnected.');}};
  return <section className="runtime-setup" aria-labelledby="runtime-title"><p className="status-label">Runtime Setup</p><h2 id="runtime-title">Connect Gemini</h2><div className="runtime-row"><span>Runtime status: <strong>{status}</strong></span>{status==='GEMINI_READY'?<><span>Model</span><strong>Gemini 3.5 Flash-Lite</strong><span>Gemini API Key</span><strong>LOCKED</strong><button type="button" className="secondary-button" onClick={()=>void disconnect()}>Disconnect</button></>:<><label>Gemini API Key<input aria-label="Gemini API Key" type="password" value={key} onChange={event=>setKey(event.target.value)}/></label><button type="button" className="primary-button" onClick={()=>void connect()} disabled={!key}>Connect</button></>}</div><p>Connection is held only in this server process and clears on restart.</p>{error&&<p role="alert" className="analysis-error">{error}</p>}</section>;
}

function SceneCard({ scene, snapshotId, references, onUploaded }: { readonly scene: SceneView; readonly snapshotId: string; readonly references: ReadonlyMap<string, ReferenceAssetState>; readonly onUploaded: (scene:SceneView)=>void }) {
  const [showPrompt,setShowPrompt]=useState(false); const [error,setError]=useState<string|undefined>(); const [uploading,setUploading]=useState(false);
  const upload=async(file:File|undefined)=>{if(!file)return; setError(undefined); if(!file.type.startsWith('video/')){setError('Please select a video file (MP4 is required).');return;}setUploading(true);try{onUploaded(await uploadCandidate(snapshotId,scene,file));}catch(e){setError(e instanceof ProductionClientError&&e.code==='SCENE_QC_FAILED'?'Scene QC could not be completed. You can retry this same video candidate.':e instanceof ProductionClientError&&e.code==='VIDEO_TECHNICAL_INVALID'?'This video is not a verified 8-second 9:16 MP4.':'Invalid or stale video.');}finally{setUploading(false);}};
  const gateList=(title:string,gates:readonly {gate:string;status:string}[]) => <div className="qc-gates"><strong>{title}</strong>{gates.map(g=><span key={g.gate} className={g.status==='PASS'?'gate-pass':'gate-fail'}>{g.gate.replaceAll('_',' ')} · {g.status}</span>)}</div>;
  const replace=async()=>{try{onUploaded(await replaceFailedCandidate(snapshotId,scene));setError(undefined);}catch{setError('This failed candidate can no longer be replaced.');}};
  return <article className="scene-card"><div className="scene-heading"><div><p className="status-label">Scene {scene.index} — {scene.role}</p><h3>{scene.primaryAction.replaceAll('_',' ')}</h3></div><span className={`lifecycle lifecycle-${scene.lifecycleStatus.toLowerCase()}`}>{uploading?'QC_RUNNING':scene.lifecycleStatus}</span></div><p><strong>Attempt:</strong> {scene.attempt}</p><p><strong>Start → End:</strong> {scene.startSummary} → {scene.endSummary}</p><ol className="key-points"><li>{scene.keyPoints[0]}</li><li>{scene.keyPoints[1]}</li></ol><p><strong>Dialogue:</strong> {scene.dialogue}</p><p><strong>Voice:</strong> {scene.voiceLabel}</p><p><strong>Visual Rhythm:</strong> {scene.visualRhythm}</p><p><strong>Prompt:</strong> {scene.promptCharacterCount} / 3200 · {scene.promptBudgetStatus}</p><div className="scene-actions"><button type="button" className="secondary-button" onClick={()=>setShowPrompt(value=>!value)}>View Prompt</button><button type="button" className="secondary-button" onClick={()=>void navigator.clipboard?.writeText(scene.prompt)}>Copy Prompt</button></div>{showPrompt&&<pre className="prompt-view">{scene.prompt}</pre>}
    {scene.lifecycleStatus==='READY_FOR_FLOW'&&<section className="flow-panel"><h4>Generate externally in Flow</h4><p>Model: Omni Flash 1.1 · Duration: 8 seconds · Aspect: 9:16</p><p>Voice: {scene.voiceLabel}</p><div className="flow-thumbnails">{scene.referenceAssetIds.map(id=>{const reference=references.get(id);return reference?<img key={id} src={reference.previewUrl} alt="Required product reference"/>:null;})}</div><button type="button" className="secondary-button" onClick={()=>void navigator.clipboard?.writeText(scene.prompt)}>Copy Prompt</button><label className="file-picker">Upload Generated MP4<input aria-label={`Upload Generated MP4 Scene ${scene.index}`} type="file" accept="video/mp4,video/*" onChange={event=>void upload(event.target.files?.[0])}/></label>{error&&<p role="alert" className="analysis-error">{error}</p>}</section>}
    {scene.qcReport&&<section className="qc-panel"><h4>{scene.qcReport.result==='SCENE_QC_PASS'?'Scene QC PASS':'Scene QC FAIL'}</h4>{gateList('Product and framing',scene.qcReport.frameGates)}{gateList('Action and timing',scene.qcReport.temporalGates)}{gateList('Speech',scene.qcReport.speechGates)}<p><strong>Expected dialogue:</strong> {scene.qcReport.expectedDialogue}</p><p><strong>Detected transcript:</strong> {scene.qcReport.detectedTranscript}</p><p><strong>Exact dialogue match:</strong> {scene.qcReport.exactDialogueMatch}</p><p className={scene.qcReport.presentationDynamics.status==='WARN'?'presentation-warn':'gate-pass'}>Presentation Dynamics · {scene.qcReport.presentationDynamics.status}: {scene.qcReport.presentationDynamics.notes}</p>{scene.qcReport.result==='SCENE_QC_FAIL'&&<button type="button" className="primary-button" onClick={()=>void replace()}>Replace Failed Video</button>}{error&&<p role="alert" className="analysis-error">{error}</p>}</section>}
  </article>;
}

function saveBlob(filename:DeliveryOutputName,blob:Blob):void { const url=URL.createObjectURL(blob); const anchor=document.createElement('a'); anchor.href=url; anchor.download=filename; anchor.click(); setTimeout(()=>URL.revokeObjectURL(url),0); }
export function DeliveryCenter({ snapshotId, delivery, onDelivery }: { readonly snapshotId:string; readonly delivery:DeliveryManifest; readonly onDelivery:(delivery:DeliveryManifest)=>void }) {
  const [error,setError]=useState<string>(); const [saving,setSaving]=useState(false);
  if(delivery.status==='NOT_READY') return null;
  const download=async(filename:DeliveryOutputName)=>{try { setError(undefined); saveBlob(filename,await deliveryOutput(snapshotId,filename)); } catch { setError('Delivery is no longer ready. Run Final Acceptance again.'); }};
  const saveAll=async()=>{ setSaving(true); setError(undefined); try { const picker=(window as Window & {showDirectoryPicker?:()=>Promise<{getFileHandle:(name:string,options:{create:boolean})=>Promise<{createWritable:()=>Promise<{write:(data:Blob)=>Promise<void>;close:()=>Promise<void>}>}>}>}).showDirectoryPicker; if(!picker) { for(const output of delivery.outputs) saveBlob(output.filename,await deliveryOutput(snapshotId,output.filename)); } else { const directory=await picker(); for(const output of delivery.outputs) { const file=await directory.getFileHandle(output.filename,{create:true}); const writer=await file.createWritable(); await writer.write(await deliveryOutput(snapshotId,output.filename)); await writer.close(); } } onDelivery(await recordDelivery(snapshotId)); } catch { setError('The five files could not be saved. Delivery remains available for individual downloads.'); } finally { setSaving(false); } };
  return <section className="delivery-center" aria-labelledby="delivery-title"><p className="status-label">{delivery.status}</p><h2 id="delivery-title">Delivery</h2><p>Your approved files are ready. Choose a folder to save all five files, or download them individually.</p><button type="button" className="primary-button" onClick={()=>void saveAll()} disabled={saving}>{saving?'Saving files…':'Save 5 files to folder'}</button><div className="delivery-list">{delivery.outputs.map((output,index)=><div key={output.filename}><span>{output.filename}</span><button type="button" className="secondary-button" onClick={()=>void download(output.filename)}>{index===4?'Download key-points.txt':`Download Scene ${index+1}`}</button></div>)}</div>{error&&<p role="alert" className="analysis-error">{error}</p>}</section>;
}

function ProductionWorkspace({ readyInput, references, files, runtime }: { readonly readyInput:MochiProjectInput|null; readonly references:readonly ReferenceAssetState[]; readonly files:ReadonlyMap<string,File>; readonly runtime:RuntimeStatus }) {
  const [snapshotId,setSnapshotId]=useState<string>(); const [scenes,setScenes]=useState<SceneView[]>([]); const [sequence,setSequence]=useState<SequenceView>(); const [finalAcceptance,setFinalAcceptance]=useState<FinalAcceptanceView>(); const [delivery,setDelivery]=useState<DeliveryManifest>(); const [message,setMessage]=useState<string>();
  const referenceMap=new Map(references.map(reference=>[reference.asset.assetId,reference]));
  const build=async()=>{if(!readyInput){setMessage('Validate the setup before building production.');return;}try{const result=await buildProduction(readyInput,files);setSnapshotId(result.snapshotId);setScenes(result.scenes);setSequence(undefined);setFinalAcceptance(undefined);setDelivery(undefined);setMessage(undefined);}catch(error){setMessage(error instanceof ProductionClientError&&error.code==='GEMINI_NOT_CONFIGURED'?'Gemini is not connected.':error instanceof ProductionClientError&&error.code==='PRODUCTION_BUILD_FAILED'&&error.stage?`Production build failed at ${error.stage}.`:'Production build failed. Review the setup and product analysis.');}};
  const canSequence=scenes.length===4&&scenes.every(scene=>scene.lifecycleStatus==='QC_PASS');
  const updateScene=(updated:SceneView)=>{setScenes(current=>current.map(scene=>scene.sceneId===updated.sceneId?updated:scene));setSequence(undefined);setFinalAcceptance(undefined);setDelivery(undefined);}; const continuity=async()=>{try{const value=await runSequence(snapshotId!);setSequence(value);const acceptance=await runFinalAcceptance(snapshotId!);setFinalAcceptance(acceptance);setDelivery(acceptance.status==='FINAL_ACCEPTANCE_PASS'?await deliveryManifest(snapshotId!):undefined);}catch{setMessage('Continuity QC failed.');}};
  return <section className="production-workspace" aria-labelledby="production-title"><p className="status-label">Production</p><h2 id="production-title">Production Workspace</h2><p>Runtime status: <strong>{runtime}</strong></p><button type="button" className="primary-button" onClick={()=>void build()} disabled={runtime!=='GEMINI_READY'}>Build Production Plan</button>{message&&<p role="alert" className="analysis-error">{message}</p>}{snapshotId&&<p className="status-label">Production snapshot: PERSISTED</p>}{scenes.length>0&&<div className="scene-grid">{scenes.map(scene=><SceneCard key={scene.sceneId} scene={scene} snapshotId={snapshotId!} references={referenceMap} onUploaded={updateScene}/>)}</div>}{scenes.length>0&&<section className="sequence-panel"><h3>Sequence continuity</h3><button type="button" className="primary-button" disabled={!canSequence} onClick={()=>void continuity()}>Run Continuity Check</button>{!canSequence&&<p>Upload and pass Scene QC for all four scenes to enable continuity checking.</p>}{sequence&&<div><p className={sequence.status==='FOUR_SCENE_SEQUENCE_PASS'?'gate-pass':'gate-fail'}>{sequence.status}</p>{sequence.pairs.map((pair,index)=><div key={pair.fromSceneId}><strong>Pair {index+1} → {index+2}</strong>{pair.gates.map(g=><span key={g.gate} className={g.status==='PASS'?'gate-pass':'gate-fail'}>{g.gate.replaceAll('_',' ')} {g.status}</span>)}</div>)}<div><strong>Global</strong>{sequence.globalGates.map(g=><span key={g.gate} className={g.status==='PASS'?'gate-pass':'gate-fail'}>{g.gate.replaceAll('_',' ')} {g.status}</span>)}</div><p className={sequence.visualVariation==='WARN'?'presentation-warn':'gate-pass'}>Visual Variation: {sequence.visualVariation}</p></div>}{finalAcceptance&&<p className={finalAcceptance.status==='FINAL_ACCEPTANCE_PASS'?'gate-pass':'gate-fail'}>{finalAcceptance.status==='FINAL_ACCEPTANCE_PASS'?'READY_FOR_DELIVERY':finalAcceptance.status}{finalAcceptance.blockerCodes.length?`: ${finalAcceptance.blockerCodes.join(', ')}`:''}</p>}</section>}{delivery&&<DeliveryCenter snapshotId={snapshotId!} delivery={delivery} onDelivery={setDelivery}/>}</section>;
}

export function App() {
  const [projectId] = useState(() => createLogicalId('project'));
  const [productId] = useState(() => createLogicalId('product'));
  const [productName, setProductName] = useState('');
  const [productDetails, setProductDetails] = useState('');
  const [category, setCategory] = useState('');
  const [audience, setAudience] = useState('AUTO_PRODUCT_FIT');
  const [shootingContext, setShootingContext] = useState('AUTO_PRODUCT_FIT');
  const [voiceGender, setVoiceGender] = useState<VoiceGender>('FEMALE');
  const [referenceAssets, setReferenceAssets] = useState<readonly ReferenceAssetState[]>([]);
  const [validationIssues, setValidationIssues] = useState<readonly string[]>([]);
  const [readyInput, setReadyInput] = useState<MochiProjectInput | null>(null);
  const [analysisState, setAnalysisState] = useState<AnalysisState>('IDLE');
  const [productEvidence, setProductEvidence] = useState<ProductEvidence | null>(null);
  const [analysisError, setAnalysisError] = useState<ProductEvidenceClientErrorCode | null>(null);
  const [runtime, setRuntime] = useState<RuntimeStatus>('GEMINI_NOT_CONFIGURED');
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
  useEffect(() => { void runtimeStatus().then(setRuntime).catch(() => setRuntime('GEMINI_NOT_CONFIGURED')); }, []);

  const buildProductInput = (): ProductInput => ({
    schemaVersion: SCHEMA_VERSION, productId, name: productName, details: productDetails, category,
    assets: referenceAssets.map(reference => reference.asset)
  });
  const buildProjectInput = (): MochiProjectInput => ({
    schemaVersion: SCHEMA_VERSION, projectId, product: buildProductInput(),
    creativeDirection: { audience, shootingContext, reviewerPersona: 'AUTHENTIC POV ON-HAND REVIEWER; NO REVIEWER FACE; REAL BUYER-LIKE INTERACTION', tone: 'AUTO_ROLE_APPROPRIATE_V1', voiceStyle: 'review', voiceGender, voiceRegion: 'SOUTH' }
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
      <RuntimeSetup status={runtime} onStatus={setRuntime} />
      <form className="project-form" noValidate onSubmit={submit}>
        <section className="form-card" aria-labelledby="product-title">
          <h2 id="product-title">Product</h2>
          <div className="field-grid"><label>Product Name<input value={productName} onChange={event => updateFactualValue(setProductName, event.target.value)} /></label><label>Category<input value={category} onChange={event => updateFactualValue(setCategory, event.target.value)} /></label></div>
          <label>Product Details<textarea rows={4} value={productDetails} onChange={event => updateFactualValue(setProductDetails, event.target.value)} /></label>
          <div className="references" aria-labelledby="references-title"><div><h3 id="references-title">Product reference images</h3><p>Images are browser runtime state. The project contract keeps logical asset references only.</p></div><label className="file-picker">Add product images<input aria-label="Add product images" type="file" accept="image/*" multiple onChange={handleReferenceSelection} /></label></div>
          {referenceAssets.length > 0 && <ul className="reference-list" aria-label="Selected product reference images">{referenceAssets.map(reference => <li key={reference.asset.assetId} className="reference-card"><img src={reference.previewUrl} alt={`Preview for ${reference.asset.assetId}`} /><div><p>{reference.asset.mimeType}</p><button type="button" className="secondary-button" onClick={() => removeReference(reference.asset.assetId)}>Remove reference</button></div></li>)}</ul>}
          <button className="primary-button" type="button" onClick={() => void analyze()} disabled={analysisState === 'ANALYZING' || runtime !== 'GEMINI_READY'}>{analysisState === 'ANALYZING' ? 'Analyzing Product…' : 'Analyze Product'}</button>
          {runtime !== 'GEMINI_READY' && <p className="analysis-status">Connect Gemini to analyze the product.</p>}
          {analysisState === 'ANALYZING' && <p role="status" className="analysis-status">ANALYZING PRODUCT</p>}
          {analysisState === 'ERROR' && analysisError !== null && <p role="alert" className="analysis-error">Product analysis could not be completed: {formatAnalysisError(analysisError)}.</p>}
        </section>
        <section className="form-card" aria-labelledby="creative-title"><h2 id="creative-title">Creative Direction</h2><div className="field-grid"><label>Audience<select aria-label="Audience" value={audience} onChange={event => updateCreativeValue(setAudience, event.target.value)}><option value="AUTO_PRODUCT_FIT">Tự động theo sản phẩm</option><option value="PARENTS_FAMILY">Phụ huynh / Gia đình</option><option value="YOUNG_ADULTS_GEN_Z">Người trẻ / Gen Z</option><option value="PRACTICAL_BUYERS">Người mua thực dụng</option><option value="GIFT_BUYERS">Người mua quà tặng</option></select></label><label>Shooting Context<select aria-label="Shooting Context" value={shootingContext} onChange={event => updateCreativeValue(setShootingContext, event.target.value)}><option value="AUTO_PRODUCT_FIT">Tự động theo sản phẩm</option><option value="INDOOR_TABLE_REVIEW">Trong nhà / bàn review</option><option value="HOME_LIFESTYLE">Không gian gia đình</option><option value="OUTDOOR_CASUAL">Ngoài trời</option><option value="FESTIVE_CONTEXT">Không gian lễ hội</option></select></label></div><fieldset className="voice-gender-cards"><legend>Voice Gender</legend><button type="button" aria-pressed={voiceGender==='FEMALE'} className={voiceGender==='FEMALE'?'voice-card active':'voice-card'} onClick={()=>updateCreativeValue<VoiceGender>(setVoiceGender,'FEMALE')}>NỮ</button><button type="button" aria-pressed={voiceGender==='MALE'} className={voiceGender==='MALE'?'voice-card active':'voice-card'} onClick={()=>updateCreativeValue<VoiceGender>(setVoiceGender,'MALE')}>NAM</button></fieldset></section>
        <button className="primary-button" type="submit">Validate project input</button>
      </form>
      {analysisState === 'IDLE' && <section className="analysis-panel" aria-labelledby="analysis-empty-title"><h2 id="analysis-empty-title">Product Analysis</h2><p className="empty-evidence">Add factual product input and reference images, then analyze the product.</p></section>}
      {analysisState === 'READY' && productEvidence !== null && <ProductEvidencePanel evidence={productEvidence} />}
      {validationIssues.length > 0 && <section className="validation-errors" aria-labelledby="validation-title" role="alert"><h2 id="validation-title">Project input needs attention</h2><ul>{validationIssues.map(issue => <li key={issue}>{formatIssue(issue)}</li>)}</ul></section>}
      {readyInput !== null && <section className="ready-state" aria-labelledby="ready-title"><p className="status-label">READY_FOR_ANALYSIS</p><h2 id="ready-title">Setup validated</h2><p>Your validated setup is ready for production planning.</p><details><summary>Developer Details</summary><pre data-testid="canonical-input-preview">{JSON.stringify(readyInput, null, 2)}</pre></details></section>}
      {analysisState === 'READY' && productEvidence !== null && <ProductionWorkspace readyInput={readyInput} references={referenceAssets} files={filesByAssetId.current} runtime={runtime} />}
    </main>
  );
}
