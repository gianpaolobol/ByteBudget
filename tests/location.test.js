import {test} from 'node:test';import assert from 'node:assert/strict';import {getForegroundPosition} from '../src/location.js';
test('accepts an accurate cached foreground fix without tracking',async()=>{let options;const result=await getForegroundPosition(async o=>{options=o;return {timestamp:Date.now(),coords:{latitude:44.49,longitude:11.34,accuracy:20}}},800);assert.equal(options.enableHighAccuracy,false);assert.equal(options.maximumAge,60000);assert.equal(result.coords.latitude,44.49)});
test('rejects coarse position instead of pretending 100m precision',async()=>{await assert.rejects(getForegroundPosition(async()=>({coords:{latitude:44.49,longitude:11.34,accuracy:2000}}),100),e=>e.code==='location_imprecise')});
test('permission denial remains actionable',async()=>{await assert.rejects(getForegroundPosition(async()=>{throw {code:'OS-PLUG-GLOC-0003'}},800),e=>e.code==='location_denied')});
test('uses an accurate quick fix immediately and refines a coarse fix',async()=>{
 const flags=[];
 const getPosition=async o=>{flags.push(o.enableHighAccuracy);return {coords:{latitude:44.49,longitude:11.34,accuracy:o.enableHighAccuracy?15:80}}};
 assert.equal((await getForegroundPosition(getPosition,800)).coords.accuracy,80);
 assert.deepEqual(flags,[false]);
 flags.length=0;
 assert.equal((await getForegroundPosition(getPosition,100)).coords.accuracy,15);
 assert.deepEqual(flags,[false,true]);
});
test('native foreground startup uses one permission path',async()=>{
 const flags=[];
 await getForegroundPosition(async o=>{
  flags.push(o.enableHighAccuracy);
  return {coords:{latitude:44.49,longitude:11.34,accuracy:10}};
 },800,{preciseOnly:true});
 assert.deepEqual(flags,[true]);
});
