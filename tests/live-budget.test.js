import test from 'node:test';
import assert from 'node:assert/strict';
import {cityBands,selectVenues,validPrice,isOpenAt} from '../src/domain.js';
import {createSpendingSelector} from '../src/spending-slider.js';
const now=Date.parse('2026-11-10T20:00:00Z');
const venue=(id,min,max,extra={})=>({id,name:id,lat:44.49,lng:11.34,currency:'EUR',rating:4.5,reviewCount:20,isOpen:true,openingStatus:'open',timeZone:'Europe/Rome',prices:{},venuePrice:{min,max,updatedAt:new Date(now).toISOString(),source:'test',scope:'venue-estimate'},...extra});
test('all slider positions preserve cheaper open venues as the maximum budget increases',()=>{
 const venues=[venue('low',5,15),venue('mid',20,30),venue('high',55,65),venue('premium',140,180),venue('closed',5,10,{isOpen:false,openingStatus:'closed'})];
 const bands=cityBands(venues,'dinner','EUR',now,null,'IT'),choose=createSpendingSelector(bands,venues,'dinner','EUR',now);
 let previous=[];
 for(let value=0;value<=1000;value++){
  const selection=choose(value);
  const found=selectVenues(venues,{lat:44.49,lng:11.34,radius:1000,currency:'EUR',meal:'dinner',now,maxPrice:selection.maxPrice});
  const ids=found.map(v=>v.id);
  assert.ok(previous.every(id=>ids.includes(id)),String(value));
  assert.ok(!ids.includes('closed'));
  previous=ids;
 }
 assert.equal(previous.length,4);
});
test('dinner-only prices and clock skew do not corrupt the budget',()=>{
 const v=venue('meal',140,180);
 v.venuePrice.meal='dinner';
 assert.equal(validPrice(v,'lunch','EUR',now),null);
 v.venuePrice.updatedAt=new Date(now+1000).toISOString();
 assert.ok(validPrice(v,'dinner','EUR',now));
});
test('the published closing time removes a venue without another provider call',()=>{
 const v=venue('closes',10,20,{openingPeriods:[{open:{date:{year:2026,month:11,day:10},hour:19,minute:0},close:{date:{year:2026,month:11,day:10},hour:21,minute:0}}]});
 assert.equal(isOpenAt(v,Date.parse('2026-11-10T19:59:00Z')),true);
 assert.equal(isOpenAt(v,Date.parse('2026-11-10T20:00:00Z')),false);
});
