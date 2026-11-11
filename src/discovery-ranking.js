import {cappedPrice, matchesTier, PRICE_TIERS, selectVenues} from './domain.js';

export const DISCOVERY_RADIUS = 1000;
export const DISCOVERY_GROUPS = [...PRICE_TIERS, 'unclassified'];

export function rankDiscovery(venues, criteria, bands) {
 const groups = Object.fromEntries(DISCOVERY_GROUPS.map(tier => [tier, []]));
 const candidates = selectVenues(venues, {
  ...criteria,
  radius: DISCOVERY_RADIUS,
  includeUnknownHours: true,
 });
 const priceScale = bands?.lowMax || candidates.reduce((max, venue) => Math.max(max, venue.price.max), 1);

 for (const venue of candidates) {
  const tier = PRICE_TIERS.find(key => matchesTier(venue.price, key, bands)) || 'unclassified';
  const price = cappedPrice(venue.price, criteria.currency);
  // Review confidence comes from selectVenues, which shrinks small samples toward 4.
  const quality = venue.score / 5;
  const affordability = priceScale / (priceScale + price);
  const proximity = 1 - venue.distance / DISCOVERY_RADIUS;
  const value = 0.45 * quality + 0.30 * affordability + 0.25 * proximity;
  groups[tier].push({...venue, value, rankedPrice: price});
 }
 for (const group of Object.values(groups)) {
  group.sort((a, b) => b.value - a.value || a.rankedPrice - b.rankedPrice ||
   a.distance - b.distance || a.id.localeCompare(b.id));
 }
 return groups;
}
