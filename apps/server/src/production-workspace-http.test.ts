import assert from 'node:assert/strict';
import test from 'node:test';
import { createProductionWorkspaceHttpHandler } from './production-workspace-http.ts';
import type { ProductionWorkspaceService } from './production-workspace.ts';
import { RuntimeConfiguration } from './runtime-configuration.ts';

function handlerFor(output:{readonly mimeType:'video/mp4'|'text/plain; charset=utf-8';readonly bytes:Uint8Array}) {
  const workspace={deliveryOutput(snapshotId:string,filename:string){assert.equal(snapshotId,'snapshot-1'); assert.ok(['scene-01.mp4','key-points.txt'].includes(filename)); return output;}} as unknown as ProductionWorkspaceService;
  return createProductionWorkspaceHttpHandler({runtime:new RuntimeConfiguration(),workspace});
}

test('delivery HTTP returns only the exact MP4 byte view, without backing-buffer slack', async()=>{
  const backing=new Uint8Array([99,0x00,0x01,0x02,0x03,88]); const response=await handlerFor({mimeType:'video/mp4',bytes:backing.subarray(1,5)})(new Request('http://local/api/production/delivery/scene-01.mp4?snapshotId=snapshot-1'));
  assert.equal(response.status,200); assert.equal(response.headers.get('content-type'),'video/mp4'); assert.equal(response.headers.get('content-disposition'),'attachment; filename="scene-01.mp4"'); assert.deepEqual(new Uint8Array(await response.arrayBuffer()),new Uint8Array([0,1,2,3]));
});

test('delivery HTTP returns exact UTF-8 key-points bytes and deterministic attachment name', async()=>{
  const text=new TextEncoder().encode('Tên sản phẩm\nđiểm hai\n'); const backing=new Uint8Array(text.length+2); backing.set(text,1); const response=await handlerFor({mimeType:'text/plain; charset=utf-8',bytes:backing.subarray(1,1+text.length)})(new Request('http://local/api/production/delivery/key-points.txt?snapshotId=snapshot-1'));
  assert.equal(response.status,200); assert.equal(response.headers.get('content-type'),'text/plain; charset=utf-8'); assert.equal(response.headers.get('content-disposition'),'attachment; filename="key-points.txt"'); assert.deepEqual(new Uint8Array(await response.arrayBuffer()),text);
});
