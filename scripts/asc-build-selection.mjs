export function selectAscBuildId(builds){
 const ids=[...new Set(builds.filter(b=>b.appVersion==='1.0.0'&&b.buildNumber==='2'&&b.processingState==='VALID').map(b=>b.id).filter(Boolean))];
 if(ids.length!==1)throw new Error(`Expected one validated ByteBudget 1.0.0(2) Apple build; found ${ids.length}`);
 return ids[0];
}
