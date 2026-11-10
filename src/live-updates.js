import {distanceMeters} from './domain.js';

// GPS updates are cheap. Provider lookups are bounded and coalesced.
export function createLiveUpdates({
 search,onPosition,onDataset,onError,now=Date.now,
 setTimer=setTimeout,clearTimer=clearTimeout,
 minimumInterval=15000,refreshAfter=120000,movement=75
}){
 let active=true,position,anchor,lastStarted=-Infinity,lastCompleted=0;
 let timer,flight,revision=0,blocked=false,coverageAnchor,lastExtended=0,retryUntil=0;
 const moved=(a,b)=>distanceMeters(a.coords.latitude,a.coords.longitude,b.coords.latitude,b.coords.longitude);
 const needsSearch=()=>!anchor||moved(anchor,position)>=movement||now()-lastCompleted>=refreshAfter;
 function schedule(){
  clearTimer(timer);
  if(!active||!position||flight||blocked)return;
  const delay=Math.max(retryUntil-now(),needsSearch()?Math.max(0,minimumInterval-(now()-lastStarted)):Math.max(0,refreshAfter-(now()-lastCompleted)));
  timer=setTimer(run,delay);
  timer?.unref?.();
 }
 async function run(){
  if(!active||!position||flight||blocked)return;
  if(!needsSearch()){schedule();return}
  const origin=position,token={revision};
  const extended=!coverageAnchor||moved(coverageAnchor,origin)>=250||now()-lastExtended>=600000;
  flight=token;lastStarted=now();
  const deliver=(dataset,partial)=>{
   if(active&&flight===token&&token.revision===revision){
    onDataset({...dataset,lat:position.coords.latitude,lng:position.coords.longitude,locationAccuracy:position.coords.accuracy},partial);
   }
  };
  try{
   const dataset=await search(origin,next=>deliver(next,true),{extended});
   if(active&&flight===token&&token.revision===revision){
    anchor=origin;lastCompleted=now();
    if(extended){coverageAnchor=origin;lastExtended=now()}
    retryUntil=0;deliver(dataset,false);
   }
  }catch(error){
   if(active&&flight===token&&token.revision===revision){
    blocked=error.code==='provider_budget_exhausted';
    retryUntil=now()+(error.code==='rate_limited'?60000:15000);
    onError(error);
   }
  }finally{
   if(flight===token){flight=null;schedule()}
  }
 }
 return {
  position(next){
   if(!active||!next?.coords)return;
   const c=next.coords;
   if(!Number.isFinite(c.latitude)||Math.abs(c.latitude)>90||!Number.isFinite(c.longitude)||Math.abs(c.longitude)>180||!Number.isFinite(c.accuracy)||c.accuracy<0||c.accuracy>250)return;
   if(Number.isFinite(next.timestamp)&&now()-next.timestamp>60000)return;
   if(position&&c.accuracy>Math.max(75,position.coords.accuracy*2)&&moved(position,next)<=c.accuracy)return;
   if(position&&moved(position,next)<5&&c.accuracy>=position.coords.accuracy)return;
   position=next;
   onPosition(next);
   if(lastStarted===-Infinity)void run();else schedule();
  },
  stop(){
   active=false;revision++;clearTimer(timer);flight=null;position=null;anchor=null;
  },
  resume(){
   active=true;revision++;lastStarted=-Infinity;
  }
 };
}
