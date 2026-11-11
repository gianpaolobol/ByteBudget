import {test} from 'node:test';import assert from 'node:assert/strict';
import {createSearchHandler} from '../server/search.js';
const now=Date.parse('2026-11-07T12:00:00Z');
const catalog={cities:[{id:'test-city',name:'Test city',currency:'EUR',timeZone:'Europe/Rome',priceBands:{lunch:{lowMax:20,midMax:50,highMax:120}},bounds:{south:44.4,north:44.6,west:11.2,east:11.5},venues:[{placeId:'place-test',name:'Test venue',lat:44.4949,lng:11.3426,currency:'EUR',cuisine:'Test cuisine',prices:{lunch:{min:12,max:18,updatedAt:'2026-11-01',source:'https://restaurant.example/menu'}},menu:[{name:'Main',price:12}]}]}]};
const request=(body={lat:44.4949,lng:11.3426,radius:800,spendingPosition:249,meal:'lunch'},origin='https://bytebudget.test')=>new Request('https://bytebudget.test/api/search',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(body)});
const env={GOOGLE_PLACES_API_KEY:'test-secret',VERIFIED_CATALOG:JSON.stringify(catalog),LIVE_SEARCH_ENABLED:'true'};
test('missing configuration fails closed and makes no external calls',async()=>{let calls=0;const handler=createSearchHandler({fetch:async()=>{calls++;throw Error()},now:()=>now});const res=await handler(request(),{});assert.equal(res.status,503);assert.equal(calls,0);assert.equal(res.headers.get('cache-control'),'no-store')});
test('bad coordinates and radius cannot cause provider usage',async()=>{let calls=0;const handler=createSearchHandler({fetch:async()=>{calls++},now:()=>now});for(const patch of [{lat:100},{radius:1001},{spendingPosition:1001},{meal:'brunch'}]){const res=await handler(request({lat:44.49,lng:11.34,radius:800,spendingPosition:249,meal:'lunch',...patch}),env);assert.equal(res.status,400)}assert.equal(calls,0)});
test('cross-origin request is rejected',async()=>{const handler=createSearchHandler({now:()=>now});assert.equal((await handler(request(undefined,'https://evil.test'),env)).status,403)});
test('joins fresh ratings to verified meal menus without leaking secrets',async()=>{let call;const handler=createSearchHandler({fetch:async(url,options)=>{call={url,options};return Response.json({id:'place-test',rating:4.8,userRatingCount:824,currentOpeningHours:{openNow:true},businessStatus:'OPERATIONAL',googleMapsUri:'https://maps.google.com/?cid=123'})},now:()=>now});const res=await handler(request(),env);assert.equal(res.status,200);const body=await res.json();assert.equal(body.venues[0].prices.lunch.max,18);assert.equal(body.venues[0].rating,4.8);assert.equal(body.venues[0].reviewCount,824);assert.equal(body.city,'Test city');assert.equal(body.attribution.provider,'Google Maps');assert.equal(JSON.stringify(body).includes('test-secret'),false);assert.equal(call.url,'https://places.googleapis.com/v1/places/place-test?languageCode=en');assert.equal(call.options.method,'GET');assert.equal(call.options.headers['X-Goog-Api-Key'],'test-secret')});
test('provider price range never invents a meal price',async()=>{const handler=createSearchHandler({fetch:async()=>Response.json({places:[{id:'unknown',rating:5,userRatingCount:300,priceRange:{startPrice:{units:'10'},endPrice:{units:'20'}},currentOpeningHours:{openNow:true}}]}),now:()=>now});const response=await handler(request(),env);assert.equal(response.status,502)});
test('coverage gap consumes no provider request',async()=>{let calls=0;const handler=createSearchHandler({fetch:async()=>{calls++},now:()=>now});const res=await handler(request({lat:0,lng:0,radius:800,spendingPosition:249,meal:'lunch'}),env);assert.equal(res.status,422);assert.equal(calls,0)});
test('unavailable provider produces sanitized error',async()=>{const handler=createSearchHandler({fetch:async()=>{throw Error('key=test-secret at 44.4949,11.3426')},now:()=>now});const res=await handler(request(),env);assert.equal(res.status,502);assert.equal((await res.text()).includes('test-secret'),false)});
test('more than 20 verified candidates are rejected before any paid lookup',async()=>{let calls=0;const large=structuredClone(catalog);large.cities[0].venues=Array.from({length:21},(_,i)=>({...large.cities[0].venues[0],placeId:'test-'+i}));const handler=createSearchHandler({fetch:async()=>{calls++},now:()=>now});const res=await handler(request(),{...env,VERIFIED_CATALOG:JSON.stringify(large)});assert.equal(res.status,422);assert.equal(calls,0)});
test('rate limit blocks further provider lookups',async()=>{let calls=0;const handler=createSearchHandler({requestsPerMinute:1,fetch:async()=>{calls++;return Response.json({id:'place-test',rating:4.8,userRatingCount:824,currentOpeningHours:{openNow:true},businessStatus:'OPERATIONAL'})},now:()=>now});assert.equal((await handler(request(),env)).status,200);assert.equal((await handler(request(),env)).status,429);assert.equal(calls,1)});

test('automatic catalog discovery includes different price tiers in one lookup',async()=>{
 const verified=structuredClone(catalog);
 const original=verified.cities[0].venues[0];
 verified.cities[0].venues.push({
  ...original,placeId:'place-mid',name:'Mid venue',
  prices:{lunch:{...original.prices.lunch,min:25,max:35}},
 });
 const handler=createSearchHandler({now:()=>now,fetch:async url=>Response.json({
  id:new URL(url).pathname.split('/').at(-1),rating:4.5,userRatingCount:20,
  currentOpeningHours:{openNow:true},businessStatus:'OPERATIONAL',
 })});
 const response=await handler(request({lat:44.4949,lng:11.3426,radius:1000,meal:'lunch',allPrices:true}),
  {...env,VERIFIED_CATALOG:JSON.stringify(verified)});
 assert.equal(response.status,200);
 assert.deepEqual((await response.json()).venues.map(v=>v.id),['place-test','place-mid']);
});
