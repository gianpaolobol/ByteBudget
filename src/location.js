const locationError=(code,message)=>Object.assign(new Error(message),{code});
const deniedCodes=[1,'OS-PLUG-GLOC-0003','OS-PLUG-GLOC-0007','OS-PLUG-GLOC-0008'];
const permissionDenied=()=>locationError('location_denied','Location permission denied or disabled');
const unavailable=()=>locationError('location_unavailable','Location unavailable');
const impreciseLocation=()=>locationError('location_imprecise','Location too imprecise');

function validCoordinates(c){
 return c&&Number.isFinite(c.latitude)&&Math.abs(c.latitude)<=90&&
  Number.isFinite(c.longitude)&&Math.abs(c.longitude)<=180&&Number.isFinite(c.accuracy)&&c.accuracy>=0;
}


export async function getForegroundPosition(getPosition,radius,{preciseOnly=false}={}){
 const limit=Math.min(250,radius/2);
 let imprecise=false;
 for(const precise of preciseOnly?[true]:[false,true]){
  let position;
  try{
   position=await getPosition({enableHighAccuracy:precise,timeout:precise?8500:2000,maximumAge:60000});
  }catch(error){
   if(deniedCodes.includes(error?.code))throw permissionDenied();
   if(precise)throw locationError(imprecise?'location_imprecise':'location_unavailable','Location unavailable');
   continue;
  }
  const c=position?.coords;
  if(!validCoordinates(c)){
   if(precise)throw locationError('location_unavailable','Invalid location');
   continue;
  }
  if(c.accuracy<=limit)return position;
  imprecise=true;
  if(precise)throw locationError('location_imprecise','Location too imprecise');
 }
}

// A one-shot Core Location request can return a coarse fix before GPS converges.
export async function getIosForegroundPosition(geo,radius,{timeout=12000,refineFor=300}={}){
 let permission;
 try{
  permission=await geo.checkPermissions();
  if(permission.location==='prompt'||permission.location==='prompt-with-rationale'){
   permission=await geo.requestPermissions();
  }
 }catch(error){
  throw deniedCodes.includes(error?.code)?permissionDenied():unavailable();
 }
 if(permission.location!=='granted')throw permissionDenied();

 const limit=Math.min(250,radius/2);
 const target=Math.min(75,limit);
 let registration,timer,refinementTimer,best,receivedCoarse=false;
 try{
  return await new Promise((resolve,reject)=>{
   const finish=()=>{
    if(best)resolve(best);
    else reject(receivedCoarse?impreciseLocation():unavailable());
   };
   timer=setTimeout(finish,timeout);
   registration=Promise.resolve().then(()=>geo.watchPosition({
    enableHighAccuracy:true,maximumAge:60000,timeout:timeout+2000
   },(position,error)=>{
    if(deniedCodes.includes(error?.code)){reject(permissionDenied());return}
    if(error?.code==='OS-PLUG-GLOC-0010'){finish();return}
    if(!validCoordinates(position?.coords))return;
    if(Number.isFinite(position.timestamp)&&Date.now()-position.timestamp>60000)return;
    if(position.coords.accuracy>limit){receivedCoarse=true;return}
    if(!best||position.coords.accuracy<best.coords.accuracy)best=position;
    if(best.coords.accuracy<=target)resolve(best);
    else refinementTimer??=setTimeout(finish,refineFor);
   }));
   registration.catch(error=>{
    if(deniedCodes.includes(error?.code))reject(permissionDenied());
    else finish();
   });
  });
 }finally{
  clearTimeout(timer);
  clearTimeout(refinementTimer);
  // The first callback can arrive before Capacitor returns its watch ID.
  registration?.then(id=>geo.clearWatch({id})).catch(()=>{});
 }
}
