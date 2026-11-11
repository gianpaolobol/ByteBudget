export async function loadLiveRestaurants({origin,apiBase,native=false,nativeNearby=false,automatic=false,radius,nearbyRadius=radius,spendingPosition,allPrices=false,meal,language,locate,onPosition,onNearby,quick=false,fetch:fetcher=(...args)=>globalThis.fetch(...args)}){
 const fail=code=>{throw Object.assign(new Error(code),{code})};
 if(native&&!apiBase)fail('provider_not_configured');
 const base=new URL(apiBase||origin);
 if(base.protocol!=='https:'&&!(base.hostname==='localhost'||base.hostname==='terminal.local'))fail('provider_not_configured');
 if(!native&&base.origin!==origin)fail('provider_not_configured');
 const checkStatus=async()=>{
  let status;
  try{
   const response=await fetcher(new URL('/api/status',base).href,{signal:AbortSignal.timeout(8000)});
   if(!response.ok)fail('provider_unavailable');
   status=await response.json();
  }catch{fail('provider_unavailable')}
  if(status?.configured!==true)fail('provider_not_configured');
  return status;
 };
 let status,pos;
 const acquire=async()=>{
  const position=await locate();
  onPosition?.();
  return position;
 };
 if(native&&nativeNearby){
  status={mode:'nearby'};
  pos=await acquire();
 }else if(automatic){
  const statusRequest=checkStatus();
  // The user can dismiss the permission prompt after the status request settles.
  statusRequest.catch(()=>{});
  pos=await acquire();
  status=await statusRequest;
 }else{
  status=await checkStatus();
  pos=await acquire();
 }
 const nearby=status.mode==='nearby';
 const progressive=nearby&&typeof onNearby==='function'&&typeof TextDecoder==='function';
 const body={lat:pos.coords.latitude,lng:pos.coords.longitude,radius:nearby?nearbyRadius:radius,meal,language};
 if(!allPrices)body.spendingPosition=spendingPosition;
 else if(!nearby)body.allPrices=true;
 if(progressive)body.progressive=true;
 if(quick)body.quick=true;
 const r=await fetcher(new URL(nearby?'/api/nearby':'/api/search',base).href,{
  method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(10000),
 });
 const located=next=>({...next,lat:pos.coords.latitude,lng:pos.coords.longitude,locationAccuracy:pos.coords.accuracy,demo:false});
 const complete=(next,ok)=>{
  if(!ok)fail(['city_not_supported','no_verified_menus','rate_limited','provider_not_configured','search_too_broad','price_bands_unavailable','provider_budget_exhausted'].includes(next?.error)?next.error:'provider_unavailable');
  return located(next);
 };
 if(progressive&&r.ok&&r.body&&r.headers.get('Content-Type')?.startsWith('application/x-ndjson')){
  const reader=r.body.getReader(),decoder=new TextDecoder();
  let buffer='';
  try{
   for(;;){
    const {done,value}=await reader.read();
    if(done)break;
    buffer+=decoder.decode(value,{stream:true});
    let end;
    while((end=buffer.indexOf('\n'))!==-1){
     const record=JSON.parse(buffer.slice(0,end));
     buffer=buffer.slice(end+1);
     if(record.stage==='complete')return complete(record.data,record.status===200);
     if(record.stage==='nearby')onNearby(located(record.data));
    }
   }
  }finally{void reader.cancel().catch(()=>{})}
  fail('provider_unavailable');
 }
 let next;try{next=await r.json()}catch{fail('provider_unavailable')}
 return complete(next,r.ok);
}
