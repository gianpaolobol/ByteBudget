import {test} from 'node:test';import assert from 'node:assert/strict';import {mergeCityDataset,makeSearchSnapshot} from '../src/search-state.js';
test('same-city tier refresh keeps saved venue records from previous searches in memory',()=>{const a={city:'Bologna',currency:'EUR',venues:[{id:'mid',name:'Mid venue'}]};const b={city:'Bologna',currency:'EUR',venues:[{id:'luxury',name:'Luxury venue'}]};assert.deepEqual(mergeCityDataset(a,b).venues.map(v=>v.id),['mid','luxury'])});
test('new data replaces old information for the same venue',()=>{const next=mergeCityDataset({city:'Bologna',currency:'EUR',venues:[{id:'x',rating:4}]},{city:'Bologna',currency:'EUR',venues:[{id:'x',rating:4.8}]});assert.equal(next.venues.length,1);assert.equal(next.venues[0].rating,4.8)});
test('city/currency changes cannot mix saved display amounts',()=>{assert.equal(mergeCityDataset({city:'London',currency:'GBP',venues:[{id:'a'}]},{city:'Tokyo',currency:'JPY',venues:[{id:'b'}]}).venues.length,1)});
test('search summary retains searched tier and meal after controls change',()=>{const criteria={tier:'mid',meal:'lunch',radius:500};const snapshot=makeSearchSnapshot([{id:'a'}],criteria);criteria.tier='luxury';criteria.meal='dinner';assert.equal(snapshot.criteria.tier,'mid');assert.equal(snapshot.criteria.meal,'lunch')});

test('saved nearby restaurants remain visible when source price is unavailable',async()=>{
 const {selectSavedVenues}=await import('../src/search-state.js');
 const venue={id:'real-id',name:'Source venue',lat:44.49,lng:11.34,currency:'EUR',rating:4.7,reviewCount:90,isOpen:true,prices:{}};
 const found=selectSavedVenues([venue],['real-id'],{lat:44.49,lng:11.34,radius:1000,currency:'EUR',meal:'dinner',pricingScope:'venue'});
 assert.equal(found.length,1);assert.equal(found[0].id,'real-id');assert.equal(found[0].price,null);
});
