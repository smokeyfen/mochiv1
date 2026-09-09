import { useEffect, useRef, useState, type ChangeEvent, type Dispatch, type SetStateAction } from 'react';
import './interaction.css';
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
import { compileProduction, connectGemini, createFinalizedScript, createProductFoundation, createSceneBlueprint, deliveryManifest, deliveryOutput, disconnectGemini, recordDelivery, replaceFailedCandidate, runFinalAcceptance, runSequence, runtimeStatus, uploadCandidate, ProductionClientError, type BlueprintSceneView, type DeliveryManifest, type DeliveryOutputName, type FinalAcceptanceView, type FinalizedScriptSceneView, type LayerDiagnostic, type LayerStatus, type ProductionLayer, type RuntimeStatus, type SceneView, type SequenceView } from './production-client';

interface ReferenceAssetState { readonly asset: AssetRef; readonly previewUrl: string; }
type AnalysisState = 'IDLE' | 'ANALYZING' | 'READY' | 'STALE' | 'ERROR';
type ProductionWorkflowState = { readonly l1:LayerStatus;readonly l2:LayerStatus;readonly l3:LayerStatus;readonly l4:LayerStatus;readonly finalAcceptancePassed:boolean;readonly deliveryStatus:DeliveryManifest['status']|'NOT_READY'; };
const emptyProductionWorkflow:ProductionWorkflowState={l1:'LOCKED',l2:'LOCKED',l3:'LOCKED',l4:'LOCKED',finalAcceptancePassed:false,deliveryStatus:'NOT_READY'};

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
const formatAnalysisError = (code: ProductEvidenceClientErrorCode): string =>
  (code === 'PROVIDER_INVALID_RESPONSE' || code === 'PRODUCT_EVIDENCE_INVALID_MODEL_OUTPUT'
    ? 'INVALID ANALYSIS RESPONSE'
    : code.replaceAll('_', ' '));

function Notes({ title, notes }: { readonly title: string; readonly notes: readonly string[] }) {
  return <section className="evidence-subsection"><h3>{title}</h3>{notes.length === 0 ? <p className="empty-evidence">No recorded evidence.</p> : <ul>{notes.map(note => <li key={note}>{note}</li>)}</ul>}</section>;
}

function ProductEvidencePanel({ evidence }: { readonly evidence: ProductEvidence }) {
  const [expanded,setExpanded]=useState(false);
  return (
    <section className="analysis-panel" aria-labelledby="analysis-title">
      <p className="status-label status-pass">PRODUCT FOUNDATION PASS</p>
      <h2 id="analysis-title">Product Analysis</h2><p className="analysis-lock">Analysis locked to current product + references</p>
      <div className="analysis-summary"><span><strong>Identity</strong><br/>{evidence.identityDescription}</span><span><strong>Claims</strong><br/>{evidence.claims.length}</span><span><strong>References</strong><br/>{evidence.canonicalAssetIds.length}</span><span><strong>Uncertainty</strong><br/>{evidence.uncertainties.length}</span></div>
      <button type="button" className="secondary-button" aria-expanded={expanded} onClick={()=>setExpanded(value=>!value)}>{expanded?'Hide analysis details':'View analysis details'}</button>
      {expanded && <div className="analysis-details">
      <section className="evidence-subsection"><h3>Identity</h3><p>{evidence.identityDescription}</p></section>
      <section className="evidence-subsection"><h3>Physical Evidence</h3><div className="evidence-grid"><Notes title="Geometry" notes={evidence.geometryNotes} /><Notes title="Colors" notes={evidence.colorNotes} /><Notes title="Packaging" notes={evidence.packagingNotes} /><Notes title="Visible text / labels" notes={evidence.labelNotes} /></div></section>
      <section className="evidence-subsection"><h3>Claims</h3>{evidence.claims.length === 0 ? <p className="empty-evidence">No recorded claims.</p> : <ul className="claim-list">{evidence.claims.map(claim => <li key={claim.claimId}><span>{claim.text}</span><span className="evidence-source">{claim.source}</span><span className={`claim-allowed ${claim.allowed ? 'claim-allowed-yes' : 'claim-allowed-no'}`}>{claim.allowed ? 'ALLOWED' : 'NOT ALLOWED'}</span>{claim.source === 'REFERENCE_EVIDENCE' && <span className="claim-references">{claim.evidenceAssetIds.length} {claim.evidenceAssetIds.length === 1 ? 'reference' : 'references'}</span>}</li>)}</ul>}</section>
      <section className="evidence-subsection"><h3>Uncertainties</h3>{evidence.uncertainties.length === 0 ? <p className="empty-evidence">No recorded uncertainties.</p> : <ul>{evidence.uncertainties.map((item, index) => <li key={`${item.subject}-${index}`}><strong>{item.subject}:</strong> {item.reason}</li>)}</ul>}</section>
      <section className="evidence-subsection"><h3>Contradictions</h3>{evidence.contradictions.length === 0 ? <p className="empty-evidence">No recorded contradictions.</p> : <ul>{evidence.contradictions.map((item, index) => <li key={`${item.reason}-${index}`}>{item.statements.join(' / ')}: {item.reason}</li>)}</ul>}</section>
      <Notes title="Prohibited Inferences" notes={evidence.prohibitedInferences} />
      </div>}
    </section>
  );
}

function RuntimeSetup({ status, onStatus }: { readonly status: RuntimeStatus; readonly onStatus:(status:RuntimeStatus)=>void }) {
  const [key,setKey]=useState(''); const [error,setError]=useState<string>(); const [activity,setActivity]=useState<'CONNECTING'|'DISCONNECTING'>();
  useEffect(()=>{if(status==='GEMINI_NOT_CONFIGURED')setKey('');},[status]);
  const connect=async()=>{if(activity)return;setActivity('CONNECTING');try{onStatus(await connectGemini(key));setKey('');setError(undefined);}catch{setError('Gemini could not be connected. Check the key and try again.');}finally{setActivity(undefined);}};
  const disconnect=async()=>{if(activity)return;setActivity('DISCONNECTING');try{onStatus(await disconnectGemini());setKey('');setError(undefined);}catch{setError('Gemini could not be disconnected.');}finally{setActivity(undefined);}};
  return <section className="runtime-setup" aria-labelledby="runtime-title"><p className="status-label">Runtime status</p><h2 id="runtime-title">Gemini reasoning connection</h2><div className="runtime-row"><span className={`runtime-indicator ${status==='GEMINI_READY'?'connected':'disconnected'}`}><i aria-hidden="true"/>Runtime status: <strong>{status}</strong></span>{status==='GEMINI_READY'?<><span>Model</span><strong>Gemini 3.5 Flash-Lite</strong><span>Gemini API Key</span><strong>LOCKED</strong><button type="button" className="secondary-button" onClick={()=>void disconnect()} disabled={!!activity}>{activity==='DISCONNECTING'?'Disconnecting…':'Disconnect'}</button></>:<><label>Gemini API Key<input aria-label="Gemini API Key" type="password" value={key} onChange={event=>setKey(event.target.value)}/></label><button type="button" className="primary-button" onClick={()=>void connect()} disabled={!key||!!activity}>{activity==='CONNECTING'?'Connecting…':'Connect'}</button></>}</div><p>Connection is held only in this server process and clears on restart.</p>{error&&<p role="alert" className="analysis-error">{error}</p>}</section>;
}

type ProgressiveScene=BlueprintSceneView|FinalizedScriptSceneView|SceneView;
const hasScript=(scene:ProgressiveScene):scene is FinalizedScriptSceneView|SceneView=>'keyPoints' in scene;
const hasCompile=(scene:ProgressiveScene):scene is SceneView=>'prompt' in scene;
function SceneCard({ scene, snapshotId, references, onUploaded }: { readonly scene: ProgressiveScene; readonly snapshotId?: string|undefined; readonly references: ReadonlyMap<string, ReferenceAssetState>; readonly onUploaded: (scene:SceneView)=>void }) {
  const [showPrompt,setShowPrompt]=useState(false); const [error,setError]=useState<string|undefined>(); const [uploading,setUploading]=useState(false); const [copied,setCopied]=useState(false); const [replacing,setReplacing]=useState(false); const [selectedFile,setSelectedFile]=useState<string>();
  const upload=async(file:File|undefined)=>{if(!file||!snapshotId||!hasCompile(scene)||uploading)return;setSelectedFile(file.name);setError(undefined);if(!file.type.startsWith('video/')){setError('Please select a video file (MP4 is required).');return;}setUploading(true);try{onUploaded(await uploadCandidate(snapshotId,scene,file));}catch(e){setError(e instanceof ProductionClientError&&e.code==='SCENE_QC_FAILED'?'Scene QC could not be completed. You can retry this same video candidate.':e instanceof ProductionClientError&&e.code==='VIDEO_TECHNICAL_INVALID'?'This video is not a verified 8-second 9:16 MP4.':'Invalid or stale video.');}finally{setUploading(false);}};
  const gateList=(title:string,gates:readonly {gate:string;status:string}[]) => <div className="qc-gates"><strong>{title}</strong>{gates.map(g=><span key={g.gate} className={g.status==='PASS'?'gate-pass':'gate-fail'}>{g.gate.replaceAll('_',' ')} · {g.status}</span>)}</div>;
  const replace=async()=>{if(!snapshotId||!hasCompile(scene)||replacing)return;setReplacing(true);try{onUploaded(await replaceFailedCandidate(snapshotId,scene));setError(undefined);}catch{setError('This failed candidate can no longer be replaced.');}finally{setReplacing(false);}};
  const copy=async()=>{if(!hasCompile(scene))return;await navigator.clipboard?.writeText(scene.prompt);setCopied(true);setTimeout(()=>setCopied(false),1500);};
  const lifecycle=uploading?'QC_RUNNING':hasCompile(scene)?scene.lifecycleStatus:hasScript(scene)?'PRODUCTION_COMPILE_PENDING':'SCRIPT_NOT_FINALIZED';
  return <article className="scene-card"><div className="scene-heading"><div><p className="status-label">Scene {scene.index} — {scene.role}</p><h3>{scene.primaryAction.replaceAll('_',' ')}</h3></div><span className={`lifecycle lifecycle-${lifecycle.toLowerCase()}`}>{lifecycle}</span></div>{hasCompile(scene)&&<p><strong>Attempt:</strong> {scene.attempt}</p>}<p><strong>Start → End:</strong> {scene.startSummary} → {scene.endSummary}</p><p><strong>References:</strong> {scene.referenceAssetIds.length} required</p>{hasScript(scene)?<><ol className="key-points"><li>{scene.keyPoints[0]}</li><li>{scene.keyPoints[1]}</li></ol><p><strong>Dialogue:</strong> {scene.dialogue}</p><p><strong>Voice:</strong> {scene.voiceLabel}</p></>:<p className="pending-copy">Script not finalized</p>}{hasCompile(scene)&&<><p><strong>Visual Rhythm:</strong> {scene.visualRhythm}</p><p><strong>Prompt:</strong> {scene.promptCharacterCount} / 3200 · {scene.promptBudgetStatus}</p><div className="scene-actions"><button type="button" className="secondary-button" aria-expanded={showPrompt} onClick={()=>setShowPrompt(value=>!value)}>{showPrompt?'Hide Prompt':'View Prompt'}</button><button type="button" className="secondary-button" onClick={()=>void copy()}>{copied?'Copied':'Copy Prompt'}</button></div>{showPrompt&&<pre className="prompt-view">{scene.prompt}</pre>}
    {scene.lifecycleStatus==='READY_FOR_FLOW'&&<section className="flow-panel"><h4>Manual Flow action</h4><p>Omni Flash 1.1 · 8 seconds · 9:16 · {scene.voiceLabel}</p><ol><li><button type="button" className="secondary-button" onClick={()=>void copy()}>{copied?'Copied':'Copy Prompt'}</button></li><li>Generate manually in Flow</li><li><label className="file-picker">Upload MP4<input aria-label={`Upload Generated MP4 Scene ${scene.index}`} type="file" accept="video/mp4,video/*" disabled={uploading} onChange={event=>void upload(event.target.files?.[0])}/></label>{selectedFile&&<span className="file-state">{uploading?`Checking ${selectedFile}…`:`Selected: ${selectedFile}`}</span>}</li></ol><div className="flow-thumbnails">{scene.referenceAssetIds.map(id=>{const reference=references.get(id);return reference?<img key={id} src={reference.previewUrl} alt="Required product reference"/>:null;})}</div>{error&&<p role="alert" className="analysis-error">{error}</p>}</section>}
    {scene.qcReport&&<section className="qc-panel"><h4>{scene.qcReport.result==='SCENE_QC_PASS'?'Scene QC PASS':'Scene QC FAIL'}</h4>{gateList('Product and framing',scene.qcReport.frameGates)}{gateList('Action and timing',scene.qcReport.temporalGates)}{gateList('Speech',scene.qcReport.speechGates)}<p><strong>Expected dialogue:</strong> {scene.qcReport.expectedDialogue}</p><p><strong>Detected transcript:</strong> {scene.qcReport.detectedTranscript}</p><p><strong>Exact dialogue match:</strong> {scene.qcReport.exactDialogueMatch}</p><p className={scene.qcReport.presentationDynamics.status==='WARN'?'presentation-warn':'gate-pass'}>Presentation Dynamics · {scene.qcReport.presentationDynamics.status}: {scene.qcReport.presentationDynamics.notes}</p>{scene.qcReport.result==='SCENE_QC_FAIL'&&<button type="button" className="primary-button" disabled={replacing} onClick={()=>void replace()}>{replacing?'Replacing…':'Replace Failed Video'}</button>}{error&&<p role="alert" className="analysis-error">{error}</p>}</section>}</>}
  </article>;
}

function saveBlob(filename:DeliveryOutputName,blob:Blob):void { const url=URL.createObjectURL(blob); const anchor=document.createElement('a'); anchor.href=url; anchor.download=filename; anchor.click(); setTimeout(()=>URL.revokeObjectURL(url),0); }
export function DeliveryCenter({ snapshotId, delivery, onDelivery }: { readonly snapshotId:string; readonly delivery:DeliveryManifest; readonly onDelivery:(delivery:DeliveryManifest)=>void }) {
  const [error,setError]=useState<string>(); const [saving,setSaving]=useState(false); const [downloadState,setDownloadState]=useState<{readonly filename:DeliveryOutputName;readonly status:'DOWNLOADING'|'DOWNLOADED'}>();
  if(delivery.status==='NOT_READY') return null;
  const download=async(filename:DeliveryOutputName)=>{if(downloadState?.status==='DOWNLOADING')return;setDownloadState({filename,status:'DOWNLOADING'});try { setError(undefined); saveBlob(filename,await deliveryOutput(snapshotId,filename));setDownloadState({filename,status:'DOWNLOADED'});setTimeout(()=>setDownloadState(undefined),1500); } catch { setDownloadState(undefined);setError('Delivery is no longer ready. Run Final Acceptance again.'); }};
  const saveAll=async()=>{ setSaving(true); setError(undefined); try { const picker=(window as Window & {showDirectoryPicker?:()=>Promise<{getFileHandle:(name:string,options:{create:boolean})=>Promise<{createWritable:()=>Promise<{write:(data:Blob)=>Promise<void>;close:()=>Promise<void>}>}>}>}).showDirectoryPicker; if(!picker) { for(const output of delivery.outputs) saveBlob(output.filename,await deliveryOutput(snapshotId,output.filename)); } else { const directory=await picker(); for(const output of delivery.outputs) { const file=await directory.getFileHandle(output.filename,{create:true}); const writer=await file.createWritable(); await writer.write(await deliveryOutput(snapshotId,output.filename)); await writer.close(); } } onDelivery(await recordDelivery(snapshotId)); } catch { setError('The five files could not be saved. Delivery remains available for individual downloads.'); } finally { setSaving(false); } };
  return <section className="delivery-center" aria-labelledby="delivery-title"><p className="status-label">{delivery.status}</p><h2 id="delivery-title">Delivery</h2><p>Your approved files are ready. Choose a folder to save all five files, or download them individually.</p><button type="button" className="primary-button" onClick={()=>void saveAll()} disabled={saving}>{saving?'Saving files…':'Save 5 files to folder'}</button><div className="delivery-list">{delivery.outputs.map((output,index)=>{const current=downloadState?.filename===output.filename?downloadState.status:undefined;return <div key={output.filename}><span>{output.filename}</span><button type="button" className="secondary-button" disabled={current==='DOWNLOADING'} onClick={()=>void download(output.filename)}>{current==='DOWNLOADING'?'Downloading…':current==='DOWNLOADED'?'Downloaded':index===4?'Download key-points.txt':`Download Scene ${index+1}`}</button></div>;})}</div>{error&&<p role="alert" className="analysis-error">{error}</p>}</section>;
}

interface LayerEntry {readonly status:LayerStatus;readonly id?:string;readonly error?:string;readonly stage?:string;readonly diagnostic?:LayerDiagnostic;}
type LayerEntries=Record<ProductionLayer,LayerEntry>;
interface LayerOperation {readonly generation:number;readonly factualRevision:number;readonly creativeRevision?:number;readonly predecessorId?:string;}
const initialLayers=(ready:boolean):LayerEntries=>({L1:{status:ready?'READY':'LOCKED'},L2:{status:'LOCKED'},L3:{status:'LOCKED'},L4:{status:'LOCKED'}});
function LayerCard({layer,title,entry,buttonLabel,runningLabel,successLabel,disabled,onRun}:{readonly layer:ProductionLayer;readonly title:string;readonly entry:LayerEntry;readonly buttonLabel:string;readonly runningLabel:string;readonly successLabel:string;readonly disabled:boolean;readonly onRun:()=>void}){
  const failed=entry.status==='FAIL';const complete=entry.status==='PASS'||entry.status==='READY_FOR_FLOW';
  return <article className={`layer-card layer-${entry.status.toLowerCase()}`} aria-label={`${layer} ${title}`}><div className="layer-heading"><span className="led" aria-hidden="true"/><div><p className="status-label">{layer}</p><h3>{title}</h3></div><strong className="layer-status">{entry.status}</strong></div><button type="button" className={complete?'success-button':'primary-button'} disabled={disabled||complete||entry.status==='RUNNING'} onClick={onRun}>{entry.status==='RUNNING'?runningLabel:complete?`✓ ${successLabel}`:failed?`Retry ${title}`:buttonLabel}</button>{entry.error&&<div role="alert" className="layer-error"><p>{entry.error}</p>{(entry.stage||entry.diagnostic)&&<details><summary>Developer details</summary>{entry.stage&&<p>{entry.stage}</p>}{entry.diagnostic&&<p>{JSON.stringify(entry.diagnostic)}</p>}</details>}</div>}</article>;
}

function ProductionWorkspace({ readyInput, references, files, runtime, factualRevision, creativeRevision, analyzeFoundation, onWorkflowChange }: { readonly readyInput:MochiProjectInput|null;readonly references:readonly ReferenceAssetState[];readonly files:ReadonlyMap<string,File>;readonly runtime:RuntimeStatus;readonly factualRevision:number;readonly creativeRevision:number;readonly analyzeFoundation:()=>Promise<string>;readonly onWorkflowChange:(state:ProductionWorkflowState)=>void }) {
  const [layers,setLayers]=useState<LayerEntries>(()=>initialLayers(readyInput!==null));const [scenes,setScenes]=useState<ProgressiveScene[]>([]);const [snapshotId,setSnapshotId]=useState<string>();const [sequence,setSequence]=useState<SequenceView>();const [finalAcceptance,setFinalAcceptance]=useState<FinalAcceptanceView>();const [delivery,setDelivery]=useState<DeliveryManifest>();const [continuityRunning,setContinuityRunning]=useState(false);const [workspaceMessage,setWorkspaceMessage]=useState<string>();const previousFactual=useRef(factualRevision);const previousCreative=useRef(creativeRevision);const operationGenerations=useRef<Record<ProductionLayer,number>>({L1:0,L2:0,L3:0,L4:0});const factualRevisionRef=useRef(factualRevision);const creativeRevisionRef=useRef(creativeRevision);const layersRef=useRef(layers);
  factualRevisionRef.current=factualRevision;creativeRevisionRef.current=creativeRevision;layersRef.current=layers;
  const invalidateOperations=(...invalidated:readonly ProductionLayer[])=>{for(const layer of invalidated)operationGenerations.current[layer]+=1;};
  const beginOperation=(layer:ProductionLayer,predecessorId?:string):LayerOperation=>{const generation=operationGenerations.current[layer]+1;operationGenerations.current[layer]=generation;return{generation,factualRevision:factualRevisionRef.current,...(layer==='L1'?{}:{creativeRevision:creativeRevisionRef.current}),...(predecessorId?{predecessorId}:{})};};
  const operationIsCurrent=(layer:ProductionLayer,operation:LayerOperation,predecessorLayer?:ProductionLayer):boolean=>operationGenerations.current[layer]===operation.generation&&factualRevisionRef.current===operation.factualRevision&&(layer==='L1'||creativeRevisionRef.current===operation.creativeRevision)&&(!predecessorLayer||layersRef.current[predecessorLayer].id===operation.predecessorId);
  useEffect(()=>{if(previousFactual.current===factualRevision)return;previousFactual.current=factualRevision;invalidateOperations('L1','L2','L3','L4');setLayers(current=>({L1:{status:current.L1.status==='LOCKED'||current.L1.status==='READY'?readyInput?'READY':'LOCKED':'NEEDS_REANALYSIS'},L2:{status:current.L2.status==='LOCKED'?'LOCKED':'STALE'},L3:{status:current.L3.status==='LOCKED'?'LOCKED':'STALE'},L4:{status:current.L4.status==='LOCKED'?'LOCKED':'STALE'}}));setScenes([]);setSnapshotId(undefined);setSequence(undefined);setFinalAcceptance(undefined);setDelivery(undefined);setWorkspaceMessage(undefined);},[factualRevision,readyInput]);
  useEffect(()=>{if(previousCreative.current===creativeRevision)return;previousCreative.current=creativeRevision;invalidateOperations('L2','L3','L4');setLayers(current=>current.L1.id?{L1:{status:'PASS',id:current.L1.id},L2:{status:'NEEDS_REBUILD'},L3:{status:current.L3.status==='LOCKED'?'LOCKED':'STALE'},L4:{status:current.L4.status==='LOCKED'?'LOCKED':'STALE'}}:current);setScenes([]);setSnapshotId(undefined);setSequence(undefined);setFinalAcceptance(undefined);setDelivery(undefined);setWorkspaceMessage(undefined);},[creativeRevision]);
  useEffect(()=>{onWorkflowChange({l1:layers.L1.status,l2:layers.L2.status,l3:layers.L3.status,l4:layers.L4.status,finalAcceptancePassed:finalAcceptance?.status==='FINAL_ACCEPTANCE_PASS',deliveryStatus:delivery?.status??'NOT_READY'});},[layers,finalAcceptance,delivery,onWorkflowChange]);
  const failure=(layer:ProductionLayer,error:unknown):LayerEntry=>{const client=error instanceof ProductionClientError?error:undefined;const evidence=error instanceof ProductEvidenceClientError?error:undefined;const diagnostic=client?.diagnostic;const stage=client?.stage;const detail=layer==='L1'&&evidence?formatAnalysisError(evidence.code):layer==='L1'?'Product Foundation could not be completed.':layer==='L2'?'Scene Blueprint could not be completed.':layer==='L3'?'Script Finalization could not be completed.':'Production Compile could not be completed.';return{status:'FAIL',error:detail,...(stage?{stage}:{}),...(diagnostic?{diagnostic}:{})};};
  const runL1=async()=>{if(!readyInput||runtime!=='GEMINI_READY'||layers.L1.status==='RUNNING')return;invalidateOperations('L2','L3','L4');const operation=beginOperation('L1');setLayers(current=>({...current,L1:{status:'RUNNING'}}));try{const foundationId=await analyzeFoundation();if(!operationIsCurrent('L1',operation))return;setLayers({L1:{status:'PASS',id:foundationId},L2:{status:'READY'},L3:{status:'LOCKED'},L4:{status:'LOCKED'}});setScenes([]);}catch(error){if(!operationIsCurrent('L1',operation))return;setLayers(current=>({...current,L1:failure('L1',error),L2:{status:'LOCKED'},L3:{status:'LOCKED'},L4:{status:'LOCKED'}}));}};
  const runL2=async()=>{const foundationId=layers.L1.id;if(!readyInput||!foundationId||layers.L2.status==='RUNNING')return;invalidateOperations('L3','L4');const operation=beginOperation('L2',foundationId);setLayers(current=>({...current,L2:{status:'RUNNING'},L3:{status:'LOCKED'},L4:{status:'LOCKED'}}));try{const result=await createSceneBlueprint(foundationId,readyInput.creativeDirection);if(!operationIsCurrent('L2',operation,'L1'))return;setScenes(result.scenes);setLayers(current=>({...current,L1:{status:'PASS',id:foundationId},L2:{status:'PASS',id:result.blueprintId},L3:{status:'READY'},L4:{status:'LOCKED'}}));}catch(error){if(!operationIsCurrent('L2',operation,'L1'))return;setLayers(current=>({...current,L2:failure('L2',error)}));}};
  const runL3=async()=>{const blueprintId=layers.L2.id;if(!blueprintId||layers.L3.status==='RUNNING')return;invalidateOperations('L4');const operation=beginOperation('L3',blueprintId);setLayers(current=>({...current,L3:{status:'RUNNING'},L4:{status:'LOCKED'}}));try{const result=await createFinalizedScript(blueprintId);if(!operationIsCurrent('L3',operation,'L2'))return;setScenes(result.scenes);setLayers(current=>({...current,L3:{status:'PASS',id:result.scriptId},L4:{status:'READY'}}));}catch(error){if(!operationIsCurrent('L3',operation,'L2'))return;setLayers(current=>({...current,L3:failure('L3',error)}));}};
  const runL4=async()=>{const scriptId=layers.L3.id;if(!scriptId||layers.L4.status==='RUNNING')return;const operation=beginOperation('L4',scriptId);setLayers(current=>({...current,L4:{status:'RUNNING'}}));try{const result=await compileProduction(scriptId);if(!operationIsCurrent('L4',operation,'L3'))return;setScenes(result.scenes);setSnapshotId(result.snapshotId);setLayers(current=>({...current,L4:{status:'READY_FOR_FLOW',id:result.readyId}}));}catch(error){if(!operationIsCurrent('L4',operation,'L3'))return;setLayers(current=>({...current,L4:failure('L4',error)}));}};
  const finalScenes=scenes.filter(hasCompile);const canSequence=finalScenes.length===4&&finalScenes.every(scene=>scene.lifecycleStatus==='QC_PASS');const referenceMap=new Map(references.map(reference=>[reference.asset.assetId,reference]));
  const updateScene=(updated:SceneView)=>{setScenes(current=>current.map(scene=>scene.sceneId===updated.sceneId?updated:scene));setSequence(undefined);setFinalAcceptance(undefined);setDelivery(undefined);};
  const continuity=async()=>{if(!snapshotId||continuityRunning)return;setContinuityRunning(true);setWorkspaceMessage(undefined);try{const value=await runSequence(snapshotId);setSequence(value);const acceptance=await runFinalAcceptance(snapshotId);setFinalAcceptance(acceptance);setDelivery(acceptance.status==='FINAL_ACCEPTANCE_PASS'?await deliveryManifest(snapshotId):undefined);}catch{setWorkspaceMessage('Continuity QC failed.');}finally{setContinuityRunning(false);}};
  return <><section className="production-workspace" aria-labelledby="production-title"><p className="status-label">Layered production</p><h2 id="production-title">Build each persisted layer independently</h2><div className="layer-grid"><LayerCard layer="L1" title="Product Foundation" entry={layers.L1} buttonLabel="Analyze Product" runningLabel="Analyzing Product…" successLabel="Product Foundation Ready" disabled={!readyInput||runtime!=='GEMINI_READY'} onRun={()=>void runL1()}/><LayerCard layer="L2" title="Scene Blueprint" entry={layers.L2} buttonLabel="Build Scene Blueprint" runningLabel="Building Blueprint…" successLabel="Blueprint Ready" disabled={!layers.L1.id||!['READY','NEEDS_REBUILD','FAIL'].includes(layers.L2.status)} onRun={()=>void runL2()}/><LayerCard layer="L3" title="Script Finalization" entry={layers.L3} buttonLabel="Finalize Script" runningLabel="Finalizing Script…" successLabel="Script Ready" disabled={!layers.L2.id||!['READY','FAIL'].includes(layers.L3.status)} onRun={()=>void runL3()}/><LayerCard layer="L4" title="Production Compile" entry={layers.L4} buttonLabel="Prepare for Flow" runningLabel="Preparing for Flow…" successLabel="Ready for Flow" disabled={!layers.L3.id||!['READY','FAIL'].includes(layers.L4.status)} onRun={()=>void runL4()}/></div></section>{scenes.length>0&&<section className="scenes-section" aria-labelledby="scenes-title"><p className="status-label">Progressive scene cards</p><h2 id="scenes-title">Four-scene production</h2><div className="scene-grid">{scenes.map(scene=><SceneCard key={scene.sceneId} scene={scene} snapshotId={snapshotId} references={referenceMap} onUploaded={updateScene}/>)}</div></section>}{snapshotId&&<section className="sequence-panel"><p className="status-label">Scene QC</p><h2>Sequence continuity</h2><button type="button" className="primary-button" disabled={!canSequence||continuityRunning} onClick={()=>void continuity()}>{continuityRunning?'Running Continuity Check…':'Run Continuity Check'}</button>{!canSequence&&<p>Upload and pass Scene QC for all four scenes to enable continuity checking.</p>}{workspaceMessage&&<p role="alert" className="analysis-error">{workspaceMessage}</p>}{sequence&&<div><p className={sequence.status==='FOUR_SCENE_SEQUENCE_PASS'?'gate-pass':'gate-fail'}>{sequence.status}</p>{sequence.pairs.map((pair,index)=><div key={pair.fromSceneId}><strong>Pair {index+1} → {index+2}</strong>{pair.gates.map(g=><span key={g.gate} className={g.status==='PASS'?'gate-pass':'gate-fail'}>{g.gate.replaceAll('_',' ')} {g.status}</span>)}</div>)}<div><strong>Global</strong>{sequence.globalGates.map(g=><span key={g.gate} className={g.status==='PASS'?'gate-pass':'gate-fail'}>{g.gate.replaceAll('_',' ')} {g.status}</span>)}</div><p className={sequence.visualVariation==='WARN'?'presentation-warn':'gate-pass'}>Visual Variation: {sequence.visualVariation}</p></div>}{finalAcceptance&&<p className={finalAcceptance.status==='FINAL_ACCEPTANCE_PASS'?'gate-pass':'gate-fail'}>{finalAcceptance.status==='FINAL_ACCEPTANCE_PASS'?'READY_FOR_DELIVERY':finalAcceptance.status}{finalAcceptance.blockerCodes.length?`: ${finalAcceptance.blockerCodes.join(', ')}`:''}</p>}</section>}{delivery&&snapshotId&&<DeliveryCenter snapshotId={snapshotId} delivery={delivery} onDelivery={setDelivery}/>}</>;
}

export function App() {
  const [projectId] = useState(() => createLogicalId('project'));
  const [productId] = useState(() => createLogicalId('product'));
  const [productName, setProductName] = useState('');
  const [productDetails, setProductDetails] = useState('');
  const [category, setCategory] = useState('');
  const [audience, setAudience] = useState('AUTO_PRODUCT_FIT');
  const [shootingContext, setShootingContext] = useState('AUTO_PRODUCT_FIT');
  const [reviewerPersona, setReviewerPersona] = useState('AUTHENTIC POV ON-HAND REVIEWER; NO REVIEWER FACE; REAL BUYER-LIKE INTERACTION');
  const [tone, setTone] = useState('AUTO_ROLE_APPROPRIATE_V1');
  const [voiceStyle, setVoiceStyle] = useState('review');
  const [voiceGender, setVoiceGender] = useState<VoiceGender>('FEMALE');
  const [voiceRegion, setVoiceRegion] = useState<VoiceRegion>('SOUTH');
  const [referenceAssets, setReferenceAssets] = useState<readonly ReferenceAssetState[]>([]);
  const [analysisState, setAnalysisState] = useState<AnalysisState>('IDLE');
  const [productEvidence, setProductEvidence] = useState<ProductEvidence | null>(null);
  const [analysisReceiptId, setAnalysisReceiptId] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<ProductEvidenceClientErrorCode | null>(null);
  const [analysisIssueCodes, setAnalysisIssueCodes] = useState<readonly string[]>([]);
  const [runtime, setRuntime] = useState<RuntimeStatus>('GEMINI_NOT_CONFIGURED');
  const [factualRevision,setFactualRevision]=useState(0);
  const [creativeRevision,setCreativeRevision]=useState(0);
  const [productionWorkflow,setProductionWorkflow]=useState<ProductionWorkflowState>(emptyProductionWorkflow);
  const filesByAssetId = useRef(new Map<string, File>());
  const previewUrls = useRef(new Set<string>());
  const analysisAbort = useRef<AbortController | null>(null);
  const analysisGeneration = useRef(0);

  const invalidateProductEvidence = () => {
    const wasReady=analysisReceiptId!==null;
    analysisGeneration.current += 1;
    analysisAbort.current?.abort();
    analysisAbort.current = null;
    setProductEvidence(null);
    setAnalysisReceiptId(null);
    setFactualRevision(current=>current+1);
    setProductionWorkflow(emptyProductionWorkflow);
    setAnalysisError(null);
    setAnalysisIssueCodes([]);
    setAnalysisState(wasReady?'STALE':'IDLE');
  };
  const updateFactualValue = <T,>(setter: Dispatch<SetStateAction<T>>, value: T) => {
    invalidateProductEvidence();
    setter(value);
  };
  const updateCreativeValue = <T,>(currentValue:T,setter: Dispatch<SetStateAction<T>>, value: T) => {
    if(Object.is(currentValue,value))return;
    setter(value);
    setCreativeRevision(current=>current+1);
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
    invalidateProductEvidence();
  };

  const projectInput = buildProjectInput();
  const validationIssues = validateMochiProjectInput(projectInput);
  const readyInput = validationIssues.length === 0 ? projectInput : null;

  const analyzeFoundation = async ():Promise<string> => {
    const controller = new AbortController();
    const requestGeneration = analysisGeneration.current + 1;
    analysisGeneration.current = requestGeneration;
    analysisAbort.current?.abort();
    analysisAbort.current = controller;
    setProductEvidence(null);
    setAnalysisError(null);
    setAnalysisIssueCodes([]);
    setAnalysisState('ANALYZING');
    try {
      const product=buildProductInput();
      const result = await analyzeProductEvidence({ product, filesByAssetId: filesByAssetId.current, signal: controller.signal });
      if (analysisGeneration.current === requestGeneration && !controller.signal.aborted) {
        const foundation=await createProductFoundation(projectId,product,filesByAssetId.current,result.analysisReceiptId);
        if(analysisGeneration.current!==requestGeneration||controller.signal.aborted)throw new DOMException('Aborted','AbortError');
        setProductEvidence(result.evidence);
        setAnalysisReceiptId(result.analysisReceiptId);
        setAnalysisState('READY');
        return foundation.foundationId;
      }
      throw new DOMException('Aborted','AbortError');
    } catch (error) {
      if (analysisGeneration.current !== requestGeneration || controller.signal.aborted) throw error;
      const safeError = error instanceof ProductEvidenceClientError ? error : undefined;
      setAnalysisError(safeError?.code ?? 'INVALID_RESPONSE');
      setAnalysisIssueCodes(safeError?.issueCodes ?? []);
      setAnalysisState('ERROR');
      throw error;
    } finally {
      if (analysisGeneration.current === requestGeneration) analysisAbort.current = null;
    }
  };

  return (
    <main className="shell">
      <header className="page-header"><p className="eyebrow">MochiV1 · Production workspace</p><h1>POV On-Hand Review</h1><p>Build a grounded four-scene production plan from product references.</p></header>
      <nav className="workflow" aria-label="Production workflow">{(()=>{const states=[productionWorkflow.l1,productionWorkflow.l2,productionWorkflow.l3,productionWorkflow.l4] as const;const steps=[['Product Foundation',states[0]],['Scene Blueprint',states[1]],['Script Finalization',states[2]],['Production Compile',states[3]],['Scene QC',productionWorkflow.finalAcceptancePassed?'PASS':states[3]==='READY_FOR_FLOW'?'READY':'LOCKED'],['Delivery',productionWorkflow.deliveryStatus==='DELIVERED'?'PASS':productionWorkflow.finalAcceptancePassed?'READY':'LOCKED']] as const;return steps.map(([label,status],index)=>{const complete=status==='PASS'||status==='READY_FOR_FLOW';const current=status==='READY'||status==='RUNNING'||status==='NEEDS_REBUILD'||status==='NEEDS_REANALYSIS'||status==='FAIL';return <div key={label} className={complete?'workflow-complete':current?'workflow-current':'workflow-not-ready'}><span>{index+1}</span><strong>{label}</strong><small>{status}</small></div>;});})()}</nav>
      <RuntimeSetup status={runtime} onStatus={setRuntime} />
      <form className="project-form" noValidate onSubmit={event=>event.preventDefault()}>
        <section className="form-card" aria-labelledby="product-title">
          <h2 id="product-title">Product</h2>
          <div className="field-grid"><label>Product Name<input value={productName} onChange={event => updateFactualValue(setProductName, event.target.value)} /></label><label>Category<input value={category} onChange={event => updateFactualValue(setCategory, event.target.value)} /></label></div>
          <label>Product Details<textarea rows={4} value={productDetails} onChange={event => updateFactualValue(setProductDetails, event.target.value)} /></label>
          <div className="references" aria-labelledby="references-title"><div><h3 id="references-title">Product reference images</h3><p>Images are browser runtime state. The project contract keeps logical asset references only.</p></div><label className="file-picker">Add product images<input aria-label="Add product images" type="file" accept="image/*" multiple onChange={handleReferenceSelection} /></label></div>
          {referenceAssets.length > 0 && <ul className="reference-list" aria-label="Selected product reference images">{referenceAssets.map(reference => <li key={reference.asset.assetId} className="reference-card"><img src={reference.previewUrl} alt="Product reference preview" /><button type="button" className="secondary-button" onClick={() => removeReference(reference.asset.assetId)}>Remove</button></li>)}</ul>}
          <p className="input-feedback">{referenceAssets.length} product {referenceAssets.length===1?'reference':'references'} selected</p>
          {runtime !== 'GEMINI_READY' && <p className="analysis-status">Connect Gemini to analyze the product.</p>}
          {analysisState === 'ERROR' && analysisError !== null && <div role="alert" className="analysis-error"><p>Product analysis could not be completed: {formatAnalysisError(analysisError)}.</p><details><summary>Developer details</summary><p>{analysisError}</p>{analysisIssueCodes.length>0&&<p>{JSON.stringify(analysisIssueCodes)}</p>}</details></div>}
        </section>
        <section className="form-card" aria-labelledby="creative-title">
          <h2 id="creative-title">Creative Direction</h2>
          <div className="field-grid">
            <label>Audience<select aria-label="Audience" value={audience} onChange={event => updateCreativeValue(audience,setAudience,event.target.value)}><option value="AUTO_PRODUCT_FIT">Tự động theo sản phẩm</option><option value="PARENTS_FAMILY">Phụ huynh / Gia đình</option><option value="YOUNG_ADULTS_GEN_Z">Người trẻ / Gen Z</option><option value="PRACTICAL_BUYERS">Người mua thực dụng</option><option value="GIFT_BUYERS">Người mua quà tặng</option></select></label>
            <label>Shooting Context<select aria-label="Shooting Context" value={shootingContext} onChange={event => updateCreativeValue(shootingContext,setShootingContext,event.target.value)}><option value="AUTO_PRODUCT_FIT">Tự động theo sản phẩm</option><option value="INDOOR_TABLE_REVIEW">Trong nhà / bàn review</option><option value="HOME_LIFESTYLE">Không gian gia đình</option><option value="OUTDOOR_CASUAL">Ngoài trời</option><option value="FESTIVE_CONTEXT">Không gian lễ hội</option></select></label>
            <label>Reviewer Persona<select aria-label="Reviewer Persona" value={reviewerPersona} onChange={event=>updateCreativeValue(reviewerPersona,setReviewerPersona,event.target.value)}><option value="AUTHENTIC POV ON-HAND REVIEWER; NO REVIEWER FACE; REAL BUYER-LIKE INTERACTION">Authentic buyer-like reviewer</option><option value="PRACTICAL POV ON-HAND REVIEWER; NO REVIEWER FACE; DETAIL-FOCUSED INTERACTION">Practical detail-focused reviewer</option></select></label>
            <label>Tone<select aria-label="Tone" value={tone} onChange={event=>updateCreativeValue(tone,setTone,event.target.value)}><option value="AUTO_ROLE_APPROPRIATE_V1">Automatic by scene role</option><option value="CALM_INFORMATIVE">Calm and informative</option><option value="WARM_CONVERSATIONAL">Warm and conversational</option></select></label>
            <label>Voice Style<select aria-label="Voice Style" value={voiceStyle} onChange={event=>updateCreativeValue(voiceStyle,setVoiceStyle,event.target.value)}><option value="review">Review</option><option value="conversational">Conversational</option></select></label>
          </div>
          <div className="voice-choice-groups">
            <fieldset className="voice-gender-cards"><legend>Voice Gender</legend><button type="button" aria-pressed={voiceGender==='FEMALE'} className={voiceGender==='FEMALE'?'voice-card active':'voice-card'} onClick={()=>updateCreativeValue<VoiceGender>(voiceGender,setVoiceGender,'FEMALE')}>NỮ</button><button type="button" aria-pressed={voiceGender==='MALE'} className={voiceGender==='MALE'?'voice-card active':'voice-card'} onClick={()=>updateCreativeValue<VoiceGender>(voiceGender,setVoiceGender,'MALE')}>NAM</button></fieldset>
            <fieldset className="voice-gender-cards"><legend>Voice Region</legend><button type="button" aria-pressed={voiceRegion==='SOUTH'} className={voiceRegion==='SOUTH'?'voice-card active':'voice-card'} onClick={()=>updateCreativeValue<VoiceRegion>(voiceRegion,setVoiceRegion,'SOUTH')}>SOUTH</button><button type="button" aria-pressed={voiceRegion==='NORTH'} className={voiceRegion==='NORTH'?'voice-card active':'voice-card'} onClick={()=>updateCreativeValue<VoiceRegion>(voiceRegion,setVoiceRegion,'NORTH')}>NORTH</button></fieldset>
          </div>
        </section>
      </form>
      <ProductionWorkspace readyInput={readyInput} references={referenceAssets} files={filesByAssetId.current} runtime={runtime} factualRevision={factualRevision} creativeRevision={creativeRevision} analyzeFoundation={analyzeFoundation} onWorkflowChange={setProductionWorkflow} />
      {(analysisState === 'IDLE'||analysisState==='STALE'||analysisState==='ANALYZING') && <section className="analysis-panel" aria-labelledby="analysis-empty-title"><h2 id="analysis-empty-title">Product Analysis</h2><p className="empty-evidence">{analysisState==='STALE'?'Product changed — analyze again.':analysisState==='ANALYZING'?'Product Evidence and Product Foundation are running.':'Add factual product input and reference images, then analyze the product.'}</p></section>}
      {analysisState === 'READY' && productEvidence !== null && <ProductEvidencePanel evidence={productEvidence} />}
      {validationIssues.length > 0 ? <section className="validation-errors" aria-labelledby="validation-title" role="alert"><h2 id="validation-title">Setup needs attention</h2><ul>{validationIssues.map(issue => <li key={issue}>{formatIssue(issue)}</li>)}</ul></section> : <p className="setup-ready">Setup ready</p>}
    </main>
  );
}
