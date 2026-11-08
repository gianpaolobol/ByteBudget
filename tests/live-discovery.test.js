import {test} from 'node:test';import assert from 'node:assert/strict';
import {selectVenues,validPrice} from '../src/domain.js';
import {validateDataset} from '../src/provider.js';
const now=Date.now();const v={id:'source-id',name:'Sourced venue',lat:44.49,lng:11.34,currency:'EUR',rating:4.8,reviewCount:100,isOpen:true,prices:{},venuePrice:{min:15,max:30,updatedAt:new Date(now).toISOString(),source:'Google Maps priceRange',scope:'venue-estimate'}};
const q={lat:44.49,lng:11.34,currency:'EUR',radius:500,meal:'dinner',now};
test('general source estimate filters spending without inventing lunch or dinner menus',()=>{assert.equal(validPrice(v,'dinner','EUR',now).max,30);assert.equal(v.prices.dinner,undefined);assert.equal(selectVenues([v],{...q,maxPrice:20}).length,0);assert.equal(selectVenues([v],{...q,maxPrice:35}).length,1)});
test('without price calibration, explicit discovery fallback shows real rated venues and no invented price',()=>{const unknown={...v,venuePrice:undefined};const found=selectVenues([unknown],{...q,unpricedFallback:true});assert.equal(found.length,1);assert.equal(found[0].price,null);assert.equal(selectVenues([unknown],q).length,0)});
test('provider rejects malformed general price payloads before display',()=>{assert.throws(()=>validateDataset({city:'Bologna',currency:'EUR',timeZone:'Europe/Rome',lat:44.49,lng:11.34,venues:[{...v,venuePrice:{...v.venuePrice,max:-1}}]}));});
