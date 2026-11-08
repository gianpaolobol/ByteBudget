import {mkdtempSync,writeFileSync,statSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';

export function parseAndroidVersionCode(value){
 if(typeof value!=='string'||!/^\d+$/.test(value)||value.startsWith('0')||!Number.isSafeInteger(Number(value))||Number(value)>2100000000)throw Error('Android version code must be a decimal integer from 1 to 2100000000.');
 return Number(value);
}
export function packageAndroid({env=process.env,projectDir=fileURLToPath(new URL('../android',import.meta.url)),run=spawnSync}={}){
 const versionCode=parseAndroidVersionCode(env.BYTEBUDGET_ANDROID_VERSION_CODE);
 for(const name of ['ANDROID_KEYSTORE_BASE64','ANDROID_KEYSTORE_PASSWORD','ANDROID_KEY_ALIAS','ANDROID_KEY_PASSWORD'])if(typeof env[name]!=='string'||env[name].length===0)throw Error('Missing Android signing secret: '+name);
 const encoded=env.ANDROID_KEYSTORE_BASE64.replace(/\s/g,'');
 if(!encoded||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded))throw Error('Android keystore must be valid base64.');
 const directory=mkdtempSync(path.join(tmpdir(),'bytebudget-android-signing-'));
 try{
  const keystore=path.join(directory,'upload.keystore');writeFileSync(keystore,Buffer.from(encoded,'base64'),{mode:0o600});
  const childEnv={...env,BYTEBUDGET_KEYSTORE_FILE:keystore};delete childEnv.ANDROID_KEYSTORE_BASE64;
  const result=run('bash',['./gradlew','--no-daemon','bundleRelease','-PbytebudgetVersionCode='+versionCode],{cwd:projectDir,env:childEnv,stdio:'inherit'});
  if(result?.error||result?.status!==0)throw Error('Gradle Android packaging failed.');
  const aab=path.join(projectDir,'app/build/outputs/bundle/release/app-release.aab');
  let output;try{output=statSync(aab)}catch{throw Error('Signed AAB output is missing.');}
  if(!output.isFile()||output.size===0)throw Error('Signed AAB output is empty or invalid.');
  return aab;
 }finally{rmSync(directory,{recursive:true,force:true});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{console.log('Signed Android App Bundle: '+packageAndroid());}catch(error){console.error(error.message);process.exitCode=1;}
}
