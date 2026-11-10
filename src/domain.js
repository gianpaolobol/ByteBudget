export function distanceMeters(a,b,c,d){const r=Math.PI/180;const x=Math.sin((c-a)*r/2)**2+Math.cos(a*r)*Math.cos(c*r)*Math.sin((d-b)*r/2)**2;return 6371000*2*Math.atan2(Math.sqrt(x),Math.sqrt(Math.max(0,1-x)));}
export function validPrice(v,meal,currency,now=Date.now()){
 const p=v.prices?.[meal]||(v.venuePrice?.scope==='venue-estimate'?v.venuePrice:undefined);const age=now-Date.parse(p?.updatedAt);
 if(!(v.currency===currency&&p&&Number.isFinite(p.min)&&Number.isFinite(p.max)&&p.min>=0&&p.max>=p.min&&p.source&&Number.isFinite(age)&&age>=-300000&&age<=90*86400000))return null;
 if(p.meal&&p.meal!==meal)return null;
 if(p.validDays||p.validFrom||p.validUntil){
  if(!v.timeZone)return null;
  let date,day;try{date=new Intl.DateTimeFormat('en-CA',{timeZone:v.timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(now);day=new Intl.DateTimeFormat('en',{timeZone:v.timeZone,weekday:'short'}).format(now)}catch{return null}
  if(p.validDays&&(!Array.isArray(p.validDays)||!p.validDays.includes(['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(day))))return null;
  if(p.validFrom&&date<p.validFrom||p.validUntil&&date>p.validUntil)return null;
 }
 return p;
}
export const PRICE_TIERS=['low','mid','high','luxury'];
export function validBands(b){return !!b&&[b.lowMax,b.midMax,b.highMax].every(Number.isFinite)&&b.lowMax>0&&b.midMax>b.lowMax&&b.highMax>b.midMax}
export function matchesTier(price,tier,bands){
 if(!validBands(bands)||!PRICE_TIERS.includes(tier)||!price||!Number.isFinite(price.max))return false;
 const belowLow=price.max<bands.lowMax||(price.upperExclusive===true&&price.min<price.max&&price.max===bands.lowMax);
 const actual=belowLow?'low':price.max<=bands.midMax?'mid':price.max<=bands.highMax?'high':'luxury';return actual===tier;
}
export function sourceVenueTier(v,meal,currency,now=Date.now(),bands=null){
 const price=validPrice(v,meal,currency,now);
 return PRICE_TIERS.find(tier=>matchesTier(price,tier,bands))||null;
}
export function cappedPrice(price,currency){
 if(!price.upperExclusive||price.min>=price.max)return price.max;
 const digits=new Intl.NumberFormat('en',{style:'currency',currency}).resolvedOptions().maximumFractionDigits;
 return (Math.ceil(price.max*10**digits-1e-8)-1)/10**digits;
}
const openingFormatters=new Map();
export function isOpenAt(venue,now=Date.now()){
 if(!Array.isArray(venue.openingPeriods)||!venue.timeZone)return venue.isOpen;
 if(!venue.openingPeriods.length)return false;
 let formatter=openingFormatters.get(venue.timeZone);
 if(!formatter){
  formatter=new Intl.DateTimeFormat('en',{timeZone:venue.timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  openingFormatters.set(venue.timeZone,formatter);
 }
 const parts=Object.fromEntries(formatter.formatToParts(now).map(part=>[part.type,part.value]));
 const stamp=(date,hour=0,minute=0)=>Date.UTC(date.year,date.month-1,date.day,hour,minute);
 const current=stamp({year:Number(parts.year),month:Number(parts.month),day:Number(parts.day)},Number(parts.hour),Number(parts.minute));
 let dated=false;
 for(const period of venue.openingPeriods){
  if(!period.open?.date)continue;
  const opening=stamp(period.open.date,period.open.hour,period.open.minute);
  if(!period.close)return current>=opening;
  if(!period.close.date)return venue.isOpen;
  dated=true;
  const closing=stamp(period.close.date,period.close.hour,period.close.minute);
  if(current>=opening&&current<closing)return true;
 }
 return dated?false:venue.isOpen;
}
export function selectVenues(venues,q){
 if(!Number.isFinite(q.radius)||q.radius<100||q.radius>1000||!Number.isFinite(q.lat)||!Number.isFinite(q.lng)||q.tier!==undefined&&!PRICE_TIERS.includes(q.tier))throw new RangeError('Invalid search');
 if(q.maxPrice!==undefined&&q.maxPrice!==null&&(!Number.isFinite(q.maxPrice)||q.maxPrice<0))throw new RangeError('Invalid spending limit');
 return venues.flatMap(v=>{const price=validPrice(v,q.meal,q.currency,q.now),isOpen=isOpenAt(v,q.now);if(!price&&!q.unpricedFallback||q.maxPrice!==undefined&&q.maxPrice!==null&&(!price||cappedPrice(price,q.currency)>q.maxPrice)||q.tier&&(q.sourceTiers?sourceVenueTier(v,q.meal,q.currency,q.now,q.bands)!==q.tier:!matchesTier(price,q.tier,q.bands))||!q.includeClosed&&isOpen!==true&&!(q.includeUnknownHours&&v.openingStatus==='unknown'&&!Array.isArray(v.openingPeriods))||!Number.isFinite(v.lat)||!Number.isFinite(v.lng)||!Number.isFinite(v.rating)||v.rating<0||v.rating>5||!Number.isFinite(v.reviewCount)||v.reviewCount<1)return [];
 const distance=distanceMeters(q.lat,q.lng,v.lat,v.lng);if(distance>q.radius)return [];const score=(v.rating*v.reviewCount+4*50)/(v.reviewCount+50);return [{...v,isOpen,price,distance,score}];}).sort((a,b)=>b.score-a.score||a.distance-b.distance||a.id.localeCompare(b.id));
}
export function cityBands(venues,meal,currency,now=Date.now(),configured=null,country=null){
 if(validBands(configured))return {lowMax:configured.lowMax,midMax:configured.midMax,highMax:configured.highMax,source:'configured',sampleSize:venues.filter(v=>validPrice(v,meal,currency,now)).length};
 if(country==='IT'&&currency==='EUR')return {lowMax:20,midMax:50,highMax:120,source:'country-reference',sampleSize:venues.filter(v=>validPrice(v,meal,currency,now)).length};
 const values=venues.map(v=>validPrice(v,meal,currency,now)?.max).filter(Number.isFinite).sort((a,b)=>a-b);if(values.length<10)return null;
 const lowMax=values[Math.floor((values.length-1)/3)],midMax=values[Math.floor((values.length-1)*2/3)];
 // Keep High broad. Luxury starts above both the 95th percentile and 2.4x the middle boundary.
 const highMax=Math.ceil(Math.max(midMax*2.4,values[Math.floor((values.length-1)*.95)]));
 const result={lowMax,midMax,highMax,source:'estimated',sampleSize:values.length};return validBands(result)?result:null;
}
