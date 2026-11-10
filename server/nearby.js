import {providerBudgetConfigured,reserveProviderSearch} from './provider-budget.js';
import currencies from 'country-to-currency';
import timeZoneAt from 'tz-lookup';
import {cityBands,distanceMeters,matchesTier,PRICE_TIERS,sourceVenueTier} from '../src/domain.js';
import {validateDataset} from '../src/provider.js';
import {verifiedMenus} from './verified-menus.js';
const MASK='places.id,places.displayName,places.location,places.rating,places.userRatingCount,places.currentOpeningHours,places.businessStatus,places.priceRange,places.googleMapsUri,places.attributions,places.priceLevel,places.photos,places.websiteUri,places.primaryType';
const answer=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const failure=(error,status)=>answer({error},status);
const language=value=>({zh:'zh-CN'}[value]||(['en','it','es','de','fr','pt','ru','ja','ko','ar','hi'].includes(value)?value:'en'));
// Live provider IDs confirmed by smaller searches in two reported coverage gaps.
const coverageChecks=[
 {center:{latitude:44.4946,longitude:11.34675},places:[
  ['ChIJ_2EAwErVf0cRBWPUgCBfOJ0',44.4946971,11.3467351],
  ['ChIJzS_TY77Uf0cRdfyq-FzZS5U',44.494375,11.3463059],
  ['ChIJqeBAYL7Uf0cRMNEL19QaggA',44.4941819,11.3461148]
 ]},
 {center:{latitude:44.49145,longitude:11.34914},places:[
  ['ChIJw2CCzLjUf0cRCkzsWFBRLBQ',44.4918852,11.3482866],
  ['ChIJC_7OYQDVf0cRdt752_-8mrY',44.4906446,11.349405]
 ]}
];
export function nearbyConfigured(env){return env.LIVE_SEARCH_ENABLED==='true'&&env.DISCOVERY_MODE==='nearby'&&!!env.GOOGLE_PLACES_API_KEY&&providerBudgetConfigured(env)}
function amount(money,currency){
 if(!money||money.currencyCode!==currency||!/^\d+$/.test(String(money.units??'0'))||!Number.isInteger(money.nanos??0)||(money.nanos??0)<0||(money.nanos??0)>999999999)return null;
 const n=Number(money.units??0)+(money.nanos??0)/1e9;return Number.isFinite(n)&&n>=0?n:null;
}
function venuePrice(range,currency,now){
 const min=amount(range?.startPrice,currency),max=amount(range?.endPrice,currency);
 if(min===null||max===null||max<min)return undefined;
 return {min,max,updatedAt:new Date(now).toISOString(),source:'Google Maps priceRange',scope:'venue-estimate',upperExclusive:true};
}
export function createNearbyHandler({fetch:fetcher=(...args)=>globalThis.fetch(...args),now=Date.now,requestsPerMinute=10}={}){
 const buckets=new Map();
 return async function handle(request,env){
  if(request.method!=='POST')return failure('method_not_allowed',405);
  if(!request.headers.get('Content-Type')?.startsWith('application/json'))return failure('json_required',415);
  let input;try{const text=await request.text();if(text.length>2048)return failure('request_too_large',413);input=JSON.parse(text)}catch{return failure('invalid_json',400)}
  if(!input||!Number.isFinite(input.lat)||Math.abs(input.lat)>90||!Number.isFinite(input.lng)||Math.abs(input.lng)>180||!Number.isFinite(input.radius)||input.radius<100||input.radius>1000)return failure('invalid_search',400);
  if(env.LIVE_SEARCH_ENABLED!=='true'||!env.GOOGLE_PLACES_API_KEY)return failure('provider_not_configured',503);
  const current=now(),minute=Math.floor(current/60000),identity=request.headers.get('CF-Connecting-IP')||'local';
  for(const [key,bucket] of buckets)if(bucket.minute!==minute)buckets.delete(key);
  if(!buckets.has(identity)&&buckets.size>=2000)return failure('rate_limited',429);
  const count=(buckets.get(identity)?.count||0)+1;buckets.set(identity,{minute,count});
  if(count>requestsPerMinute)return failure('rate_limited',429);
  const reservation=await reserveProviderSearch(env);
  if(reservation!=='reserved')return failure(reservation==='exhausted'?'provider_budget_exhausted':'provider_budget_unavailable',reservation==='exhausted'?429:503);
  const discover=async emit=>{
  try{
   const geoUrl=new URL('https://maps.googleapis.com/maps/api/geocode/json');geoUrl.searchParams.set('latlng',`${input.lat},${input.lng}`);geoUrl.searchParams.set('language',language(input.language));geoUrl.searchParams.set('key',env.GOOGLE_PLACES_API_KEY);
   const locale=language(input.language);
   const center={latitude:input.lat,longitude:input.lng};
   const readPlaces=async(body,timeout)=>{
    const response=await fetcher('https://places.googleapis.com/v1/places:searchNearby',{method:'POST',headers:{'Content-Type':'application/json','X-Goog-Api-Key':env.GOOGLE_PLACES_API_KEY,'X-Goog-FieldMask':MASK},body:JSON.stringify(body),signal:AbortSignal.timeout(timeout)});
    if(!response.ok)throw Error();
    const result=await response.json();
    if(result.places!==undefined&&!Array.isArray(result.places))throw Error();
    return (result.places||[]).slice(0,20);
   };
   const [geo,nearest]=await Promise.all([
    fetcher(geoUrl.href,{signal:AbortSignal.timeout(4500)}).then(response=>{if(!response.ok)throw Error();return response.json()}),
    readPlaces({includedTypes:['restaurant','cafe','bar','bakery','meal_takeaway'],maxResultCount:20,rankPreference:'DISTANCE',languageCode:locale,locationRestriction:{circle:{center,radius:input.radius}}},4500)
   ]);
   if(geo.status!=='OK'||!Array.isArray(geo.results))throw Error();
   const components=geo.results.flatMap(r=>r.address_components||[]);
   const country=components.find(c=>c.types?.includes('country'))?.short_name;
   const city=['locality','postal_town','administrative_area_level_3','administrative_area_level_2'].map(type=>components.find(c=>c.types?.includes(type))?.long_name).find(Boolean);
   const currency=currencies[country];
   if(!city||!currency||!Intl.supportedValuesOf('currency').includes(currency))return failure('city_not_supported',422);
   const parseVenues=places=>places.flatMap(p=>{
    const lat=p.location?.latitude,lng=p.location?.longitude;
    if(typeof p.id!=='string'||!p.id||typeof p.displayName?.text!=='string'||!Number.isFinite(lat)||Math.abs(lat)>90||!Number.isFinite(lng)||Math.abs(lng)>180||distanceMeters(input.lat,input.lng,lat,lng)>input.radius||!Number.isFinite(p.rating)||p.rating<0||p.rating>5||!Number.isInteger(p.userRatingCount)||p.userRatingCount<1||p.businessStatus!=='OPERATIONAL'||['supermarket','grocery_store','convenience_store','gas_station','tobacco_shop','liquor_store'].includes(p.primaryType))return [];
    return [{id:p.id,name:p.displayName.text,lat,lng,currency,rating:p.rating,reviewCount:p.userRatingCount,isOpen:p.currentOpeningHours?.openNow===true,openingPeriods:Array.isArray(p.currentOpeningHours?.periods)?p.currentOpeningHours.periods:undefined,openingStatus:typeof p.currentOpeningHours?.openNow==='boolean'?(p.currentOpeningHours.openNow?'open':'closed'):'unknown',sourceTier:({PRICE_LEVEL_FREE:'low',PRICE_LEVEL_INEXPENSIVE:'low',PRICE_LEVEL_MODERATE:'mid',PRICE_LEVEL_EXPENSIVE:'high',PRICE_LEVEL_VERY_EXPENSIVE:'luxury'})[p.priceLevel],googleMapsUri:p.googleMapsUri,websiteUri:p.websiteUri,photo:Array.isArray(p.photos)?p.photos[0]:undefined,prices:{},venuePrice:venuePrice(p.priceRange,currency,current),menu:[],attributions:Array.isArray(p.attributions)?p.attributions:[],ratingSource:'Google Maps'}];
   });
   const venues=new Map();
   const merge=places=>{
    for(const venue of parseVenues(places)){
     const previous=venues.get(venue.id);
     if(!previous||!previous.venuePrice&&venue.venuePrice)venues.set(venue.id,venue);
    }
   };
   merge(nearest);
   const menus=verifiedMenus.filter(menu=>menu.currency===currency&&
    current>=Date.parse(menu.price.updatedAt)&&current-Date.parse(menu.price.updatedAt)<=90*86400000&&
    distanceMeters(input.lat,input.lng,menu.lat,menu.lng)<=input.radius);
   const sample=[...venues.values()];
   const bands=cityBands(sample,'dinner',currency,current,null,country);
   const found=new Set(sample.map(venue=>sourceVenueTier(venue,'dinner',currency,current,bands)));
   const enrich=async(body,onlyIds)=>{
    if(await reserveProviderSearch(env)!=='reserved')return;
    try{
     const places=await readPlaces(body,1800);
     merge(onlyIds?places.filter(place=>onlyIds.includes(place.id)):places);
    }catch{/* Keep the distance results when supplemental coverage is unavailable. */}
   };
   const supplemental=[];
   if(input.quick!==true){
   if(nearest.length===20){
    for(const {center:localCenter,places} of coverageChecks){
     const missing=places.filter(([id,lat,lng])=>!venues.has(id)&&distanceMeters(input.lat,input.lng,lat,lng)<=input.radius).map(([id])=>id);
     if(missing.length) supplemental.push(enrich({
      includedTypes:['restaurant','cafe','bar','bakery','meal_takeaway'],
      maxResultCount:20,rankPreference:'DISTANCE',languageCode:locale,
      locationRestriction:{circle:{center:localCenter,radius:100}}
     },missing));
    }
   }
   if(nearest.length>=8&&(nearest.length===20||!found.has('mid')||!found.has('high'))){
    supplemental.push(enrich({includedTypes:['restaurant'],maxResultCount:20,rankPreference:'POPULARITY',languageCode:locale,locationRestriction:{circle:{center,radius:input.radius}}}));
   }
   if(nearest.length===20&&input.radius>250&&Math.abs(input.lat)<89.9){
    // The central search fills first in dense blocks. Search four overlapping
    // circles around it and still enforce the user's original radius on merge.
    const latitudeStep=165/111195;
    const longitudeStep=latitudeStep/Math.cos(input.lat*Math.PI/180);
    for(const [north,east] of [[1,1],[1,-1],[-1,1],[-1,-1]]){
     const localCenter={
      latitude:input.lat+north*latitudeStep,
      longitude:(input.lng+east*longitudeStep+540)%360-180
     };
     supplemental.push(enrich({
      includedTypes:['restaurant','pizza_restaurant','chinese_restaurant','bar','pub','cafe','bakery','meal_takeaway','fast_food_restaurant'],
      maxResultCount:20,rankPreference:'DISTANCE',languageCode:locale,
      locationRestriction:{circle:{center:localCenter,radius:155}}
     }));
    }
   }else if(nearest.length===20){
    // In dense areas each group gets its own distance-ranked result allowance.
    const localCircle={center,radius:Math.min(input.radius,250)};
    for(const includedTypes of [
     ['restaurant','pizza_restaurant','chinese_restaurant'],
     ['bar','pub','cafe','meal_takeaway','fast_food_restaurant']
    ]){
     supplemental.push(enrich({includedTypes,maxResultCount:20,rankPreference:'DISTANCE',languageCode:locale,locationRestriction:{circle:localCircle}}));
    }
   }
   const checkedTiers=new Set(found);
   let menuLookups=0;
   for(const menu of menus){
    const tier=PRICE_TIERS.find(tier=>matchesTier(menu.price,tier,bands));
    if(!tier||checkedTiers.has(tier)||venues.has(menu.id))continue;
    checkedTiers.add(tier);
    supplemental.push(enrich({includedTypes:['restaurant'],maxResultCount:8,rankPreference:'DISTANCE',languageCode:locale,locationRestriction:{circle:{center:{latitude:menu.lat,longitude:menu.lng},radius:35}}},[menu.id]));
    if(++menuLookups===2)break;
   }
   }
   const snapshot=()=>{
    const dataset=validateDataset({city,country,currency,timeZone:timeZoneAt(input.lat,input.lng),lat:input.lat,lng:input.lng,demo:false,pricingScope:'venue',venues:[...venues.values()]});
    return {...dataset,coverage:'nearby-provider-subset',attribution:{provider:'Google Maps',url:'https://maps.google.com'},fetchedAt:new Date(current).toISOString()};
   };
   if(emit&&supplemental.length&&venues.size)emit({stage:'nearby',data:snapshot()});
   await Promise.all(supplemental);
   for(const menu of menus){
    const venue=venues.get(menu.id);
    if(venue&&!venue.venuePrice)venues.set(menu.id,{...venue,venuePrice:menu.price});
   }
   return answer(snapshot());

  }catch{return failure('provider_unavailable',502)}
  };
  if(input.progressive!==true)return discover();
  const encoder=new TextEncoder();
  let cancelled=false;
  const stream=new ReadableStream({
   async start(controller){
    const emit=record=>{if(!cancelled)controller.enqueue(encoder.encode(JSON.stringify(record)+'\n'))};
    const result=await discover(emit);
    emit({stage:'complete',status:result.status,data:await result.json()});
    if(!cancelled)controller.close();
   },
   cancel(){cancelled=true}
  });
  return new Response(stream,{headers:{'Content-Type':'application/x-ndjson; charset=utf-8','Cache-Control':'no-store, no-transform','X-Content-Type-Options':'nosniff'}});
 };
}
