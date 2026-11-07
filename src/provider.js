import {validBands} from './domain.js';
// Validate external payload before committing it to UI state.
export function validateDataset(d){
 const fail=()=>{throw new TypeError('Invalid restaurant provider data')};
 if(!d||typeof d.city!=='string'||!d.city.trim()||!Number.isFinite(d.lat)||Math.abs(d.lat)>90||!Number.isFinite(d.lng)||Math.abs(d.lng)>180||typeof d.currency!=='string'||!Intl.supportedValuesOf('currency').includes(d.currency)||typeof d.timeZone!=='string'||!Array.isArray(d.venues)||d.venues.length>10000)fail();
 try{new Intl.DateTimeFormat('en',{timeZone:d.timeZone}).format()}catch{fail()}
 if(d.priceBands!==undefined){if(!d.priceBands||typeof d.priceBands!=='object')fail();for(const meal of Object.keys(d.priceBands))if(!['lunch','dinner'].includes(meal)||!validBands(d.priceBands[meal]))fail();}
 const ids=new Set();const venues=d.venues.map(v=>{if(!v||typeof v.id!=='string'||!v.id||ids.has(v.id)||typeof v.name!=='string'||!Number.isFinite(v.lat)||Math.abs(v.lat)>90||!Number.isFinite(v.lng)||Math.abs(v.lng)>180||v.currency!==d.currency||!Number.isFinite(v.rating)||v.rating<0||v.rating>5||!Number.isInteger(v.reviewCount)||v.reviewCount<0||typeof v.isOpen!=='boolean')fail();ids.add(v.id);
 const prices={};for(const meal of ['lunch','dinner']){const p=v.prices?.[meal];if(p){if(!Number.isFinite(p.min)||!Number.isFinite(p.max)||p.min<0||p.max<p.min||!Number.isFinite(Date.parse(p.updatedAt))||typeof p.source!=='string'||!p.source)fail();if(p.validDays&&(!Array.isArray(p.validDays)||!p.validDays.length||p.validDays.some(day=>!Number.isInteger(day)||day<0||day>6)))fail();
 const dateOk=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&new Date(s).toISOString().slice(0,10)===s;
 if(p.validFrom&&!dateOk(p.validFrom)||p.validUntil&&!dateOk(p.validUntil)||p.validFrom&&p.validUntil&&p.validFrom>p.validUntil)fail();
 prices[meal]={...p};}}
 const menu=Array.isArray(v.menu)?v.menu.map(item=>{if(!item||typeof item.name!=='string'||!Number.isFinite(item.price)||item.price<0)fail();return {name:item.name,price:item.price}}):[];
 return {...v,timeZone:d.timeZone,cuisine:typeof v.cuisine==='string'?v.cuisine:'',visual:[0,1,2].includes(v.visual)?v.visual:0,prices,menu};});
 const citySample=d.citySample===undefined?undefined:validateDataset({...d,venues:d.citySample,citySample:undefined}).venues;
 return {...d,venues,citySample};
}
