// Read only: keep ASC credentials inside the authenticated Expo worker.
// Augment Expo's status command with Apple's immutable build ID, omitted by its
// normal JSON output, so distribution doesn't depend on Fastlane version matching.
const assert=require('node:assert/strict');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
(async()=>{
 const {selectAscBuildId}=await import('./asc-build-selection.mjs');
 const statusPath=require.resolve('eas-cli/build/submit/status');
 const status=require(statusPath);
 const {Build}=require(require.resolve('@expo/apple-utils',{paths:[path.dirname(statusPath)]}));
 const original=status.getIosStoreStatusAsync;
 status.getIosStoreStatusAsync=async(app,submissions)=>{
  assert.equal(app.id,'6832104168','Refuse any app except ByteBudget');
  const builds=await Build.getAsync(app.context,{query:{filter:{app:app.id},sort:'-uploadedDate',limit:20,includes:['buildBetaDetail','preReleaseVersion']}});
  const records=builds.map(b=>({id:b.id,appVersion:b.attributes.preReleaseVersion?.attributes.version,buildNumber:b.attributes.version,processingState:b.attributes.processingState,internalState:b.attributes.buildBetaDetail?.attributes.internalBuildState,usesNonExemptEncryption:b.attributes.usesNonExemptEncryption}));
  const id=selectAscBuildId(records);
  const result=await original(app,submissions);
  const output=spawnSync('set-output',['asc_build_id',id],{stdio:'inherit'});
  assert.equal(output.status,0,'Could not publish Apple build ID to workflow');
  return {...result,ascBuildId:id,matchingBuilds:records.filter(b=>b.id===id)};
 };
 const root=path.dirname(require.resolve('eas-cli/package.json'));
 process.argv=[process.execPath,path.join(root,'bin/run'),'submit:status','-p','ios','-e','demo','--json','--non-interactive'];
 require(path.join(root,'bin/run'));
})().catch(error=>{console.error(error.message);process.exitCode=1});
