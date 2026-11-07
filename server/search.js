import {validateDataset} from '../src/provider.js';
import {validPrice,distanceMeters} from '../src/domain.js';

const FIELD_MASK='id,rating,userRatingCount,currentOpeningHours,businessStatus,googleMapsUri';
const answer=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const error=(code,status)=>answer({error:code},status);

function parseCatalog(value){
 const catalog=JSON.parse(value);
 if(!Array.isArray(catalog.cities)||catalog.cities.length>1000)throw Error();
 return catalog.cities.map(city=>{
  const b=city.bounds;if(!b||![b.south,b.north,b.west,b.east].every(Number.isFinite)||b.south< -90||b.north>90||b.south>=b.north||b.west< -180||b.east>180||b.west>=b.east)throw Error();
  const dataset=validateDataset({city:city.name,currency:city.currency,timeZone:city.timeZone,lat:(b.south+b.north)/2,lng:(b.west+b.east)/2,venues:city.venues.map(v=>({...v,id:v.placeId,rating:0,reviewCount:0,isOpen:false}))});
  return {...city,venues:dataset.venues};
 });
}

export function createSearchHandler({fetch:fetcher=globalThis.fetch,now=Date.now,requestsPerMinute=20}={}){
 // This per-isolate safeguard is supplemented by provider quotas before production activation.
 const buckets=new Map();
 return async function handle(request,env){
  const url=new URL(request.url);
  if(url.pathname!=='/api/search')return error('not_found',404);
  if(request.method!=='POST')return error('method_not_allowed',405);
  const origin=request.headers.get('Origin');
  if(origin&&origin!==url.origin&&!(env.NATIVE_API_ENABLED==='true'&&['capacitor://localhost','https://localhost'].includes(origin)))return error('origin_not_allowed',403);
  if(!request.headers.get('Content-Type')?.startsWith('application/json'))return error('json_required',415);
  let input;try{const text=await request.text();if(text.length>2048)return error('request_too_large',413);input=JSON.parse(text)}catch{return error('invalid_json',400)}
  if(!input||typeof input!=='object'||!Number.isFinite(input.lat)||Math.abs(input.lat)>90||!Number.isFinite(input.lng)||Math.abs(input.lng)>180||!Number.isFinite(input.radius)||input.radius<100||input.radius>1000||!Number.isFinite(input.budget)||input.budget<=0||input.budget>1000000||!['lunch','dinner'].includes(input.meal))return error('invalid_search',400);
  if(env.LIVE_SEARCH_ENABLED!=='true'||!env.GOOGLE_PLACES_API_KEY||!env.VERIFIED_CATALOG)return error('provider_not_configured',503);
  let cities;try{cities=parseCatalog(env.VERIFIED_CATALOG)}catch{return error('invalid_provider_configuration',503)}
  const matches=cities.filter(({bounds:b})=>input.lat>=b.south&&input.lat<=b.north&&input.lng>=b.west&&input.lng<=b.east);
  if(matches.length!==1)return error('city_not_supported',422);
  const city=matches[0];const current=now();
  const candidates=city.venues.filter(v=>validPrice(v,input.meal,city.currency,current)&&distanceMeters(input.lat,input.lng,v.lat,v.lng)<=input.radius);
  if(!candidates.length)return error('no_verified_menus',422);
  const identity=request.headers.get('CF-Connecting-IP')||'local';const minute=Math.floor(current/60000);
  if(buckets.size>1000)for(const [key,value]of buckets)if(value.minute!==minute)buckets.delete(key);
  if(buckets.size>=2000&&!buckets.has(identity))return error('rate_limited',429);
  const bucket=buckets.get(identity);const count=bucket?.minute===minute?bucket.count+1:1;buckets.set(identity,{minute,count});
  if(count>requestsPerMinute)return error('rate_limited',429);
  try{
   // Retrieve verified IDs directly: unrelated nearby restaurants cannot displace them.
   if(candidates.length>20)return error('search_too_broad',422);
   const records=[];
   for(let index=0;index<candidates.length;index+=4){
    const batch=await Promise.all(candidates.slice(index,index+4).map(async venue=>{
     const url=new URL(`https://places.googleapis.com/v1/places/${encodeURIComponent(venue.id)}`);url.searchParams.set('languageCode',({zh:'zh-CN'}[input.language]||(['en','it','es','de','fr','pt','ru','ja','ko','ar','hi'].includes(input.language)?input.language:'en')));
     const response=await fetcher(url.href,{method:'GET',headers:{'X-Goog-Api-Key':env.GOOGLE_PLACES_API_KEY,'X-Goog-FieldMask':FIELD_MASK},signal:AbortSignal.timeout(10000)});
     if(!response.ok)throw Error('Provider unavailable');
     const place=await response.json();if(!place||place.id!==venue.id)throw Error('Unexpected provider result');return place;
    }));records.push(...batch);
   }
   const live=new Map(records.map(place=>[place.id,place]));
   const venues=candidates.flatMap(v=>{const p=live.get(v.id);if(!p||!Number.isFinite(p.rating)||!Number.isInteger(p.userRatingCount)||p.businessStatus!=='OPERATIONAL'||p.currentOpeningHours?.openNow!==true)return [];
    let mapsUrl;try{const link=new URL(p.googleMapsUri);if(link.protocol==='https:'&&['maps.google.com','www.google.com','google.com','maps.app.goo.gl'].includes(link.hostname))mapsUrl=link.href}catch{}
    return [{...v,rating:p.rating,reviewCount:p.userRatingCount,isOpen:true,mapsUrl,ratingSource:'Google Maps',ratingFetchedAt:new Date(current).toISOString()}];});
   const dataset=validateDataset({city:city.name,currency:city.currency,timeZone:city.timeZone,lat:input.lat,lng:input.lng,demo:false,venues});
   return answer({...dataset,citySample:city.venues,coverage:'verified-catalog-subset',attribution:{provider:'Google Maps',url:'https://maps.google.com'},fetchedAt:new Date(current).toISOString()});
  }catch{return error('provider_unavailable',502)}
 };
}
