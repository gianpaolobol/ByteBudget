import {test} from 'node:test';import assert from 'node:assert/strict';
import {validPrice} from '../src/domain.js';
const venue={currency:'EUR',timeZone:'Europe/Rome',prices:{lunch:{min:12,max:18,updatedAt:'2026-11-01',source:'Official menu',validDays:[1,2,3,4,5]}}};
test('weekday-only lunch does not qualify on a Saturday',()=>assert.equal(validPrice(venue,'lunch','EUR',Date.parse('2026-11-07T12:00:00Z')),null));
test('weekday uses local timezone rather than UTC',()=>{const v={...venue,timeZone:'Asia/Tokyo'};assert.equal(validPrice(v,'lunch','EUR',Date.parse('2026-11-06T16:00:00Z')),null)});
test('weekday menu qualifies during valid weekday',()=>assert.ok(validPrice(venue,'lunch','EUR',Date.parse('2026-11-06T12:00:00Z'))));
test('dated menu is rejected outside offer dates',()=>{const v={...venue,prices:{lunch:{...venue.prices.lunch,validDays:undefined,validFrom:'2026-11-10',validUntil:'2026-11-20'}}};assert.equal(validPrice(v,'lunch','EUR',Date.parse('2026-11-07T12:00:00Z')),null)});
