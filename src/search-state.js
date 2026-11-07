// UI-session memory only: no provider content is written to persistent storage.
export function mergeCityDataset(previous,next){
 if(!previous||previous.city!==next.city||previous.currency!==next.currency)return {...next,venues:[...next.venues]};
 const venues=new Map(previous.venues.map(v=>[v.id,v]));for(const v of next.venues)venues.set(v.id,v);return {...next,venues:[...venues.values()]};
}
export function makeSearchSnapshot(venues,criteria){return {venues:[...venues],criteria:{...criteria}}}
