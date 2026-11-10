import {initialDemoDataset,discoverDemoPreview} from './bootstrap.js';
import {bindRangeGesture} from './range-gesture.js';
import {createSpendingSelector} from './spending-slider.js';
import {mergeCityDataset,makeSearchSnapshot,selectSavedVenues} from './search-state.js';
import {strings,languages,resolveLanguage,direction} from './i18n.js';
import {Capacitor} from '@capacitor/core';
import {Geolocation} from '@capacitor/geolocation';
import {getForegroundPosition,getIosForegroundPosition} from './location.js';
import {createLiveUpdates} from './live-updates.js';
import {loadLiveRestaurants} from './live-client.js';
import {selectVenues,cityBands,cappedPrice,PRICE_TIERS} from './domain.js';
import {validateDataset} from './provider.js';
import {demoCity} from './demo.js';
const app=document.querySelector('#app');
const photoLoads=new Map(),observedPhotos=new Set();let photoObserver;
let demoPreview=__BYTEBUDGET_ALLOW_DEMO__&&document.documentElement.dataset.demoPreview==='true';

const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch{}};
let lang=read('bb-lang',resolveLanguage(navigator.languages||[navigator.language]));if(typeof lang!=='string'||!Object.hasOwn(strings,lang))lang=resolveLanguage(navigator.languages||[navigator.language]);
let knownDataset=null,lastSearch=null,detailReturnView='results',selectedMeal='dinner';
const CLOSE_BY_DISTANCE=150;
let liveUpdates,watchRegistration,watchGeneration=0,localTick,calibration,liveFailure='';
let filterData,filterMeal,filterMinute,bandsForMeal,selectSpending,ranked=[],alternatives=[];
let gestureCount=0,pendingRender,pendingDataApply,pendingPositionApply,filterFrame=false;
const frame=callback=>typeof requestAnimationFrame==='function'?requestAnimationFrame(callback):Promise.resolve().then(callback);
let data=null,view='discover',results=[],selected=null,radius=800,spendingPosition=read('bb-spending-position',({low:249,mid:375,high:749,luxury:1000}[read('bb-tier','mid')]||375)),meal='dinner',message='',busy=false;
if(!Number.isInteger(spendingPosition)||spendingPosition<0||spendingPosition>1000)spendingPosition=375;
let saved=read('bb-saved',[]);if(!Array.isArray(saved))saved=[];
const t=k=>strings[lang][k];const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let moneyKey,moneyFormatter;
const money=v=>{
 const currency=data?.currency||'EUR',key=lang+currency;
 if(moneyKey!==key){moneyKey=key;moneyFormatter=new Intl.NumberFormat(lang,{style:'currency',currency,minimumFractionDigits:0})}
 return moneyFormatter.format(v);
};
function setData(next){
 data=next;
 const activePhotos=new Set(data.venues.map(v=>v.photo?.name).filter(Boolean));
 for(const url of photoLoads.keys())if(!activePhotos.has(new URL(url).searchParams.get('name')))photoLoads.delete(url);
 if(data.demo)write('bb-demo-city',data.city);
 knownDataset=mergeCityDataset(knownDataset,data);lastSearch=null;
 const hour=Number(new Intl.DateTimeFormat('en',{hour:'numeric',hourCycle:'h23',timeZone:data.timeZone}).format(new Date()));
 meal=hour<16?'lunch':'dinner';results=[];alternatives=[];selected=null;view='discover';message='';
}

const plate=(v=0)=>`<div class="thumb v${[0,1,2].includes(v)?v:0}"><div class="plate" aria-hidden="true"></div></div>`;
function header(){return `<header class="top"><div class="brand"><img src="./public/icon.svg" alt="">ByteBudget</div><select class="language" aria-label="${t('language')}" id="language">${languages.map(({code,name})=>`<option value="${code}" ${lang===code?'selected':''}>${name}</option>`).join('')}</select></header>${data?.demo?`<div class="notice">${t('demo')}</div>`:''}`}
function providerCredits(){
 const credits=new Map();for(const v of data?.venues||[])for(const a of v.attributions||[]){if(typeof a.provider!=='string')continue;let url;try{const u=new URL(a.providerUri);if(u.protocol==='https:')url=u.href}catch{}credits.set(a.provider,{name:a.provider,url});}
 return [...credits.values()].map(a=>`<p class="subtle">${a.url?`<a href="${esc(a.url)}" target="_blank" rel="noopener noreferrer">${esc(a.name)}</a>`:esc(a.name)}</p>`).join('');
}
function demoLocation(){return data?.demo?`<div class="location"><button id="location">${esc(data.city)}</button></div>`:''}
function mapsAttribution(){return data&&!data.demo?'<p class="maps-attribution" translate="no">Google Maps</p>':''}
function prepareFilters(){
 if(data?.pricingScope==='venue'){
  const hour=Number(new Intl.DateTimeFormat('en',{hour:'numeric',hourCycle:'h23',timeZone:data.timeZone}).format(new Date()));
  meal=hour<16?'lunch':'dinner';
 }
 const minute=Math.floor(Date.now()/60000);
 if(filterData===data&&filterMeal===meal&&filterMinute===minute)return;
 filterMinute=minute;
 filterData=data;filterMeal=meal;
 const now=Date.now(),sample=data?.citySample||data?.venues||[];
 const key=data?[data.city,data.currency,data.pricingScope,meal].join('|'):'';
 if(calibration?.key===key){
  bandsForMeal=calibration.bands;selectSpending=calibration.selector;
 }else{
  bandsForMeal=data?cityBands(sample,meal,data.currency,now,data.priceBands?.[meal],data.country):null;
  selectSpending=createSpendingSelector(bandsForMeal,sample,meal,data?.currency,now);
  if(bandsForMeal)calibration={key,bands:bandsForMeal,selector:selectSpending};
 }
 ranked=data?selectVenues(data.venues,{...data,radius:1000,includeClosed:false,includeUnknownHours:true,meal,now}).map(venue=>({
  venue,
  cap:cappedPrice(venue.price,data.currency)
 })):[];
}
function currentSpending(){prepareFilters();return selectSpending(spendingPosition)}
function priceText(selection){return selection.unlimited?'∞':Number.isFinite(selection.maxPrice)?money(selection.maxPrice):data?.pricingScope==='venue'?t('pricesUnavailable'):''}
function spendingText(selection){const amount=selection.unlimited?t('noLimit'):selection.maxPrice===undefined?'':`${t('upTo')} ${money(selection.maxPrice)} ${t('person')}`;return amount?`${t(selection.tier)} · ${amount}`:t(selection.tier)}
function bands(){
 const selection=currentSpending(),label=esc(spendingText(selection));
 return `<div class="spending-control"><span class="budget-caption">${t('upTo')}</span><output id="spending-price" class="spending-value" for="spending" dir="auto" aria-label="${label}">${priceText(selection)}</output><div class="range-surface"><input id="spending" dir="ltr" type="range" min="0" max="1000" step="1" value="${spendingPosition}" aria-label="${t('priceTier')}" aria-valuetext="${label}"></div><div class="tier-labels" aria-hidden="true">${PRICE_TIERS.map(key=>`<span data-tier-label="${key}" class="${selection.tier===key?'active':''}">${t(key)}</span>`).join('')}</div></div>`;
}
function radiusControl(){return `<div class="control"><label class="control-row" for="radius">${t('radius')}<output id="distance-label" class="badge">${radius} m</output></label><div class="range-surface"><input type="range" min="100" max="1000" step="50" id="radius" value="${radius}"></div><div class="ends"><span>100 m</span><span>1 km</span></div></div>`}
function discover(){return `${demoLocation()}<h1 class="tagline">${t('tag')}</h1><p class="subtle">${t('desc')}</p><div class="hero"><strong>${t('hero')}</strong>${data?.demo?'<div class="plate" aria-hidden="true"></div>':''}</div>${data?.pricingScope==='venue'?'':`<div class="segmented" aria-label="${t('lunch')} / ${t('dinner')}"><button data-meal="lunch" class="${meal==='lunch'?'active':''}" aria-pressed="${meal==='lunch'}">${t('lunch')}</button><button data-meal="dinner" class="${meal==='dinner'?'active':''}" aria-pressed="${meal==='dinner'}">${t('dinner')}</button></div>`}${bands()}${radiusControl()}<p class="status" role="status">${esc(message?t(message):'')}</p><button class="primary" id="search" ${busy?'disabled':''}>${t('find')}</button>${!data&&demoPreview?`<button class="secondary demo-switch" id="demo">${t('try')}</button>`:`<p class="subtle center">${data?.pricingScope==='venue'?t('venueEstimate'):t('priceNote')}</p>`}`}
function menuLabel(price){return t(price.meal==='dinner'?'dinnerTastingMenu':'tastingMenu')}
function priceQualifier(price){return price?.kind==='tasting-menu'?' · '+menuLabel(price):''}
function opening(v){return v.openingStatus==='unknown'?t('hoursUnknown'):v.isOpen?t('open'):t('closedNow')}
function photoMarkup(v,large=false){
 if(data?.demo)return plate(v.visual);
 if(!v.photo)return `<div class="venue-photo ${large?'large':''}"><span>${t('photoUnavailable')}</span></div>`;
 const url=new URL('/api/photo',window.BYTEBUDGET_CONFIG?.apiBase||location.origin);url.searchParams.set('name',v.photo.name);
 const credits=v.photo.authorAttributions.map(a=>a.uri?`<a href="${esc(a.uri)}" target="_blank" rel="noopener noreferrer">${esc(a.displayName)}</a>`:esc(a.displayName)).join(', ');
 return `<figure class="venue-photo-wrap ${large?'large':''}"><div class="venue-photo ${large?'large':''}"><span>${t('photoUnavailable')}</span><img data-venue-photo data-photo-url="${esc(url.href)}" hidden alt="${esc(v.name)}" loading="lazy" referrerpolicy="no-referrer"></div>${large&&credits?`<figcaption>${t('photoCredit')} ${credits}</figcaption>`:''}</figure>`;
}
function cardVersion(v){return JSON.stringify([v.name,v.currency,v.rating,v.reviewCount,v.price?.min,v.price?.max,v.price?.kind,v.isOpen,v.openingStatus,v.budgetUncertain,v.photo?.name])}
function cards(items){
 return items.map(v=>`<article class="card" data-card-id="${esc(v.id)}" data-card-version="${esc(cardVersion(v))}"><button class="card-open" data-id="${esc(v.id)}" aria-label="${esc(v.name)}">${photoMarkup(v)}<div><h3>${esc(v.name)}</h3><p><span class="star">★</span> <b>${v.rating.toFixed(1)}</b> (${v.reviewCount.toLocaleString(lang)})</p><p>${v.price?`${money(v.price.min)}–${money(v.price.max)}${priceQualifier(v.price)}`:t('pricesUnavailable')}</p>${v.budgetUncertain?`<p class="price-warning">${t('priceUncertain')}</p>`:''}<p class="subtle"><span data-distance="${esc(v.id)}">${Math.round(v.distance)} m</span> · <span class="${v.isOpen?'open':''}">${opening(v)}</span></p></div></button><button class="favorite" data-save-id="${esc(v.id)}" aria-label="${t(saved.includes(v.id)?'unsave':'save')} · ${esc(v.name)}" aria-pressed="${saved.includes(v.id)}"><span aria-hidden="true">${saved.includes(v.id)?'♥':'♡'}</span></button></article>`).join('');
}
function uncertainMarkup(){
 return alternatives.length?`<details class="budget-alternatives" id="budget-alternatives"><summary>${t('uncertainBudget')} (${alternatives.length})</summary><p class="subtle">${t('priceUncertain')}</p><div id="alternative-list">${cards(alternatives)}</div></details>`:'';
}
function resultMarkup(){
 if(results.length)return cards(results);
 if(busy)return '';
 return `<div class="empty"><h2>${t('empty')}</h2><p>${t('emptyText')}</p></div>`;
}
function filterDock(){return `<section class="filter-dock" aria-label="${t('priceTier')}"><div class="dock-inner">${radiusControl()}${bands()}</div></section>`}
function listing(){
 return `<h1 class="visually-hidden">${t('browse')}</h1><p class="status" role="status">${esc(message?t(message):'')}</p><div class="result-head"><p class="subtle" id="result-count">${results.length} · ${t('nearbyCount')}</p></div><div id="results-list">${resultMarkup()}</div><div id="uncertain-results">${uncertainMarkup()}</div>${mapsAttribution()}<p class="subtle">${t('walk')}</p>${!data.demo?`<p class="subtle">${t('venueEstimate')}</p>${providerCredits()}`:''}${filterDock()}`;
}
function detail(){const v=selected;return `<button class="back" id="back">← ${t('back')}</button>${data?.demo?`<div class="detail-hero"><div class="plate" aria-hidden="true"></div></div><span class="subtle">${t('illustration')}</span>`:photoMarkup(v,true)}<h1>${esc(v.name)}</h1><p><span class="star">★</span> <b>${v.rating.toFixed(1)}</b> (${v.reviewCount.toLocaleString(lang)})</p><div class="detail-price">${v.price?`${money(v.price.min)}–${money(v.price.max)}`:t('pricesUnavailable')}</div><p class="subtle">${v.price?.kind==='tasting-menu'?menuLabel(v.price):data?.pricingScope==='venue'?t('venueEstimate'):`${t('person')} · ${t(selectedMeal)}`}</p>${v.price?.kind==='tasting-menu'?`<a class="subtle" href="${esc(v.price.source)}" target="_blank" rel="noopener noreferrer">${t('menu')}</a>`:`<p class="subtle">${data?.pricingScope==='venue'?t('venueEstimate'):t('priceNote')}</p>`}<div class="facts"><span class="badge">⌖ ${Math.round(v.distance)} m</span><span class="badge">${opening(v)}</span></div><p>${esc(v.cuisine)}</p><h2>${t('menu')}</h2>${data?.pricingScope==='venue'?`<p class="subtle">${t('menusUnknown')}</p>`:''}${Array.isArray(v.menu)&&v.menu.length?v.menu.map(i=>`<div class="menu-row"><span>${esc(i.name)}</span><b>${money(i.price)}</b></div>`).join(''):`<p class="subtle">—</p>`}<div class="actions">${!data.demo?`<a data-place-link class="secondary" href="${esc(v.googleMapsUri||`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.name)}&query_place_id=${encodeURIComponent(v.id)}`)}" target="_blank" rel="noopener noreferrer">${t('viewPlace')}</a>${v.websiteUri?`<a class="secondary" href="${esc(v.websiteUri)}" target="_blank" rel="noopener noreferrer">${t('website')}</a>`:''}`:''}<button class="primary" id="route">↗ ${t('directions')}</button><button class="secondary" id="save">${saved.includes(v.id)?t('unsave'):t('save')}</button></div><p class="status" role="status">${esc(message?t(message):'')}</p><p class="subtle">${t('walk')} · ${t('route')}</p>${!data.demo?providerCredits():''}`}
function savedView(){const items=data?selectSavedVenues(knownDataset.venues,saved,{...data,radius:1000,meal,now:Date.now()}):[];return `<h1>${t('saved')}</h1>${items.length?cards(items):`<div class="empty"><h2>${t('noSaved')}</h2><p>${t('noSavedText')}</p></div>`}`}
function render(){if(gestureCount){pendingRender??=render;return}photoObserver?.disconnect();photoObserver=null;observedPhotos.clear();document.documentElement.lang=lang;document.documentElement.dir=direction(lang);app.innerHTML=`<div class="safe-area-top" aria-hidden="true"></div><main class="shell ${view==='results'?'with-filters':''}">${header()}${view==='detail'?detail():view==='results'?listing():view==='saved'?savedView():discover()}${view==='detail'||view==='saved'?mapsAttribution():''}<p class="center"><button class="back" id="about">${t('about')}</button></p><nav class="nav" aria-label="${t('discover')}"><button data-view="discover" class="${view!=='saved'?'active':''}"><span>⌕</span>${t('discover')}</button><button data-view="saved" class="${view==='saved'?'active':''}"><span>♡</span>${t('saved')}</button></nav></main><dialog id="dialog"></dialog>`;
app.querySelector('#language').disabled=busy&&!liveUpdates;
app.querySelector('#language').onchange=e=>{lang=e.target.value;write('bb-lang',lang);render()};
app.querySelectorAll('[data-meal]').forEach(b=>b.onclick=()=>{meal=b.dataset.meal;render()});
app.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view==='discover'&&data?'results':b.dataset.view;message='';render();scrollTo(0,0)});

const on=(id,fn)=>{const el=app.querySelector('#'+id);if(el)el.onclick=fn};
on('location',chooseLocation);on('demo',chooseLocation);on('about',()=>showDialog(`<h2>${t('about')}</h2><p class="privacy">${t('privacy')}</p>${!data?.demo?`<p class="privacy">${t('livePrivacy')}</p>`:''}<p class="privacy">${t(data?.pricingScope==='venue'?'rankNearby':'rank')}</p>`));on('edit',()=>{view='discover';render()});on('back',()=>{view=detailReturnView;message='';render()});on('search',()=>data?.demo?search():locate(true));
const spendingInput=app.querySelector('#spending');
const rad=app.querySelector('#radius');
if(spendingInput){
 spendingInput.oninput=e=>{spendingPosition=Number(e.target.value);scheduleFilters()};
 spendingInput.onchange=()=>{write('bb-spending-position',spendingPosition);updateFilters()};
 bindRangeGesture(spendingInput,onGesture);
}
if(rad){
 rad.oninput=e=>{radius=Number(e.target.value);scheduleFilters()};
 rad.onchange=updateFilters;
 bindRangeGesture(rad,onGesture);
}

bindCards();
on('save',()=>{toggleSaved(selected.id);render()});
on('route',()=>{if(data.demo){message='demoRoute';render();return}window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selected.lat+','+selected.lng)}&travelmode=walking`,'_blank','noopener,noreferrer')});}
function bindCards(){app.querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>{const pool=view==='saved'?selectSavedVenues(knownDataset.venues,saved,{...data,radius:1000,meal,now:Date.now()}):[...results,...alternatives];selected=pool.find(v=>v.id===b.dataset.id);selectedMeal=view==='results'?(lastSearch?.criteria.meal||meal):meal;detailReturnView=view;view='detail';message='';render();scrollTo(0,0)});if(gestureCount)return;const images=app.querySelectorAll('[data-venue-photo]');
 app.querySelectorAll('[data-save-id]').forEach(button=>button.onclick=()=>toggleSaved(button.dataset.saveId));
 const load=img=>{
 img.onerror=()=>{img.hidden=true};const url=new URL(img.dataset.photoUrl);url.searchParams.set('format','json');
 if(!photoLoads.has(url.href))photoLoads.set(url.href,fetch(url.href,{signal:AbortSignal.timeout(12000)}).then(async r=>{if(!r.ok)throw Error();const p=await r.json();const u=new URL(p.photoUri);if(u.protocol!=='https:'||!(u.hostname.endsWith('.googleusercontent.com')||u.hostname.endsWith('.ggpht.com')))throw Error();return u.href}).catch(()=>null));
 photoLoads.get(url.href).then(src=>{if(src&&img.isConnected){img.src=src;img.hidden=false}});
 };
 if(view==='detail'||typeof IntersectionObserver!=='function')images.forEach(load);
 else{
  if(!photoObserver)photoObserver=new IntersectionObserver(entries=>{
   for(const entry of entries)if(entry.isIntersecting){
    photoObserver.unobserve(entry.target);
    load(entry.target.querySelector('[data-venue-photo]'));
   }
  },{rootMargin:'120px'});
  for(const node of observedPhotos)if(!node.isConnected){photoObserver.unobserve(node);observedPhotos.delete(node)}
  images.forEach(img=>{if(!observedPhotos.has(img.parentElement)){observedPhotos.add(img.parentElement);photoObserver.observe(img.parentElement)}});
 }}
function toggleSaved(id){
 saved=saved.includes(id)?saved.filter(value=>value!==id):[...saved,id];
 write('bb-saved',saved);
 app.querySelectorAll('[data-save-id]').forEach(button=>{
  if(button.dataset.saveId!==id)return;
  const venue=knownDataset?.venues.find(venue=>venue.id===id);
  button.setAttribute('aria-pressed',String(saved.includes(id)));
  button.setAttribute('aria-label',t(saved.includes(id)?'unsave':'save')+' · '+(venue?.name||''));
  button.querySelector('span').textContent=saved.includes(id)?'♥':'♡';
 });
 if(view==='saved')render();
}
function reconcileCards(container,items){
 const existing=new Map([...container.querySelectorAll(':scope > [data-card-id]')].map(card=>[card.dataset.cardId,card]));
 let cursor=container.firstElementChild;
 for(const venue of items){
  let card=existing.get(venue.id);
  if(!card){
   const fragment=document.createElement('div');
   fragment.innerHTML=cards([venue]);
   card=fragment.firstElementChild;
  }else{
   existing.delete(venue.id);
   if(card.dataset.cardVersion!==cardVersion(venue)){
    const fragment=document.createElement('div');fragment.innerHTML=cards([venue]);
    card.innerHTML=fragment.firstElementChild.innerHTML;
    card.dataset.cardVersion=cardVersion(venue);
   }else card.querySelector('[data-distance]').textContent=Math.round(venue.distance)+' m';
  }
  if(card!==cursor)container.insertBefore(card,cursor);
  cursor=card.nextElementSibling;
 }
 for(const card of existing.values())card.remove();
}
function onGesture(active){
 gestureCount+=active?1:-1;
 if(gestureCount)return;
 const applyData=pendingDataApply,applyPosition=pendingPositionApply;
 pendingDataApply=null;pendingPositionApply=null;
 applyData?.();applyPosition?.();
 if(pendingRender){
  const apply=pendingRender;
  pendingRender=null;
  apply();
 }else bindCards();
}
function scheduleFilters(){
 if(filterFrame)return;
 filterFrame=true;
 frame(()=>{filterFrame=false;updateFilters()});
}
function updateFilters(){
 const spendingInput=app.querySelector('#spending');
 if(!spendingInput)return;
 const selection=currentSpending(),label=spendingText(selection);
 const setText=(element,text)=>{if(element.textContent!==text)element.textContent=text};
 const priceOutput=app.querySelector('#spending-price');
 setText(priceOutput,priceText(selection));
 priceOutput.setAttribute('aria-label',label);
 spendingInput.setAttribute('aria-valuetext',label);
 app.querySelectorAll('[data-tier-label]').forEach(el=>el.classList.toggle('active',el.dataset.tierLabel===selection.tier));
 setText(app.querySelector('#distance-label'),radius+' m');
 if(data&&liveUpdates&&['','approximateLocation'].includes(message)){
  message=data.locationAccuracy>radius/2?'approximateLocation':'';
  const status=app.querySelector('.status');if(status)status.textContent=message?t(message):'';
 }
 if(view!=='results'||!data.demo&&data.pricingScope!=='venue')return;
 computeResults();
 setText(app.querySelector('#result-count'),results.length+' · '+t('nearbyCount'));
 const list=app.querySelector('#results-list');
 if(results.length){
  if(list.querySelector('.empty'))list.innerHTML='';
  reconcileCards(list,results);
 }else if(!list.querySelector('.empty'))list.innerHTML=resultMarkup();
 const alternate=app.querySelector('#uncertain-results');
 if(alternatives.length){
  if(!alternate.querySelector('details'))alternate.innerHTML=uncertainMarkup();
  else{
   alternate.querySelector('summary').textContent=t('uncertainBudget')+' ('+alternatives.length+')';
   reconcileCards(alternate.querySelector('#alternative-list'),alternatives);
  }
 }else alternate.innerHTML='';
 bindCards();
}
function computeResults(){
 const selection=currentSpending();
 const inRadius=ranked.filter(({venue})=>venue.distance<=radius);
 results=inRadius.filter(({cap})=>selection.maxPrice==null||cap<=selection.maxPrice).map(({venue})=>venue);
 alternatives=inRadius.filter(({venue,cap})=>selection.maxPrice!=null&&cap>selection.maxPrice&&venue.price.min<=selection.maxPrice)
  .map(({venue})=>({...venue,budgetUncertain:true}));
 if(data.pricingScope==='venue'){
  results.sort((a,b)=>{
   if(a.distance<=CLOSE_BY_DISTANCE||b.distance<=CLOSE_BY_DISTANCE)return a.distance-b.distance;
   return b.score-a.score||a.distance-b.distance||a.id.localeCompare(b.id);
  });
 }
 lastSearch=makeSearchSnapshot(results,{meal,...selection,radius,city:data.city,currency:data.currency});
}
function search(){computeResults();view='results';message=busy?'loadingNearby':'';render();scrollTo(0,0)}
function showDialog(html){const d=app.querySelector('#dialog');d.innerHTML=html+`<button class="secondary" id="close-dialog">${t('close')}</button>`;d.querySelector('#close-dialog').onclick=()=>d.close();d.showModal()}
function chooseLocation(){if(!__BYTEBUDGET_ALLOW_DEMO__||!demoPreview)return;showDialog(`<h2>${t('choose')}</h2><p class="notice">${t('demo')}</p><select id="demo-city" aria-label="${t('choose')}"><option>London</option><option>Bologna</option><option>Tokyo</option></select><button class="primary" id="set-city">${t('done')}</button>`);app.querySelector('#set-city').onclick=()=>{setData(demoCity(app.querySelector('#demo-city').value));render()}}
async function locate(refresh=false,automatic=false){
 if(liveUpdates&&data&&!data.demo){view='results';computeResults();render();return}
 if(busy)return;
 busy=true;message='loading';render();
 const native=Capacitor.isNativePlatform(),apiBase=window.BYTEBUDGET_CONFIG?.apiBase;
 let previewShown=false;
 const applyDataset=(next,preview)=>{
  const validated=validateDataset(next);
  const apply=()=>{
   const previousMeal=meal,previousView=view,previousSelection=selected;
   setData(validated);meal=previousMeal;
   if(previewShown){
    view=previousView;selected=previousSelection;
    if(view==='results')computeResults();
    render();
   }else if(automatic||refresh)search();else render();
   if(preview)previewShown=true;
  };
  if(gestureCount)pendingRender=apply;else apply();
 };
 try{
  const ios=Capacitor.getPlatform()==='ios';
  const acquirePosition=ios
   ?()=>getIosForegroundPosition(Geolocation,radius)
   :()=>getForegroundPosition(options=>Geolocation.getCurrentPosition(options),radius,{preciseOnly:native});
  const next=await loadLiveRestaurants({origin:location.origin,automatic,native,nativeNearby:ios,apiBase,radius,nearbyRadius:1000,spendingPosition,meal,language:lang,locate:acquirePosition,onPosition:()=>{
   message='loadingNearby';
   const status=app.querySelector('.status');
   if(status)status.textContent=t(message);
  },onNearby:automatic?next=>applyDataset(next,true):undefined});
  busy=false;
  applyDataset(next,false);
 }catch(e){
  pendingRender=null;
  const key={provider_not_configured:'noProvider',price_bands_unavailable:'unknown',city_not_supported:'coverage',no_verified_menus:'noMenus',search_too_broad:'broad',rate_limited:'limited',provider_budget_exhausted:'searchQuotaReached',location_denied:'permission',location_unavailable:'locationUnavailable',location_imprecise:'imprecise'}[e.code]||'error';
  busy=false;message=demoPreview&&data?.demo?'':key;render();
 }
}

function liveError(error){
 busy=false;
 message={location_denied:'permission',location_unavailable:'locationUnavailable',provider_budget_exhausted:'searchQuotaReached',rate_limited:'limited',provider_not_configured:'noProvider'}[error.code]||'error';
 liveFailure=message;render();
}
function stopLocationWatch(){
 watchGeneration++;
 const registration=watchRegistration;
 watchRegistration=null;
 registration?.then(id=>Geolocation.clearWatch({id})).catch(()=>{});
}
async function startLocationWatch(){
 const generation=++watchGeneration;
 let refineTimer,best,hasPosition=false;
 try{
  if(Capacitor.isNativePlatform()&&typeof Geolocation.checkPermissions==='function'){
   let permission=await Geolocation.checkPermissions();
   if(permission.location==='prompt'||permission.location==='prompt-with-rationale')permission=await Geolocation.requestPermissions();
   if(permission.location!=='granted')throw Object.assign(new Error('Denied'),{code:'location_denied'});
  }
  if(generation!==watchGeneration)return;
  watchRegistration=Promise.resolve(Geolocation.watchPosition({enableHighAccuracy:true,maximumAge:60000,timeout:14000,minimumUpdateInterval:1000},(position,error)=>{
   if(generation!==watchGeneration)return;
   if(error){
    if([1,'OS-PLUG-GLOC-0003','OS-PLUG-GLOC-0007','OS-PLUG-GLOC-0008'].includes(error.code)){
     clearTimeout(refineTimer);liveUpdates.stop();stopLocationWatch();liveError({code:'location_denied'});
    }else if(!hasPosition)liveError({code:'location_unavailable'});
    return;
   }
   if(!position?.coords||position.coords.accuracy>250||position.coords.accuracy<0)return;
   if(Number.isFinite(position.timestamp)&&Date.now()-position.timestamp>60000)return;
   if(!hasPosition){
    if(!best||position.coords.accuracy<best.coords.accuracy)best=position;
    if(best.coords.accuracy>75){
     refineTimer??=setTimeout(()=>{
      if(generation!==watchGeneration)return;
      hasPosition=true;liveUpdates.position(best);
     },300);
     return;
    }
    clearTimeout(refineTimer);hasPosition=true;
   }
   liveUpdates.position(position);
  }));
  watchRegistration.catch(error=>{if(generation===watchGeneration)liveError(error)});
 }catch(error){if(generation===watchGeneration)liveError(error)}
}
function startLiveMode(){
 if(typeof Geolocation.watchPosition!=='function')return false;
 const native=Capacitor.isNativePlatform(),apiBase=window.BYTEBUDGET_CONFIG?.apiBase;
 liveUpdates=createLiveUpdates({
  search:async(position,onNearby,{extended})=>loadLiveRestaurants({
   origin:location.origin,native,nativeNearby:native,automatic:true,apiBase,radius,nearbyRadius:1000,
   spendingPosition,meal,language:lang,locate:async()=>position,onNearby,quick:!extended
  }),
  onPosition(position){
   if(!data){busy=true;message='loadingNearby';render();return}
   const apply=()=>{
    data={...data,lat:position.coords.latitude,lng:position.coords.longitude,locationAccuracy:position.coords.accuracy};
    message=liveFailure||(position.coords.accuracy>radius/2?'approximateLocation':'');
    if(view==='results')updateFilters();
    const status=app.querySelector('.status');if(status)status.textContent=message?t(message):'';
   };
   if(gestureCount)pendingPositionApply=apply;else apply();
  },
  onDataset(next,partial){
   const validated=validateDataset(next);
   const apply=()=>{
    const previousView=view,previousSelection=selected,first=!data;
    data=mergeCityDataset(data,validated);
    knownDataset=mergeCityDataset(knownDataset,data);
    busy=partial;liveFailure='';
    message=data.locationAccuracy>radius/2?'approximateLocation':partial?'loadingNearby':'';
    if(first||view==='discover'){
     view='results';computeResults();render();
    }else if(previousView==='results')updateFilters();
    else{selected=previousSelection}
    const status=app.querySelector('.status');if(status)status.textContent=message?t(message):'';
   };
   if(gestureCount)pendingDataApply=apply;else apply();
  },
  onError:liveError
 });
 const updateClock=()=>{
  if(document.visibilityState==='hidden')return;
  if(view==='results')updateFilters();
  localTick=setTimeout(updateClock,15000);localTick?.unref?.();
 };
 busy=true;message='loading';render();void startLocationWatch();updateClock();
 document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='hidden'){clearTimeout(localTick);liveUpdates.stop();stopLocationWatch()}
  else{liveUpdates.resume();void startLocationWatch();updateClock()}
 });
 return true;
}
async function start(){
 if(__BYTEBUDGET_ALLOW_DEMO__){
  render();demoPreview=await discoverDemoPreview({marker:demoPreview,native:Capacitor.isNativePlatform()});
  const initialDemo=initialDemoDataset(demoPreview,read('bb-demo-city',null));
  if(initialDemo){setData(initialDemo);render();return}
 }
 if(!startLiveMode())await locate(false,true);
}
start();if('serviceWorker'in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
