import test from 'node:test';
import assert from 'node:assert/strict';
import {createLiveUpdates} from '../src/live-updates.js';
const position=(north=0,accuracy=12)=>({timestamp:100000,coords:{latitude:44.49+north/111195,longitude:11.34,accuracy}});
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function harness(search){
 let clock=100000,timer;
 const events={positions:[],datasets:[],errors:[],queries:[]};
 const updates=createLiveUpdates({
  now:()=>clock,setTimer:(fn,delay)=>{timer={fn,delay};return 1},clearTimer:()=>{timer=null},
  search:async(p,partial,options)=>{events.queries.push({p,options});return search?search(p,partial,options):{venues:[]}},
  onPosition:p=>events.positions.push(p),onDataset:(d,partial)=>events.datasets.push({d,partial}),onError:e=>events.errors.push(e)
 });
 return {updates,events,advance:async(ms)=>{clock+=ms;const pending=timer;if(pending&&pending.delay<=ms){timer=null;await pending.fn()}await tick()}};
}
test('movement updates distances immediately and coalesces provider lookups',async()=>{
 const h=harness();
 h.updates.position(position());await tick();
 assert.equal(h.events.queries.length,1);
 assert.equal(h.events.queries[0].options.extended,true);
 h.updates.position(position(2));assert.equal(h.events.positions.length,1);
 h.updates.position(position(80));
 assert.equal(h.events.positions.length,2);
 assert.equal(h.events.queries.length,1);
 await h.advance(15000);
 assert.equal(h.events.queries.length,2);
 assert.equal(h.events.queries[1].options.extended,false);
 h.updates.position(position(280));await h.advance(15000);
 assert.equal(h.events.queries[2].options.extended,true);
 h.updates.stop();
});
test('data arriving during movement is anchored to the latest GPS position',async()=>{
 let finish;
 const h=harness(()=>new Promise(resolve=>{finish=resolve}));
 h.updates.position(position());await tick();
 h.updates.position(position(90));
 finish({venues:[]});await tick();
 assert.equal(h.events.datasets[0].d.lat,position(90).coords.latitude);
 h.updates.stop();
});
test('backgrounding ignores old responses and resumes with a fresh position',async()=>{
 const completions=[];
 const h=harness(()=>new Promise(resolve=>completions.push(resolve)));
 h.updates.position(position());await tick();
 h.updates.stop();h.updates.resume();h.updates.position(position(350));await tick();
 completions[0]({venues:[{id:'old'}]});await tick();
 assert.equal(h.events.datasets.length,0);
 completions[1]({venues:[{id:'new'}]});await tick();
 assert.equal(h.events.datasets[0].d.venues[0].id,'new');
 h.updates.stop();
});
test('stationary search refreshes opening status and stops at the configured quota',async()=>{
 const h=harness();
 h.updates.position(position());await tick();
 await h.advance(120000);
 assert.equal(h.events.queries.length,2);
 h.updates.stop();
 const failed=harness(()=>{throw Object.assign(new Error('Quota'),{code:'provider_budget_exhausted'})});
 failed.updates.position(position());await tick();await failed.advance(120000);
 assert.equal(failed.events.queries.length,1);
 failed.updates.stop();
});
