import test from 'node:test';
import assert from 'node:assert/strict';
import {selectVenues,sourceVenueTier,cityBands} from '../src/domain.js';
import {spendingSelection} from '../src/spending-slider.js';
const now=Date.now(),bands={lowMax:20,midMax:50,highMax:120};
const venue=(id,sourceTier,max,extra={})=>({id,name:id,lat:44.49,lng:11.34,currency:'EUR',rating:4.5,reviewCount:20,isOpen:true,sourceTier,prices:{},venuePrice:{min:max-10,max,updatedAt:new Date(now).toISOString(),source:'Google Maps priceRange',scope:'venue-estimate'},...extra});
const criteria={lat:44.49,lng:11.34,radius:1000,meal:'dinner',currency:'EUR',now,sourceTiers:true,includeClosed:true,bands};
test('Trentatre 30–40 EUR is Mid despite Google expensive classification',()=>{
 const v=venue('Trentatre','high',40);
 assert.equal(sourceVenueTier(v,'dinner','EUR',now,bands),'mid');
 assert.deepEqual(selectVenues([v],{...criteria,tier:'mid',maxPrice:40}).map(v=>v.id),['Trentatre']);
 assert.equal(selectVenues([v],{...criteria,tier:'high',maxPrice:85}).length,0);
});
test('numeric price classifies without qualitative label and upper range determines tier',()=>{
 assert.equal(sourceVenueTier(venue('numeric',undefined,40),'dinner','EUR',now,bands),'mid');
 assert.equal(sourceVenueTier(venue('crosses','low',60),'dinner','EUR',now,bands),'high');
});
test('missing stale and wrong-currency prices stay out even at unlimited Luxury',()=>{
 const invalid=[venue('missing','luxury',200,{venuePrice:undefined}),venue('stale','luxury',200,{venuePrice:{min:150,max:200,scope:'venue-estimate',source:'menu',updatedAt:new Date(now-91*86400000).toISOString()}}),venue('foreign','luxury',200,{currency:'GBP'})];
 for(const tier of ['low','mid','high','luxury'])assert.equal(selectVenues(invalid,{...criteria,tier,maxPrice:null}).length,0);
});
test('Italy reference thresholds remain stable with sparse local sample; no euro fallback abroad',()=>{
 const v=[venue('Trentatre','high',40)];
 assert.deepEqual(cityBands(v,'dinner','EUR',now,null,'IT'),{...bands,source:'country-reference',sampleSize:1});
 assert.equal(cityBands(v,'dinner','EUR',now,null,'FR'),null);
 assert.equal(cityBands(v,'dinner','JPY',now,null,'JP'),null);
});
test('every tier endpoint is reachable and 30–40 EUR is selectable within Mid',()=>{
 assert.equal(spendingSelection(499,bands).maxPrice,50);
 assert.equal(spendingSelection(749,bands).maxPrice,120);
 const s=spendingSelection(420,bands);assert.equal(s.tier,'mid');assert.ok(s.maxPrice>=40);
 assert.equal(selectVenues([venue('Trentatre','high',40)],{...criteria,...s}).length,1);
 assert.equal(spendingSelection(1000,bands).unlimited,true);
});
test('exclusive Google upper endpoint fits the last currency unit below the Low boundary',()=>{
 const v=venue('under20','high',20,{venuePrice:{min:10,max:20,upperExclusive:true,updatedAt:new Date(now).toISOString(),scope:'venue-estimate',source:'Google'}});
 assert.equal(selectVenues([v],{...criteria,tier:'low',maxPrice:19.99}).length,1);
 assert.equal(selectVenues([v],{...criteria,tier:'low',maxPrice:19.98}).length,0);
});
