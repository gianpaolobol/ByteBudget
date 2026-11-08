// Development server only. Do not log request URLs, bodies or coordinates.
import http from 'node:http';
import {Readable} from 'node:stream';
const {default:worker}=await import('../dist/server/index.js');
const env={LIVE_SEARCH_ENABLED:process.env.LIVE_SEARCH_ENABLED,DISCOVERY_MODE:process.env.DISCOVERY_MODE,NATIVE_API_ENABLED:process.env.NATIVE_API_ENABLED,DEMO_PREVIEW_ENABLED:process.env.DEMO_PREVIEW_ENABLED,GOOGLE_PLACES_API_KEY:process.env.GOOGLE_PLACES_API_KEY,VERIFIED_CATALOG:process.env.VERIFIED_CATALOG};
const port=Number(process.env.PORT)||4173;
http.createServer(async(req,res)=>{
 try{
  const method=req.method||'GET';
  const request=new Request(`http://${req.headers.host||'localhost'}${req.url}`,{method,headers:req.headers,...(['GET','HEAD'].includes(method)?{}:{body:Readable.toWeb(req),duplex:'half'})});
  const response=await worker.fetch(request,env);
  res.writeHead(response.status,Object.fromEntries(response.headers));
  if(response.body)Readable.fromWeb(response.body).pipe(res);else res.end();
 }catch{res.writeHead(500);res.end('Service unavailable')}
}).listen(port,'0.0.0.0',()=>console.log(`ByteBudget development server on port ${port}`));
