import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createNearbyHandler} from '../server/nearby.js';
import {createWorker} from '../server/worker.js';
const request=()=>new Request('https://bb.test/api/nearby',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({lat:44.49,lng:11.34,radius:600})});
const base={LIVE_SEARCH_ENABLED:'true',DISCOVERY_MODE:'nearby',GOOGLE_PLACES_API_KEY:'test-only'};
function database(){
 const sqlite=new DatabaseSync(':memory:');
 sqlite.exec(readFileSync(new URL('../drizzle/0000_provider_budget.sql',import.meta.url),'utf8'));
 return {prepare(sql){return {bind(...args){return {async first(){return sqlite.prepare(sql).get(...args)??null}}}}},sqlite};
}
const geo={status:'OK',results:[{address_components:[{long_name:'Bologna',types:['locality']},{short_name:'IT',types:['country']}]}]};
test('missing durable budget fails closed before any Google call',async()=>{
 let calls=0;const handler=createNearbyHandler({fetch:async()=>{calls++;return Response.json(geo)}});
 const result=await handler(request(),base);
 assert.equal(result.status,503);assert.deepEqual(await result.json(),{error:'provider_budget_unavailable'});assert.equal(calls,0);
});
test('nearby readiness cannot fall through to legacy catalog without budget controls',async()=>{
 const worker=createWorker({});const result=await worker.fetch(new Request('https://bb.test/api/status'),{...base,VERIFIED_CATALOG:'legacy'});
 assert.equal((await result.json()).configured,false);
});
test('parallel requests and fresh handler instances share the same lifetime cap',async()=>{
 const db=database();let calls=0;
 const env={...base,PROVIDER_BUDGET_DB:db,GOOGLE_FREE_ALLOWANCE_CONFIRMED:'true'};
 db.sqlite.prepare('INSERT INTO provider_budget(scope,searches) VALUES (?,?)').run('google-maps-v1',499);
 const make=()=>createNearbyHandler({fetch:async url=>{calls++;return Response.json(String(url).includes('geocode')?geo:{places:[]})}});
 const results=await Promise.all([make()(request(),env),make()(request(),env),make()(request(),env)]);
 assert.deepEqual(results.map(r=>r.status).sort(),[200,429,429]);assert.equal(calls,2);
 assert.equal((await make()(request(),env)).status,429);assert.equal(calls,2);
 assert.equal(db.sqlite.prepare('SELECT searches FROM provider_budget').get().searches,500);
 db.sqlite.close();
});
test('Google failures consume the reservation and cannot be retried beyond the cap',async()=>{
 const db=database();let calls=0;const env={...base,PROVIDER_BUDGET_DB:db,GOOGLE_FREE_ALLOWANCE_CONFIRMED:'true'};
 db.sqlite.prepare('INSERT INTO provider_budget(scope,searches) VALUES (?,?)').run('google-maps-v1',499);
 const h=createNearbyHandler({fetch:async()=>{calls++;throw Error('network')}});
 assert.equal((await h(request(),env)).status,502);assert.equal((await h(request(),env)).status,429);assert.equal(calls,1);db.sqlite.close();
});
test('storage failures and malformed reservation results never send provider requests',async()=>{
 for(const outcome of [()=>{throw Error('offline')},()=>({searches:0}),()=>({searches:501}),()=>({searches:1.5})]){
  let calls=0;const db={prepare:()=>({bind:()=>({first:async()=>outcome()})})};
  const h=createNearbyHandler({fetch:async()=>{calls++;return Response.json(geo)}});
  assert.equal((await h(request(),{...base,PROVIDER_BUDGET_DB:db,GOOGLE_FREE_ALLOWANCE_CONFIRMED:'true'})).status,503);assert.equal(calls,0);
 }
});
test('unreviewed billing allowance remains blocked even with storage and a key',async()=>{
 const db=database();let calls=0;const h=createNearbyHandler({fetch:async()=>{calls++;return Response.json(geo)}});
 assert.equal((await h(request(),{...base,PROVIDER_BUDGET_DB:db})).status,503);assert.equal(calls,0);db.sqlite.close();
});
