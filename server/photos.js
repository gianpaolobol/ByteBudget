import {providerBudgetConfigured,reserveProviderPhoto} from './provider-budget.js';
const reply=(error,status)=>Response.json({error},{status,headers:{'Cache-Control':'no-store'}});
export const validPhotoName=name=>typeof name==='string'&&name.length<=3000&&/^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/.test(name);
export function createPhotoHandler({fetch:fetcher=(...args)=>globalThis.fetch(...args)}={}){
 return async(request,env)=>{
  if(request.method!=='GET')return reply('method_not_allowed',405);
  const name=new URL(request.url).searchParams.get('name');if(!validPhotoName(name))return reply('invalid_photo',400);
  if(env.LIVE_SEARCH_ENABLED!=='true'||!env.GOOGLE_PLACES_API_KEY||!providerBudgetConfigured(env))return reply('photo_unavailable',503);
  const reserved=await reserveProviderPhoto(env);if(reserved!=='reserved')return reply('photo_unavailable',reserved==='exhausted'?429:503);
  try{
   const url=new URL('https://places.googleapis.com/v1/'+name+'/media');url.searchParams.set('maxWidthPx','640');url.searchParams.set('skipHttpRedirect','true');url.searchParams.set('key',env.GOOGLE_PLACES_API_KEY);
   const response=await fetcher(url.href,{signal:AbortSignal.timeout(10000),redirect:'error'});if(!response.ok)throw Error();
   const {photoUri}=await response.json();const photo=new URL(photoUri);
   if(photo.protocol!=='https:'||photo.username||photo.password||!(photo.hostname==='googleusercontent.com'||photo.hostname.endsWith('.googleusercontent.com')||photo.hostname==='ggpht.com'||photo.hostname.endsWith('.ggpht.com'))||photo.searchParams.has('key')||photo.href.includes(env.GOOGLE_PLACES_API_KEY))throw Error();
   if(new URL(request.url).searchParams.get('format')==='json')return Response.json({photoUri:photo.href},{headers:{'Cache-Control':'no-store'}});
   return new Response(null,{status:302,headers:{Location:photo.href,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
  }catch{return reply('photo_unavailable',502)}
 };
}
