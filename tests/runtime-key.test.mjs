import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../scripts/cloud/apps-script-bootstrap.gs',import.meta.url),'utf8');
const parent='projects/137839521041/locations/global/keys';
const name=parent+'/bytebudget-server';
const targets=[{service:'places.googleapis.com'},{service:'geocoding-backend.googleapis.com'}];
function fixture({approved=true,existing=false,wrongRestrictions=false}={}){
 const calls=[],logs=[],properties=new Map(approved?[['BYTEBUDGET_RUNTIME_KEY_APPROVED','yes']]:[]);
 let key=existing?{name,restrictions:{apiTargets:wrongRestrictions?[{service:'other.googleapis.com'}]:targets}}:null;
 const ctx=vm.createContext({console:{log:x=>logs.push(x)},Utilities:{sleep:()=>{}},ScriptApp:{getOAuthToken:()=> 'never-export-oauth'},
  PropertiesService:{getScriptProperties:()=>({getProperty:k=>properties.get(k),setProperty:(k,v)=>properties.set(k,v),deleteProperty:k=>properties.delete(k)})},
  UrlFetchApp:{fetch(url,opts){calls.push({url,...opts});let status=200,result;
   if(url==='https://cloudresourcemanager.googleapis.com/v1/projects/bytebudget-f8aaa')result={projectId:'bytebudget-f8aaa',projectNumber:'137839521041',lifecycleState:'ACTIVE'};
   else if(url===`https://apikeys.googleapis.com/v2/${name}`){if(key)result=key;else{status=404;result={error:{code:404}}}}
   else if(url===`https://apikeys.googleapis.com/v2/${parent}?keyId=bytebudget-server`){key={name,...JSON.parse(opts.payload)};result={done:true,response:key}}
   else if(url===`https://apikeys.googleapis.com/v2/${name}/keyString`)result={keyString:'AIzaTestCredentialNeverLogThisValue123456'};
   else throw Error('Unexpected URL '+url);
   return {getResponseCode:()=>status,getContentText:()=>JSON.stringify(result)};
  }}
 });vm.runInContext(source,ctx);return {ctx,calls,logs,properties};
}
test('runtime credential creation requires the action-specific approval flag',()=>{
 const f=fixture({approved:false});assert.equal(typeof f.ctx.createByteBudgetRuntimeKey,'function');assert.throws(()=>f.ctx.createByteBudgetRuntimeKey(),/approval/i);assert.equal(f.calls.length,0);
});
test('runtime key is restricted at creation, staged privately and never logged',()=>{
 const f=fixture();assert.equal(typeof f.ctx.createByteBudgetRuntimeKey,'function');f.ctx.createByteBudgetRuntimeKey();
 const writes=f.calls.filter(x=>x.method!=='get');assert.equal(writes.length,1);
 assert.equal(writes[0].url,`https://apikeys.googleapis.com/v2/${parent}?keyId=bytebudget-server`);
 assert.deepEqual(JSON.parse(writes[0].payload).restrictions,{apiTargets:targets});
 assert.equal(f.properties.get('BYTEBUDGET_RUNTIME_KEY_STAGE'),'AIzaTestCredentialNeverLogThisValue123456');
 assert.equal(f.properties.has('BYTEBUDGET_RUNTIME_KEY_APPROVED'),false);
 assert.ok(!f.logs.join('').includes('AIza'));assert.ok(!f.logs.join('').includes('never-export-oauth'));
 f.ctx.clearByteBudgetRuntimeKeyStage();assert.equal(f.properties.has('BYTEBUDGET_RUNTIME_KEY_STAGE'),false);
});
test('matching dedicated key is reused without duplication',()=>{
 const f=fixture({existing:true});f.ctx.createByteBudgetRuntimeKey();assert.equal(f.calls.filter(x=>x.method!=='get').length,0);
});
test('existing key with broader or different access cannot be retrieved or overwritten',()=>{
 const f=fixture({existing:true,wrongRestrictions:true});assert.throws(()=>f.ctx.createByteBudgetRuntimeKey(),/restrictions/i);
 assert.ok(!f.calls.some(x=>x.url.endsWith('/keyString')));assert.equal(f.calls.filter(x=>x.method!=='get').length,0);
});
