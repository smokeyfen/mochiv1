import { expect, it, vi } from 'vitest';
import { buildProduction, ProductionClientError } from './production-client';

const project={product:{assets:[{assetId:'reference-1'}]}} as never;
const files=new Map([['reference-1',new File(['image'],'reference.jpg',{type:'image/jpeg'})]]);

it('preserves only a canonical safe production build stage', async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({ok:false,error:{code:'PRODUCTION_BUILD_FAILED',stage:'R6_BOUNDED_REPLAN',trace:'raw provider exception'}}),{status:400,headers:{'content-type':'application/json'}})));
  await expect(buildProduction(project,files,'receipt-test')).rejects.toMatchObject({code:'PRODUCTION_BUILD_FAILED',stage:'R6_BOUNDED_REPLAN'} satisfies Partial<ProductionClientError>);
});

it('keeps generic production build errors generic when no safe canonical stage exists', async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({ok:false,error:{code:'PRODUCTION_BUILD_FAILED',stage:'PROVIDER_EXCEPTION',trace:'raw provider exception'}}),{status:400,headers:{'content-type':'application/json'}})));
  await expect(buildProduction(project,files,'receipt-test')).rejects.toMatchObject({code:'PRODUCTION_BUILD_FAILED',stage:undefined} satisfies Partial<ProductionClientError>);
});
