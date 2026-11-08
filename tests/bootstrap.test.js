import {test} from 'node:test';import assert from 'node:assert/strict';
import {initialDemoDataset} from '../src/bootstrap.js';
import {spendingSelection,spendingPriceText} from '../src/spending-slider.js';
test('first preview visit has finite local prices without choosing a demo city',()=>{const data=initialDemoDataset(true,null);assert.equal(data.city,'Bologna');assert.equal(data.demo,true);for(const position of [0,125,375,625,875,999]){const choice=spendingSelection(position,data.priceBands.dinner,data.venues,'dinner',data.currency);assert.ok(Number.isFinite(choice.maxPrice));assert.notEqual(spendingPriceText(choice,'it',data.currency),'')}});
test('preview remembers explicit city and currency on reload',()=>{const data=initialDemoDataset(true,'London');assert.equal(data.currency,'GBP');assert.equal(data.city,'London');const choice=spendingSelection(625,data.priceBands.dinner,data.venues,'dinner',data.currency);assert.equal(spendingPriceText(choice,'en-GB',data.currency),'£105')});
test('invalid remembered city is safe and live mode never gets fictional data',()=>{assert.equal(initialDemoDataset(true,'invalid').city,'Bologna');assert.equal(initialDemoDataset(false,'London'),null)});
import {discoverDemoPreview} from '../src/bootstrap.js';
test('static hosted root detects unconfigured demo mode through status API',async()=>{assert.equal(await discoverDemoPreview({marker:false,native:false,fetch:async()=>Response.json({configured:false,demoPreview:true})}),true)});
test('status discovery does not seed demos for configured or native apps',async()=>{assert.equal(await discoverDemoPreview({marker:false,native:false,fetch:async()=>Response.json({configured:true})}),false);let calls=0;assert.equal(await discoverDemoPreview({marker:false,native:true,fetch:async()=>{calls++}}),false);assert.equal(calls,0)});
test('unknown provider status cannot silently create fictional live data',async()=>{assert.equal(await discoverDemoPreview({marker:false,native:false,fetch:async()=>{throw Error('offline')}}),false)});

test('unconfigured production status never enables fictional cities',async()=>{assert.equal(await discoverDemoPreview({marker:false,native:false,fetch:async()=>Response.json({configured:false})}),false)});
