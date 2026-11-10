export async function loadLiveRestaurants({origin,apiBase,native=false,automatic=false,radius,nearbyRadius=radius,spendingPosition,meal,language,locate,fetch:fetcher=(...args)=>globalThis.fetch(...args)}){
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
 if(automatic){
  const statusRequest=checkStatus();
  // The user can dismiss the permission prompt after the status request settles.
  statusRequest.catch(()=>{});
  pos=await locate();
  status=await statusRequest;
 }else{
  status=await checkStatus();
  pos=await locate();
 }
 const r=await fetcher(new URL(status.mode==='nearby'?'/api/nearby':'/api/search',base).href,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({lat:pos.coords.latitude,lng:pos.coords.longitude,radius:status.mode==='nearby'?nearbyRadius:radius,spendingPosition,meal,language}),signal:AbortSignal.timeout(10000)});
 let next;try{next=await r.json()}catch{fail('provider_unavailable')}
 if(!r.ok)fail(['city_not_supported','no_verified_menus','rate_limited','provider_not_configured','search_too_broad','price_bands_unavailable','provider_budget_exhausted'].includes(next?.error)?next.error:'provider_unavailable');
 return {...next,lat:pos.coords.latitude,lng:pos.coords.longitude,locationAccuracy:pos.coords.accuracy,demo:false};
}
