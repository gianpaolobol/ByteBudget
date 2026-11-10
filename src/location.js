const locationError=(code,message)=>Object.assign(new Error(message),{code});

export async function getForegroundPosition(getPosition,radius,{preciseOnly=false}={}){
 const limit=Math.min(250,radius/2);
 let imprecise=false;
 for(const precise of preciseOnly?[true]:[false,true]){
  let position;
  try{
   position=await getPosition({enableHighAccuracy:precise,timeout:precise?8500:2000,maximumAge:60000});
  }catch(error){
   if([1,'OS-PLUG-GLOC-0003'].includes(error?.code))throw locationError('location_denied','Location permission denied');
   if(precise)throw locationError(imprecise?'location_imprecise':'location_unavailable','Location unavailable');
   continue;
  }
  const c=position?.coords;
  if(!c||!Number.isFinite(c.latitude)||Math.abs(c.latitude)>90||!Number.isFinite(c.longitude)||Math.abs(c.longitude)>180||!Number.isFinite(c.accuracy)||c.accuracy<0){
   if(precise)throw locationError('location_unavailable','Invalid location');
   continue;
  }
  if(c.accuracy<=limit)return position;
  imprecise=true;
  if(precise)throw locationError('location_imprecise','Location too imprecise');
 }
}
