import {test} from 'node:test';import assert from 'node:assert/strict';import {getForegroundPosition,getIosForegroundPosition} from '../src/location.js';
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

test('iOS waits for an accurate update after a coarse fix and stops listening',async()=>{
 const calls=[];
 const position=accuracy=>({timestamp:Date.now(),coords:{latitude:44.49,longitude:11.34,accuracy}});
 const geo={
  checkPermissions:async()=>({location:'prompt'}),
  requestPermissions:async()=>{calls.push('permission');return {location:'granted'}},
  watchPosition:async(options,receive)=>{
   calls.push('watch');
   assert.equal(options.enableHighAccuracy,true);
   receive(position(600),null);
   receive(null,{code:'OS-PLUG-GLOC-0002'});
   receive(position(12),null);
   return 'native-watch';
  },
  clearWatch:async({id})=>{calls.push(id)}
 };
 assert.equal((await getIosForegroundPosition(geo,800)).coords.accuracy,12);
 await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(calls,['permission','watch','native-watch']);
});
test('iOS stops a coarse-only acquisition and preserves the precision error',async()=>{
 let cleared=false;
 const geo={
  checkPermissions:async()=>({location:'granted'}),
  watchPosition:async(options,receive)=>{
   receive({timestamp:Date.now(),coords:{latitude:44.49,longitude:11.34,accuracy:600}},null);
   return 'native-watch';
  },
  clearWatch:async()=>{cleared=true}
 };
 await assert.rejects(getIosForegroundPosition(geo,800,{timeout:15}),{code:'location_imprecise'});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(cleared,true);
});
test('iOS denial or disabled system services do not start GPS',async()=>{
 for(const [checkPermissions,code] of [
  [async()=>({location:'denied'}),'location_denied'],
  [async()=>{throw {code:'OS-PLUG-GLOC-0007'}},'location_denied']
 ]){
  await assert.rejects(getIosForegroundPosition({checkPermissions,watchPosition:()=>assert.fail('GPS started without permission')},800),{code});
 }
});

test('iOS takes a short refinement window when the first usable fix is off by a street',async()=>{
 const position=accuracy=>({timestamp:Date.now(),coords:{latitude:44.49,longitude:11.34,accuracy}});
 const geo={
  checkPermissions:async()=>({location:'granted'}),
  watchPosition:async(options,receive)=>{
   receive(position(190));
   receive(position(24));
   return 'native-watch';
  },
  clearWatch:async()=>{}
 };
 assert.equal((await getIosForegroundPosition(geo,800,{timeout:100,refineFor:20})).coords.accuracy,24);
});

test('iOS keeps the best usable fix when the short refinement window ends',async()=>{
 const position=accuracy=>({timestamp:Date.now(),coords:{latitude:44.49,longitude:11.34,accuracy}});
 const geo={
  checkPermissions:async()=>({location:'granted'}),
  watchPosition:async(options,receive)=>{
   receive(position(190));
   receive(position(90));
   return 'native-watch';
  },
  clearWatch:async()=>{}
 };
 assert.equal((await getIosForegroundPosition(geo,800,{timeout:100,refineFor:15})).coords.accuracy,90);
});
