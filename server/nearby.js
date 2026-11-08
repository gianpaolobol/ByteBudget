import {providerBudgetConfigured,reserveProviderSearch} from './provider-budget.js';
import currencies from 'country-to-currency';
import timeZoneAt from 'tz-lookup';
import {distanceMeters} from '../src/domain.js';
import {validateDataset} from '../src/provider.js';
const MASK='places.id,places.displayName,places.location,places.rating,places.userRatingCount,places.currentOpeningHours,places.businessStatus,places.priceRange,places.googleMapsUri,places.attributions,places.priceLevel,places.photos,places.websiteUri';
const answer=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const failure=(error,status)=>answer({error},status);
const language=value=>({zh:'zh-CN'}[value]||(['en','it','es','de','fr','pt','ru','ja','ko','ar','hi'].includes(value)?value:'en'));
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
  try{
   const geoUrl=new URL('https://maps.googleapis.com/maps/api/geocode/json');geoUrl.searchParams.set('latlng',`${input.lat},${input.lng}`);geoUrl.searchParams.set('language',language(input.language));geoUrl.searchParams.set('key',env.GOOGLE_PLACES_API_KEY);
   const geoResponse=await fetcher(geoUrl.href,{signal:AbortSignal.timeout(10000)});if(!geoResponse.ok)throw Error();
   const geo=await geoResponse.json();if(geo.status!=='OK'||!Array.isArray(geo.results))throw Error();
   const components=geo.results.flatMap(r=>r.address_components||[]);
   const country=components.find(c=>c.types?.includes('country'))?.short_name;
   const city=['locality','postal_town','administrative_area_level_3','administrative_area_level_2'].map(type=>components.find(c=>c.types?.includes(type))?.long_name).find(Boolean);
   const currency=currencies[country];
   if(!city||!currency||!Intl.supportedValuesOf('currency').includes(currency))return failure('city_not_supported',422);
   const response=await fetcher('https://places.googleapis.com/v1/places:searchNearby',{method:'POST',headers:{'Content-Type':'application/json','X-Goog-Api-Key':env.GOOGLE_PLACES_API_KEY,'X-Goog-FieldMask':MASK},body:JSON.stringify({includedTypes:['restaurant','cafe','bar','bakery','meal_takeaway'],maxResultCount:20,rankPreference:'DISTANCE',languageCode:language(input.language),locationRestriction:{circle:{center:{latitude:input.lat,longitude:input.lng},radius:input.radius}}}),signal:AbortSignal.timeout(10000)});
   if(!response.ok)throw Error();const result=await response.json();if(result.places!==undefined&&!Array.isArray(result.places))throw Error();
   const ids=new Set(),venues=(result.places||[]).slice(0,20).flatMap(p=>{
    const lat=p.location?.latitude,lng=p.location?.longitude;
    if(typeof p.id!=='string'||!p.id||ids.has(p.id)||typeof p.displayName?.text!=='string'||!Number.isFinite(lat)||Math.abs(lat)>90||!Number.isFinite(lng)||Math.abs(lng)>180||distanceMeters(input.lat,input.lng,lat,lng)>input.radius||!Number.isFinite(p.rating)||p.rating<0||p.rating>5||!Number.isInteger(p.userRatingCount)||p.userRatingCount<1||p.businessStatus!=='OPERATIONAL')return [];
    ids.add(p.id);
    return [{id:p.id,name:p.displayName.text,lat,lng,currency,rating:p.rating,reviewCount:p.userRatingCount,isOpen:p.currentOpeningHours?.openNow===true,openingStatus:typeof p.currentOpeningHours?.openNow==='boolean'?(p.currentOpeningHours.openNow?'open':'closed'):'unknown',sourceTier:({PRICE_LEVEL_FREE:'low',PRICE_LEVEL_INEXPENSIVE:'low',PRICE_LEVEL_MODERATE:'mid',PRICE_LEVEL_EXPENSIVE:'high',PRICE_LEVEL_VERY_EXPENSIVE:'luxury'})[p.priceLevel],googleMapsUri:p.googleMapsUri,websiteUri:p.websiteUri,photo:Array.isArray(p.photos)?p.photos[0]:undefined,prices:{},venuePrice:venuePrice(p.priceRange,currency,current),menu:[],attributions:Array.isArray(p.attributions)?p.attributions:[],ratingSource:'Google Maps'}];
   });
   const dataset=validateDataset({city,country,currency,timeZone:timeZoneAt(input.lat,input.lng),lat:input.lat,lng:input.lng,demo:false,pricingScope:'venue',venues});
   return answer({...dataset,citySample:dataset.venues,coverage:'nearby-provider-subset',attribution:{provider:'Google Maps',url:'https://maps.google.com'},fetchedAt:new Date(current).toISOString()});
  }catch{return failure('provider_unavailable',502)}
 };
}
