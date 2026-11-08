import test from 'node:test';
import assert from 'node:assert/strict';
import {selectVenues} from '../src/domain.js';
import {spendingSelection} from '../src/spending-slider.js';
const now=Date.now();
const venue=(id,sourceTier,max,extra={})=>({id,name:id,lat:44.49,lng:11.34,currency:'EUR',rating:4.5,reviewCount:20,isOpen:true,sourceTier,prices:{},venuePrice:{min:max-5,max,updatedAt:new Date(now).toISOString(),source:'Google Maps priceRange',scope:'venue-estimate'},...extra});
const venues=[venue('cheap','low',20),venue('middle','mid',40),venue('high','high',80),venue('unknown',undefined,15),venue('closed','mid',35,{isOpen:false,openingStatus:'closed'})];
const criteria={lat:44.49,lng:11.34,radius:1000,meal:'dinner',currency:'EUR',now,sourceTiers:true,includeClosed:true};
test('sparse real venue sample still selects only the requested source budget tier',()=>{
 assert.deepEqual(selectVenues(venues,{...criteria,tier:'low'}).map(v=>v.id),['cheap']);
 assert.deepEqual(selectVenues(venues,{...criteria,tier:'mid'}).map(v=>v.id),['closed','middle']);
});
test('numeric spending readout uses actual selected-tier amounts even below ten samples',()=>{
 const selection=spendingSelection(375,null,venues,'dinner','EUR',now,{sourceTiers:true});
 assert.equal(selection.tier,'mid');assert.equal(selection.maxPrice,37.52);
 assert.deepEqual(selectVenues(venues,{...criteria,...selection}).map(v=>v.id),['closed']);
 const luxury=spendingSelection(850,null,venues,'dinner','EUR',now,{sourceTiers:true});assert.equal(luxury.maxPrice,undefined);assert.equal(luxury.unlimited,false);
 assert.equal(spendingSelection(1000,null,venues,'dinner','EUR',now,{sourceTiers:true}).unlimited,true);
});
test('source tier never fabricates numeric prices and explicit caps exclude unknown amounts',()=>{
 const v=venue('no-price','mid',40,{venuePrice:undefined});
 assert.equal(selectVenues([v],{...criteria,tier:'mid'}).length,1);
 assert.equal(selectVenues([v],{...criteria,tier:'mid',maxPrice:50}).length,0);
 assert.equal(spendingSelection(375,null,[v],'dinner','EUR',now,{sourceTiers:true}).maxPrice,undefined);
});
test('fractional source prices and highest priced venue remain reachable at tier endpoint',()=>{
 const one=[venue('fractional','mid',20.25)];
 const s=spendingSelection(375,null,one,'dinner','EUR',now,{sourceTiers:true});assert.equal(s.maxPrice,20.25);assert.equal(selectVenues(one,{...criteria,...s}).length,1);
 const wide=[venue('first','mid',10),venue('last','mid',1000)];assert.equal(spendingSelection(499,null,wide,'dinner','EUR',now,{sourceTiers:true}).maxPrice,1000);
});
test('unknown Google priceLevel stays unclassified even when numeric city bands exist',()=>{
 const v=venue('no-source-tier',undefined,25);assert.equal(selectVenues([v],{...criteria,tier:'mid',bands:{lowMax:20,midMax:50,highMax:120}}).length,0);
});
