export function distanceMeters(a,b,c,d){const r=Math.PI/180;const x=Math.sin((c-a)*r/2)**2+Math.cos(a*r)*Math.cos(c*r)*Math.sin((d-b)*r/2)**2;return 6371000*2*Math.atan2(Math.sqrt(x),Math.sqrt(Math.max(0,1-x)));}
export function validPrice(v,meal,currency,now=Date.now()){
 const p=v.prices?.[meal];const age=now-Date.parse(p?.updatedAt);
 if(!(v.currency===currency&&p&&Number.isFinite(p.min)&&Number.isFinite(p.max)&&p.min>=0&&p.max>=p.min&&p.source&&Number.isFinite(age)&&age>=0&&age<=90*86400000))return null;
 if(p.validDays||p.validFrom||p.validUntil){
  if(!v.timeZone)return null;
  let date,day;try{date=new Intl.DateTimeFormat('en-CA',{timeZone:v.timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(now);day=new Intl.DateTimeFormat('en',{timeZone:v.timeZone,weekday:'short'}).format(now)}catch{return null}
  if(p.validDays&&(!Array.isArray(p.validDays)||!p.validDays.includes(['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(day))))return null;
  if(p.validFrom&&date<p.validFrom||p.validUntil&&date>p.validUntil)return null;
 }
 return p;
}
export function selectVenues(venues,q){if(!Number.isFinite(q.radius)||q.radius<100||q.radius>1000||!Number.isFinite(q.budget)||q.budget<=0||!Number.isFinite(q.lat)||!Number.isFinite(q.lng))throw new RangeError('Invalid search');return venues.flatMap(v=>{const price=validPrice(v,q.meal,q.currency,q.now);if(!price||price.max>q.budget||v.isOpen!==true||!Number.isFinite(v.lat)||!Number.isFinite(v.lng)||!Number.isFinite(v.rating)||v.rating<0||v.rating>5||!Number.isFinite(v.reviewCount)||v.reviewCount<1)return [];const distance=distanceMeters(q.lat,q.lng,v.lat,v.lng);if(distance>q.radius)return [];const score=(v.rating*v.reviewCount+4*50)/(v.reviewCount+50);return [{...v,price,distance,score}];}).sort((a,b)=>b.score-a.score||a.distance-b.distance||a.id.localeCompare(b.id));}
export function cityBands(venues,meal,currency,now=Date.now()){const values=venues.map(v=>validPrice(v,meal,currency,now)?.max).filter(Number.isFinite).sort((a,b)=>a-b);if(values.length<10)return null;return {lowMax:values[Math.floor((values.length-1)/3)],midMax:values[Math.floor((values.length-1)*2/3)],sampleSize:values.length};}
