import catalog from '../public/open-pilot-catalog.json' with {type:'json'};
import {distanceMeters} from './domain.js';
import {DISCOVERY_RADIUS} from './discovery-ranking.js';

const clock = new Intl.DateTimeFormat('en-GB', {
 timeZone:'Europe/Rome', weekday:'short', hour:'2-digit', minute:'2-digit', hourCycle:'h23',
});
const days = ['Mo','Tu','We','Th','Fr','Sa','Su'];

function compileHours(hours) {
 if (hours === '24/7') return () => true;
 if (!hours) return () => null;
 const intervals = [];
 const scheduledDays = new Set();
 for (const rule of hours.split(';')) {
  const match = /^([A-Z][a-z](?:[-,][A-Z][a-z])*)\s+(.+)$/.exec(rule.trim());
  if (!match) return () => null;
  const weekdays = new Set();
  for (const token of match[1].split(',')) {
   const [first,last=first] = token.split('-');
   const start=days.indexOf(first), end=days.indexOf(last);
   if (start<0 || end<0) return () => null;
   for (let i=start;;i=(i+1)%7) {
    weekdays.add(i);
    if (i===end) break;
   }
  }
  if (match[2]==='off' || match[2]==='closed') {
   // Explicit exceptions can override earlier rules, so treat them conservatively.
   return () => null;
  }
  if ([...weekdays].some(day=>scheduledDays.has(day))) return () => null;
  for (const day of weekdays) scheduledDays.add(day);
  for (const span of match[2].split(',')) {
   const range=/^(\d\d):(\d\d)-(\d\d):(\d\d)$/.exec(span.trim());
   if (!range) return () => null;
   const [h1,m1,h2,m2]=range.slice(1).map(Number);
   if (h1>23 || h2>24 || m1>59 || m2>59 || (h2===24 && m2!==0)) return () => null;
   const start=h1*60+m1, end=h2*60+m2;
   if (start===end) return () => null;
   for (const day of weekdays) {
    if (start<end) intervals.push([day,start,end]);
    else intervals.push([day,start,1440],[(day+1)%7,0,end]);
   }
  }
 }
 return (day,minute) => intervals.some(([d,start,end])=>day===d && minute>=start && minute<end);
}

const hoursById = new Map(catalog.venues.map(venue=>[venue.id,compileHours(venue.hours)]));

export function openPilotDataset({latitude:lat,longitude:lng,accuracy:locationAccuracy}) {
 const area=catalog.areas.find(({bounds:[west,south,east,north]})=>
  lng>=west && lng<=east && lat>=south && lat<=north);
 return {
  lat,lng,locationAccuracy,city:area?.name||'',country:'IT',currency:'EUR',
  timeZone:'Europe/Rome',demo:false,openPilot:true,venues:area?catalog.venues:[],
 };
}

export function selectOpenPilotVenues(data, now=Date.now(), savedIds) {
 const parts=Object.fromEntries(clock.formatToParts(now).map(p=>[p.type,p.value]));
 const day=days.indexOf(parts.weekday.slice(0,2));
 const minute=Number(parts.hour)*60+Number(parts.minute);
 const venues=savedIds?catalog.venues.filter(v=>savedIds.includes(v.id)):data.venues;
 return venues.flatMap(venue=>{
  const distance=distanceMeters(data.lat,data.lng,venue.lat,venue.lng);
  if (!savedIds && distance>DISCOVERY_RADIUS) return [];
  const isOpen=hoursById.get(venue.id)(day,minute);
  if (!savedIds && isOpen===false) return [];
  return [{...venue,distance,isOpen,openingStatus:isOpen===null?'unknown':isOpen?'open':'closed'}];
 }).sort((a,b)=>a.distance-b.distance||a.id.localeCompare(b.id));
}
