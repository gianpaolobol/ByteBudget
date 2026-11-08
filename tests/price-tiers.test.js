import {test} from 'node:test';import assert from 'node:assert/strict';
import {matchesTier,cityBands,selectVenues} from '../src/domain.js';
const bands={lowMax:20,midMax:50,highMax:120};
test('four bands have precise non-overlapping boundaries',()=>{for(const [max,expected]of [[19.99,'low'],[20,'mid'],[49.99,'mid'],[50,'mid'],[119.99,'high'],[120,'high']]){for(const tier of ['low','mid','high','luxury'])assert.equal(matchesTier({min:max,max},tier,bands),tier===expected)}});
test('luxury has no numeric spending ceiling',()=>assert.equal(matchesTier({min:2000000,max:3000000},'luxury',bands),true));
test('city and meal thresholds override sample estimates',()=>assert.deepEqual(cityBands([],'dinner','EUR',Date.now(),bands),{...bands,source:'configured',sampleSize:0}));
test('unknown thresholds never silently include all prices',()=>assert.equal(matchesTier({min:15,max:18},'mid',null),false));
test('filter returns only the chosen band without any budget field',()=>{const now=Date.now();const venues=[18,30,80,180,3000000].map((max,i)=>({id:String(i),lat:0,lng:0,currency:'EUR',rating:4.8,reviewCount:100,isOpen:true,prices:{dinner:{min:max,max,updatedAt:new Date(now).toISOString(),source:'test menu'}}}));const q={lat:0,lng:0,radius:1000,meal:'dinner',currency:'EUR',tier:'luxury',bands,now};assert.deepEqual(selectVenues(venues,q).map(v=>v.price.max),[180,3000000])});

test('exclusive source endpoints use the preceding band without misclassifying exact prices',()=>{assert.equal(matchesTier({min:10,max:20,upperExclusive:true},'low',bands),true);assert.equal(matchesTier({min:20,max:20},'mid',bands),true);assert.equal(matchesTier({min:100,max:120,upperExclusive:true},'high',bands),true)});
