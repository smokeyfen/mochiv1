import { validateMochiProjectInput, type MochiProjectInput } from '@mochi/contracts';
import { ProductionWorkspaceError, ProductionWorkspaceService, type BrowserReferenceMedia } from './production-workspace.ts';
import { RuntimeConfiguration } from './runtime-configuration.ts';

export function createProductionWorkspaceHttpHandler(dependencies:{readonly runtime:RuntimeConfiguration;readonly workspace:ProductionWorkspaceService}):(request:Request)=>Promise<Response> {
  return async request=>{
    const path=new URL(request.url).pathname;
    if(path==='/api/runtime/status'&&request.method==='GET') return Response.json({ok:true,status:dependencies.runtime.status()});
    if(path==='/api/runtime/connect'&&request.method==='POST') return connect(request,dependencies.runtime);
    if(path==='/api/runtime/disconnect'&&request.method==='POST') return Response.json({ok:true,status:dependencies.runtime.disconnect()});
    if(path==='/api/production/build'&&request.method==='POST') return build(request,dependencies.workspace);
    if(path==='/api/production/upload'&&request.method==='POST') return upload(request,dependencies.workspace);
    if(path==='/api/production/sequence'&&request.method==='POST') return sequence(request,dependencies.workspace);
    return Response.json({ok:false,error:{code:'NOT_FOUND'}},{status:404});
  };
}
async function connect(request:Request,runtime:RuntimeConfiguration):Promise<Response>{ try { const body=await request.json() as {apiKey?:unknown}; return Response.json({ok:true,status:runtime.connect(body?.apiKey)}); } catch { return failure('INVALID_CONFIGURATION'); } }
async function build(request:Request,workspace:ProductionWorkspaceService):Promise<Response>{ try { const form=await request.formData(); const project=decodeProject(form.get('project')); if(!project) return failure('INVALID_SETUP'); const references=await decodeReferences(form,project); if(!references) return failure('INVALID_SETUP'); const result=await workspace.build(project,references); return Response.json({ok:true,...result}); } catch(error) { return map(error); } }
async function upload(request:Request,workspace:ProductionWorkspaceService):Promise<Response>{ try { const form=await request.formData(); const snapshotId=field(form,'snapshotId'),sceneId=field(form,'sceneId'),candidateAssetId=field(form,'candidateAssetId'),video=form.get('video'); if(!snapshotId||!sceneId||!candidateAssetId||typeof video==='string'||!(video instanceof Blob)) return failure('INVALID_OR_STALE_VIDEO'); const scene=await workspace.uploadAndQc(snapshotId,sceneId,candidateAssetId,{type:video.type,bytes:new Uint8Array(await video.arrayBuffer())}); return Response.json({ok:true,scene}); } catch(error) { return map(error); } }
async function sequence(request:Request,workspace:ProductionWorkspaceService):Promise<Response>{ try { const body=await request.json() as {snapshotId?:unknown}; if(typeof body?.snapshotId!=='string') return failure('INVALID_OR_STALE_VIDEO'); return Response.json({ok:true,sequence:await workspace.runSequence(body.snapshotId)}); } catch(error) { return map(error); } }
function decodeProject(value:FormDataEntryValue|null):MochiProjectInput|undefined { if(typeof value!=='string') return; try { const project=JSON.parse(value) as MochiProjectInput; return validateMochiProjectInput(project).length===0?project:undefined; } catch { return; } }
async function decodeReferences(form:FormData,project:MochiProjectInput):Promise<readonly BrowserReferenceMedia[]|undefined>{ const result:BrowserReferenceMedia[]=[]; for(const asset of project.product.assets){const value=form.get(`asset:${asset.assetId}`); if(typeof value==='string'||!(value instanceof Blob)||value.type!==asset.mimeType||!value.type.startsWith('image/')||value.size===0)return; result.push({assetId:asset.assetId,mimeType:value.type,dataBase64:Buffer.from(await value.arrayBuffer()).toString('base64')});} return result; }
function field(form:FormData,key:string):string|undefined { const value=form.get(key); return typeof value==='string'&&value.trim().length>0?value:undefined; }
function map(error:unknown):Response { if(error instanceof ProductionWorkspaceError) return failure(error.code); return failure('PRODUCTION_BUILD_FAILED'); }
function failure(code:string):Response { return Response.json({ok:false,error:{code}},{status:code==='GEMINI_NOT_CONFIGURED'?503:400}); }
