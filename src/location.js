export async function getForegroundPosition(getPosition,radius){
 let position;try{position=await getPosition({enableHighAccuracy:true,timeout:15000,maximumAge:30000})}catch(e){const denied=[1,'OS-PLUG-GLOC-0003'].includes(e?.code);throw Object.assign(new Error(denied?'Location permission denied':'Location unavailable'),{code:denied?'location_denied':'location_unavailable'})}
 const c=position?.coords;
 if(!c||!Number.isFinite(c.latitude)||Math.abs(c.latitude)>90||!Number.isFinite(c.longitude)||Math.abs(c.longitude)>180||!Number.isFinite(c.accuracy)||c.accuracy<0)throw Object.assign(new Error('Invalid location'),{code:'location_unavailable'});
 if(c.accuracy>Math.min(250,radius/2))throw Object.assign(new Error('Location too imprecise'),{code:'location_imprecise'});
 return position;
}
