import {createPhotoHandler} from './photos.js';
import {createNearbyHandler,nearbyConfigured} from './nearby.js';
import {createSearchHandler} from './search.js';
export function createWorker(assets){
 const search=createSearchHandler(),nearby=createNearbyHandler(),photo=createPhotoHandler();
 const isConfigured=env=>env.DISCOVERY_MODE==='nearby'?nearbyConfigured(env):(env.LIVE_SEARCH_ENABLED==='true'&&!!env.GOOGLE_PLACES_API_KEY&&!!env.VERIFIED_CATALOG);
 return {async fetch(request,env={}){
  const url=new URL(request.url),origin=request.headers.get('Origin');
  const native=env.NATIVE_API_ENABLED==='true'&&['capacitor://localhost','https://localhost'].includes(origin);
  if(url.pathname.startsWith('/api/')){
   if(origin&&origin!==url.origin&&!native)return new Response('Origin not allowed',{status:403,headers:{'Cache-Control':'no-store'}});
   const cors=native?{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Vary':'Origin'}:{};
   if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...cors,'Cache-Control':'no-store'}});
   let response;
   if(url.pathname==='/api/status')response=Response.json({configured:isConfigured(env),...(nearbyConfigured(env)?{mode:'nearby'}:{}),...(env.DEMO_PREVIEW_ENABLED==='true'?{demoPreview:true}:{})},{headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
   else if(url.pathname==='/api/photo')response=await photo(request,env);
   else if(url.pathname==='/api/nearby')response=env.DISCOVERY_MODE==='nearby'?await nearby(request,env):Response.json({error:'provider_not_configured'},{status:503,headers:{'Cache-Control':'no-store'}});
   else if(env.DISCOVERY_MODE==='nearby')response=Response.json({error:'not_found'},{status:404});
   else response=await search(request,env);
   for(const [key,value]of Object.entries(cors))response.headers.set(key,value);
   return response;
  }
  if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
  const name=url.pathname==='/'?'/index.html':url.pathname;
  if(!Object.hasOwn(assets,name))return new Response('Not found',{status:404});
  const item=assets[name];
  const configured=isConfigured(env);
  const content=name==='/index.html'&&!configured&&env.DEMO_PREVIEW_ENABLED==='true'?item.content.replace(/<html(?=\s|>)/i,'<html data-demo-preview="true"'):item.content;
  const body=item.base64?Uint8Array.from(atob(content),c=>c.charCodeAt(0)):content;
  return new Response(request.method==='HEAD'?null:body,{headers:{'Content-Type':item.type,'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Cache-Control':'no-cache'}});
 }};
}
