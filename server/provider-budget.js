// Lifetime cap: no automatic rollover, refunds or instance-local fallbacks.
// Each Nearby call reserves one unit; the first call may also use Geocoding.
const SCOPE='google-maps-v1';
const LIMIT=500;
export function providerBudgetConfigured(env){
 return env.GOOGLE_FREE_ALLOWANCE_CONFIRMED==='true'&&typeof env.PROVIDER_BUDGET_DB?.prepare==='function';
}
export const reserveProviderSearch=env=>reserve(env,SCOPE);
export const reserveProviderPhoto=env=>reserve(env,'google-photos-v1');
async function reserve(env,scope){
 if(!providerBudgetConfigured(env))return 'unavailable';
 try{
  const row=await env.PROVIDER_BUDGET_DB.prepare(`
   INSERT INTO provider_budget (scope,searches) VALUES (?,1)
   ON CONFLICT(scope) DO UPDATE SET searches=provider_budget.searches+1
   WHERE provider_budget.searches < ?
   RETURNING searches
  `).bind(scope,LIMIT).first();
  if(row===null)return 'exhausted';
  return Number.isInteger(row?.searches)&&row.searches>=1&&row.searches<=LIMIT?'reserved':'unavailable';
 }catch{return 'unavailable'}
}
