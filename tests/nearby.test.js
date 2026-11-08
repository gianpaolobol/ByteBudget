import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createNearbyHandler} from '../server/nearby.js';
const env={LIVE_SEARCH_ENABLED:'true',GOOGLE_PLACES_API_KEY:'test-only'};
const request=(extra={})=>new Request('https://bb.test/api/nearby',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({lat:44.49,lng:11.34,radius:600,language:'it',...extra})});
const geocode=(city,country)=>({status:'OK',results:[{address_components:[{long_name:city,short_name:city,types:['locality']},{long_name:country,short_name:country,types:['country']}]}]});
const place=(extra={})=>({id:'real-place-id',displayName:{text:'Source restaurant'},location:{latitude:44.491,longitude:11.34},rating:4.6,userRatingCount:123,businessStatus:'OPERATIONAL',currentOpeningHours:{openNow:true},priceRange:{startPrice:{currencyCode:'EUR',units:'20'},endPrice:{currencyCode:'EUR',units:'40'}},...extra});
test('real search discovers the city and restaurants using GPS and exact requested radius without a city catalog',async()=>{
 let body;const handler=createNearbyHandler({fetch:async(url,opts)=>{if(String(url).includes('geocode'))return Response.json(geocode('Ferrara','IT'));body=JSON.parse(opts.body);return Response.json({places:[place()]})}});
 const response=await handler(request(),env),data=await response.json();assert.equal(response.status,200);assert.equal(data.city,'Ferrara');assert.equal(data.currency,'EUR');assert.equal(data.demo,false);assert.equal(data.pricingScope,'venue');assert.equal(data.venues[0].name,'Source restaurant');assert.equal(body.locationRestriction.circle.radius,600);assert.equal(body.locationRestriction.circle.center.latitude,44.49);assert.equal(body.locationRestriction.circle.center.longitude,11.34);assert.equal(data.venues[0].prices.lunch,undefined);assert.equal(data.venues[0].prices.dinner,undefined);assert.equal(data.venues[0].venuePrice.max,40);
});
test('London GBP and Tokyo JPY derive from geocoded country independently of interface language',async()=>{
 for(const [city,country,currency,lat,lng] of [['London','GB','GBP',51.5,-.12],['Tokyo','JP','JPY',35.68,139.76]]){
  const h=createNearbyHandler({fetch:async url=>String(url).includes('geocode')?Response.json(geocode(city,country)):Response.json({places:[]})});const d=await (await h(request({lat,lng,language:'it'}),env)).json();assert.equal(d.city,city);assert.equal(d.currency,currency);assert.equal(d.venues.length,0);assert.equal(d.demo,false);
 }
});
test('unknown prices never become invented per-meal prices; out-of-radius and closed venues are discarded',async()=>{
 const h=createNearbyHandler({fetch:async url=>String(url).includes('geocode')?Response.json(geocode('Bologna','IT')):Response.json({places:[place({priceRange:undefined}),place({id:'far',location:{latitude:45,longitude:12}}),place({id:'closed',currentOpeningHours:{openNow:false}})]})});const d=await (await h(request(),env)).json();assert.equal(d.venues.length,1);assert.equal(d.venues[0].venuePrice,undefined);assert.deepEqual(d.venues[0].prices,{});
});
test('foreign-currency and unbounded source prices do not become numeric caps',async()=>{
 const h=createNearbyHandler({fetch:async url=>String(url).includes('geocode')?Response.json(geocode('Bologna','IT')):Response.json({places:[place({priceRange:{startPrice:{currencyCode:'USD',units:'10'},endPrice:{currencyCode:'USD',units:'20'}}}),place({id:'unbounded',priceRange:{startPrice:{currencyCode:'EUR',units:'50'}}})]})});const d=await (await h(request(),env)).json();assert.equal(d.venues.length,2);assert.equal(d.venues[0].venuePrice,undefined);assert.equal(d.venues[1].venuePrice,undefined);
});
test('invalid radius or disabled provider cannot trigger paid calls',async()=>{
 let calls=0;const h=createNearbyHandler({fetch:async()=>{calls++;throw Error()}});assert.equal((await h(request({radius:1001}),env)).status,400);assert.equal((await h(request(),{})).status,503);assert.equal(calls,0);
});
test('Google request failure stays an error and never falls back to demo',async()=>{
 const h=createNearbyHandler({fetch:async()=>Response.json({status:'REQUEST_DENIED'})});const r=await h(request(),env);assert.equal(r.status,502);assert.deepEqual(await r.json(),{error:'provider_unavailable'});
});
