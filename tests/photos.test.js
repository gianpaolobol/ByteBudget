import test from 'node:test';
import assert from 'node:assert/strict';
import {createPhotoHandler} from '../server/photos.js';
import {budgetEnvironment} from '../test-support/provider-budget.js';
const request=name=>new Request('https://bb.test/api/photo?name='+encodeURIComponent(name));
const env=()=>({...budgetEnvironment(),LIVE_SEARCH_ENABLED:'true',GOOGLE_PLACES_API_KEY:'test-only-not-public'});
test('photo route returns a genuine CDN image without exposing key and fails closed after lifetime cap',async()=>{
 let calls=0;const e=env();
 const h=createPhotoHandler({fetch:async(url)=>{calls++;const u=new URL(url);assert.equal(u.hostname,'places.googleapis.com');assert.equal(u.searchParams.get('maxWidthPx'),'640');return Response.json({photoUri:'https://lh3.googleusercontent.com/real-photo'});}});
 const first=await h(request('places/abc/photos/def'),e);assert.equal(first.status,302);assert.equal(first.headers.get('Location'),'https://lh3.googleusercontent.com/real-photo');assert.equal(first.headers.get('Cache-Control'),'no-store');
 for(let i=1;i<500;i++)assert.equal((await h(request('places/abc/photos/def'),e)).status,302);
 assert.equal((await h(request('places/abc/photos/def'),e)).status,429);assert.equal(calls,500);
});
test('invalid photo resource, absent storage, provider failure and unsafe CDN never expose secrets or retry',async()=>{
 let calls=0;const h=createPhotoHandler({fetch:async()=>{calls++;return Response.json({photoUri:'https://evil.example/private'});}});
 assert.equal((await h(request('../geocode?key=bad'),env())).status,400);assert.equal(calls,0);
 assert.equal((await h(request('places/a/photos/b'),{})).status,503);assert.equal(calls,0);
 const r=await h(request('places/a/photos/b'),env());assert.equal(r.status,502);assert.equal(r.headers.get('Location'),null);assert.equal(calls,1);
});
test('photo JSON mode works on the Workers redirect contract and never follows an upstream redirect',async()=>{
 const fetch=async(_url,options)=>{if(options.redirect==='error')throw new TypeError('Workers does not support error redirect mode');assert.equal(options.redirect,'manual');return Response.json({photoUri:'https://lh3.googleusercontent.com/real-image'})};
 const h=createPhotoHandler({fetch});const r=await h(new Request('https://bb.test/api/photo?name=places/a/photos/b&format=json'),env());assert.equal(r.status,200);assert.deepEqual(await r.json(),{photoUri:'https://lh3.googleusercontent.com/real-image'});
 const noRedirect=createPhotoHandler({fetch:async()=>new Response(null,{status:302,headers:{Location:'https://evil.example/'}})});assert.equal((await noRedirect(request('places/a/photos/b'),env())).status,502);
});
