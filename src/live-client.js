export async function loadLiveRestaurants({origin,apiBase,native=false,automatic=false,radius,spendingPosition,meal,language,locate,fetch:fetcher=(...args)=>globalThis.fetch(...args)}){
 const startupPosition=automatic?await locate():null;
 const fail=code=>{throw Object.assign(new Error(code),{code})};
 if(native&&!apiBase)fail('provider_not_configured');
 const base=new URL(apiBase||origin);
 if(base.protocol!=='https:'&&!(base.hostname==='localhost'||base.hostname==='terminal.local'))fail('provider_not_configured');
 if(!native&&base.origin!==origin)fail('provider_not_configured');
 let status;try{const r=await fetcher(new URL('/api/status',base).href,{signal:AbortSignal.timeout(10000)});if(!r.ok)fail('provider_unavailable');status=await r.json()}catch{fail('provider_unavailable')}
 if(status?.configured!==true)fail('provider_not_configured');
 const pos=startupPosition||await locate();
 const r=await fetcher(new URL('/api/search',base).href,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({lat:pos.coords.latitude,lng:pos.coords.longitude,radius,spendingPosition,meal,language}),signal:AbortSignal.timeout(15000)});
 let next;try{next=await r.json()}catch{fail('provider_unavailable')}
 if(!r.ok)fail(['city_not_supported','no_verified_menus','rate_limited','provider_not_configured','search_too_broad','price_bands_unavailable'].includes(next?.error)?next.error:'provider_unavailable');
 return {...next,lat:pos.coords.latitude,lng:pos.coords.longitude,demo:false};
}
