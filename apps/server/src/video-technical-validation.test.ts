import assert from 'node:assert/strict';
import test from 'node:test';
import { FfprobeVideoMetadataInspectorV1, VideoTechnicalValidationError, validateVideoTechnicalMetadataV1 } from './video-technical-validation.ts';

test('Video Technical Validation V1 accepts exactly 8 seconds within 100ms and actual portrait dimensions after rotation', ()=>{
  assert.equal(validateVideoTechnicalMetadataV1({container:'MP4',width:1920,height:1080,durationMs:7900,rotationDegrees:90}).result,'VIDEO_TECHNICAL_PASS');
  assert.equal(validateVideoTechnicalMetadataV1({container:'MP4',width:1080,height:1920,durationMs:8100,rotationDegrees:0}).result,'VIDEO_TECHNICAL_PASS');
});

test('Video Technical Validation V1 rejects incorrect container, aspect, and duration', ()=>{
  for(const value of [{container:'MP4' as const,width:1920,height:1080,durationMs:8000,rotationDegrees:0 as const},{container:'MP4' as const,width:1080,height:1920,durationMs:8101,rotationDegrees:0 as const}]) assert.throws(()=>validateVideoTechnicalMetadataV1(value),VideoTechnicalValidationError);
});

test('the production ffprobe inspector fails closed when ffprobe is unavailable', async()=>{
  await assert.rejects(new FfprobeVideoMetadataInspectorV1('definitely-not-installed-ffprobe').inspect({mimeType:'video/mp4',bytes:new Uint8Array([0,1,2])}),(error:unknown)=>error instanceof VideoTechnicalValidationError&&error.code==='UNVERIFIABLE');
});
