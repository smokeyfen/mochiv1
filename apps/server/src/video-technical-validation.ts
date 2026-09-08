import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

export const VIDEO_TECHNICAL_VALIDATION_V1='VIDEO_TECHNICAL_VALIDATION_V1' as const;
export interface VideoTechnicalMetadataV1 { readonly container:'MP4'; readonly width:number; readonly height:number; readonly durationMs:number; readonly rotationDegrees:0|90|180|270; }
export interface ValidatedVideoTechnicalMetadataV1 extends VideoTechnicalMetadataV1 { readonly version:typeof VIDEO_TECHNICAL_VALIDATION_V1; readonly result:'VIDEO_TECHNICAL_PASS'; }
export interface VideoMetadataInspectorV1 { inspect(input:{readonly mimeType:string;readonly bytes:Uint8Array}):Promise<VideoTechnicalMetadataV1>; }
export class VideoTechnicalValidationError extends Error { readonly code:'UNVERIFIABLE'|'INVALID'; constructor(code:'UNVERIFIABLE'|'INVALID') { super(`VIDEO_TECHNICAL_VALIDATION_ERROR:${code}`); this.code=code; this.name='VideoTechnicalValidationError'; } }

/** Pure acceptance gate for metadata obtained only from the server-side inspector. */
export function validateVideoTechnicalMetadataV1(metadata:VideoTechnicalMetadataV1):ValidatedVideoTechnicalMetadataV1 {
  if(metadata.container!=='MP4'||!Number.isSafeInteger(metadata.width)||!Number.isSafeInteger(metadata.height)||metadata.width<=0||metadata.height<=0||!Number.isSafeInteger(metadata.durationMs)||Math.abs(metadata.durationMs-8000)>100||![0,90,180,270].includes(metadata.rotationDegrees)) throw new VideoTechnicalValidationError('INVALID');
  const rotated=metadata.rotationDegrees===90||metadata.rotationDegrees===270; const width=rotated?metadata.height:metadata.width; const height=rotated?metadata.width:metadata.height;
  if(width*16!==height*9) throw new VideoTechnicalValidationError('INVALID');
  return {version:VIDEO_TECHNICAL_VALIDATION_V1,result:'VIDEO_TECHNICAL_PASS',...metadata};
}

const execFileAsync=promisify(execFile);
type FfprobeResponse={readonly format?:{readonly format_name?:unknown;readonly duration?:unknown;readonly tags?:{readonly major_brand?:unknown}};readonly streams?:readonly {readonly codec_type?:unknown;readonly width?:unknown;readonly height?:unknown;readonly tags?:{readonly rotate?:unknown};readonly side_data_list?:readonly {readonly rotation?:unknown}[]}[]};
/** Local-only production inspector. Missing/broken ffprobe deliberately becomes UNVERIFIABLE. */
export class FfprobeVideoMetadataInspectorV1 implements VideoMetadataInspectorV1 {
  private readonly executable:string;
  constructor(executable='ffprobe') { this.executable=executable; }
  async inspect(input:{readonly mimeType:string;readonly bytes:Uint8Array}):Promise<VideoTechnicalMetadataV1> {
    if(input.mimeType!=='video/mp4'||input.bytes.length===0) throw new VideoTechnicalValidationError('INVALID');
    const root=await mkdtemp(join(tmpdir(),'mochi-v1-ffprobe-')); const path=join(root,'candidate.mp4');
    try { await writeFile(path,input.bytes); const {stdout}=await execFileAsync(this.executable,['-v','error','-show_entries','format=format_name,duration:format_tags=major_brand:stream=codec_type,width,height:stream_tags=rotate:stream_side_data=rotation','-of','json',path],{timeout:10_000,maxBuffer:1024*1024}); return parseFfprobe(JSON.parse(stdout) as FfprobeResponse); }
    catch(error) { if(error instanceof VideoTechnicalValidationError) throw error; throw new VideoTechnicalValidationError('UNVERIFIABLE'); }
    finally { await rm(root,{recursive:true,force:true}); }
  }
}
function parseFfprobe(value:FfprobeResponse):VideoTechnicalMetadataV1 {
  const stream=value.streams?.find(item=>item.codec_type==='video'); const formatName=value.format?.format_name; const brand=value.format?.tags?.major_brand; const width=stream?.width, height=stream?.height, duration=Number(value.format?.duration); const rawRotation=stream?.side_data_list?.find(item=>typeof item.rotation==='number')?.rotation??stream?.tags?.rotate; const rotation=typeof rawRotation==='number'?rawRotation:Number(rawRotation??0); const normalized=((rotation%360)+360)%360;
  if(!stream||typeof formatName!=='string'||!formatName.split(',').includes('mp4')||typeof brand!=='string'||!['isom','iso2','mp41','mp42','avc1','dash'].includes(brand.trim())||typeof width!=='number'||typeof height!=='number'||!Number.isFinite(duration)||![0,90,180,270].includes(normalized)) throw new VideoTechnicalValidationError('UNVERIFIABLE');
  return {container:'MP4',width,height,durationMs:Math.round(duration*1000),rotationDegrees:normalized as 0|90|180|270};
}
