import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,statSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {parseAndroidVersionCode,packageAndroid} from '../scripts/package-android.mjs';
const fixtureEnv={BYTEBUDGET_ANDROID_VERSION_CODE:'2',ANDROID_KEYSTORE_BASE64:Buffer.from('test-only-encrypted-keystore').toString('base64'),ANDROID_KEYSTORE_PASSWORD:'test-password',ANDROID_KEY_ALIAS:'test-alias',ANDROID_KEY_PASSWORD:'test-key-password'};
function project(t){const dir=mkdtempSync(path.join(tmpdir(),'bb-test-project-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));return dir;}
test('version code accepts exact positive decimal Play values only',()=>{
 for(const [v,want] of [['1',1],['2',2],['2100000000',2100000000]])assert.equal(parseAndroidVersionCode(v),want);
 for(const v of ['',undefined,'0','-1','2.0','02',' 2','2 ','2\n','2\r\n','+2','1e3','2100000001','2; echo secret'])assert.throws(()=>parseAndroidVersionCode(v),/version code/i);
});
test('invalid inputs cannot launch Gradle or expose credentials',t=>{
 const dir=project(t);let calls=0;
 for(const overrides of [{BYTEBUDGET_ANDROID_VERSION_CODE:'0'},{ANDROID_KEYSTORE_PASSWORD:''},{ANDROID_KEYSTORE_BASE64:'not base64!!'}])assert.throws(()=>packageAndroid({env:{...fixtureEnv,...overrides},projectDir:dir,run:()=>{calls++}}));
 assert.equal(calls,0);
});
test('package uses a private transient keystore and returns only the actual AAB',t=>{
 const dir=project(t);let keystore;
 const output=packageAndroid({env:fixtureEnv,projectDir:dir,run:(command,args,options)=>{
  assert.equal(command,'bash');assert.deepEqual(args,['./gradlew','--no-daemon','bundleRelease','-PbytebudgetVersionCode=2']);assert.equal(options.cwd,dir);assert.equal(options.stdio,'inherit');assert.equal(options.shell,undefined);
  keystore=options.env.BYTEBUDGET_KEYSTORE_FILE;assert.equal(readFileSync(keystore,'utf8'),'test-only-encrypted-keystore');assert.equal(statSync(keystore).mode&0o777,0o600);assert.equal(options.env.ANDROID_KEY_PASSWORD,'test-key-password');
  const output=path.join(dir,'app/build/outputs/bundle/release/app-release.aab');mkdirSync(path.dirname(output),{recursive:true});writeFileSync(output,'signed-test-artifact');return {status:0};
 }});
 assert.equal(output,path.join(dir,'app/build/outputs/bundle/release/app-release.aab'));assert.equal(existsSync(keystore),false);assert.equal(existsSync(path.dirname(keystore)),false);assert.equal(readFileSync(output,'utf8'),'signed-test-artifact');assert.equal(fixtureEnv.BYTEBUDGET_KEYSTORE_FILE,undefined);
});
test('failed or unstarted Gradle always clears transient signing files',t=>{
 const dir=project(t);
 for(const outcome of [{status:1},{status:null,error:new Error('launch error')},'throw']){
  let key;
  assert.throws(()=>packageAndroid({env:fixtureEnv,projectDir:dir,run:(_c,_a,o)=>{key=o.env.BYTEBUDGET_KEYSTORE_FILE;if(outcome==='throw')throw Error('process failure');return outcome}}));
  assert.equal(existsSync(key),false);assert.equal(existsSync(path.dirname(key)),false);
 }
});
test('successful process without an AAB is not a successful package',t=>{
 assert.throws(()=>packageAndroid({env:fixtureEnv,projectDir:project(t),run:()=>({status:0})}),/AAB/i);
});
