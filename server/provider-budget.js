// Lifetime cap: no automatic rollover, refunds or instance-local fallbacks.
// 500 searches reserve at most 500 Geocoding + 500 Nearby calls.
const SCOPE='google-maps-v1';
const LIMIT=500;
export function providerBudgetConfigured(env){
 return env.GOOGLE_FREE_ALLOWANCE_CONFIRMED==='true'&&typeof env.PROVIDER_BUDGET_DB?.prepare==='function';
}
export async function reserveProviderSearch(env){
 if(!providerBudgetConfigured(env))return 'unavailable';
 try{
  const row=await env.PROVIDER_BUDGET_DB.prepare(`
   INSERT INTO provider_budget (scope,searches) VALUES (?,1)
   ON CONFLICT(scope) DO UPDATE SET searches=provider_budget.searches+1
   WHERE provider_budget.searches < ?
   RETURNING searches
  `).bind(SCOPE,LIMIT).first();
  if(row===null)return 'exhausted';
  return Number.isInteger(row?.searches)&&row.searches>=1&&row.searches<=LIMIT?'reserved':'unavailable';
 }catch{return 'unavailable'}
}
