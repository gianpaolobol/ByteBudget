import {selectVenues,distanceMeters} from './domain.js';
// UI-session memory only: no provider content is written to persistent storage.
export function mergeCityDataset(previous,next){
 if(!previous||previous.city!==next.city||previous.currency!==next.currency)return {...next,venues:[...next.venues]};
 const venues=new Map(previous.venues.map(v=>[v.id,v]));for(const v of next.venues)venues.set(v.id,v);return {...next,venues:[...venues.values()]};
}
export function makeSearchSnapshot(venues,criteria){return {venues:[...venues],criteria:{...criteria}}}

export function selectSavedVenues(venues,savedIds,criteria){
 return venues.filter(v=>savedIds.includes(v.id)).flatMap(venue=>{
  const selected=selectVenues([venue],{...criteria,lat:venue.lat,lng:venue.lng,currency:venue.currency,includeClosed:true,unpricedFallback:criteria.pricingScope==='venue'});
  return selected.map(v=>({...v,distance:distanceMeters(criteria.lat,criteria.lng,v.lat,v.lng)}));
 }).sort((a,b)=>a.distance-b.distance);
}
