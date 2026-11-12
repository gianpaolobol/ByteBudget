import pilotCatalog from '../public/open-pilot-catalog.json' with {type:'json'};
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {build} from 'esbuild';
import {parseHTML} from 'linkedom';
const now=new Date().toISOString();
const venue=(id,tier,max,extra={})=>({id,name:id,lat:44.49,lng:11.34,currency:'EUR',rating:4.5,reviewCount:20,isOpen:true,openingStatus:'open',sourceTier:tier,prices:{},venuePrice:{min:max-5,max,updatedAt:now,source:'Google Maps priceRange',scope:'venue-estimate'},...extra});
async function boot({observer=false,ios=false,venues,nearbyResponse,openPilot=false,websiteStatus=200}={}){
 const requests=[],observers=[],posted=[],routes=[];let receivePosition;
 const {window,document}=parseHTML('<html><body><div id="app"></div></body></html>');
 const values=new Map([['bb-spending-position','450']]);const dataset={city:'Valsamoggia',country:'IT',currency:'EUR',timeZone:'Europe/Rome',lat:44.49,lng:11.34,demo:false,pricingScope:'venue',venues:[venue('Unknown price','high',40,{venuePrice:undefined}),venue('Cheap cafe','low',15,{photo:{name:'places/cheap/photos/real',authorAttributions:[{displayName:'Real author',uri:'https://maps.google.com/maps/contrib/1'}]}}),venue('Mid restaurant','high',40,{isOpen:false,openingStatus:'closed',websiteUri:'https://example.com',googleMapsUri:'https://maps.google.com/?cid=123'})]};
 if(venues)dataset.venues=venues;
 window.open=url=>routes.push(url);
 window.HTMLElement.prototype.showModal=function(){this.setAttribute('open','')};
 window.BYTEBUDGET_CONFIG={apiBase:'https://bb.test'};
 const nativePlatform=ios?'ios':'android';
 const geolocation=ios?`export const Geolocation={
  checkPermissions:async()=>({location:'granted'}),
  watchPosition:async(options,receive)=>{
   recordWatch(receive);
   receive({coords:{latitude:44.5,longitude:11.35,accuracy:600}});
   receive({coords:{latitude:44.49,longitude:11.34,accuracy:5}});
   return 'test-watch';
  },
  clearWatch:async()=>{}
 }`:'export const Geolocation={getCurrentPosition:async()=>({coords:{latitude:44.49,longitude:11.34,accuracy:5}})}';
 const {outputFiles}=await build({entryPoints:['src/app.js'],bundle:true,write:false,format:'iife',define:{__BYTEBUDGET_ALLOW_DEMO__:'false',__BYTEBUDGET_OPEN_PILOT__:String(openPilot)},plugins:[{name:'native-boundary',setup(b){b.onResolve({filter:/^@capacitor\/(core|geolocation)$/},a=>({path:a.path,namespace:'native-test'}));b.onLoad({filter:/.*/,namespace:'native-test'},a=>({contents:a.path.endsWith('/core')?`export const Capacitor={isNativePlatform:()=>true,getPlatform:()=>'${nativePlatform}'};export const CapacitorHttp={head:async()=>({status:${websiteStatus}})}`:geolocation}));}}]});
 const context={window,document,console,Intl,Date,URL,crypto,AbortSignal,TextDecoder,setTimeout,clearTimeout,recordWatch:receive=>{receivePosition=receive},scrollTo(){},navigator:{languages:['en']},location:{origin:'https://localhost',protocol:'https:'},localStorage:{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)},fetch:async (url,options)=>{requests.push(String(url));if(options?.method==='POST'){posted.push(JSON.parse(options.body));if(nearbyResponse)return nearbyResponse(dataset)}return Response.json(String(url).includes('/api/photo?')?{photoUri:'https://lh3.googleusercontent.com/genuine-image'}:String(url).endsWith('/api/status')?{configured:true,mode:'nearby'}:dataset)}};
 if(observer)context.IntersectionObserver=class{constructor(callback){this.callback=callback;this.targets=[];observers.push(this)}observe(el){this.targets.push(el)}unobserve(){}disconnect(){}};
 vm.runInNewContext(outputFiles[0].text,context);
 for(let i=0;i<100&&!document.querySelector('.result-head');i++)await new Promise(r=>setTimeout(r,5));
 return {document,window,requests,observers,posted,routes,values,emitPosition:position=>receivePosition(position)};
}
test('discovery ignores old slider settings and ranks by tier and value',async()=>{
 const {document,posted}=await boot({ios:true,venues:[
  venue('Low farther','low',12,{lat:44.495,rating:4.9,reviewCount:400}),
  venue('Low best value','low',10,{lat:44.4902,rating:4.8,reviewCount:300}),
  venue('Low costly','low',19,{lat:44.4902,rating:4.8,reviewCount:300}),
  venue('Low weak rating','low',10,{lat:44.4902,rating:3.2,reviewCount:300}),
  venue('Mid','mid',35),venue('High','high',80),venue('Luxury','luxury',150),
  venue('Closed','low',10,{isOpen:false,openingStatus:'closed'}),
  venue('Unknown','mid',40,{venuePrice:undefined}),
 ]});
 assert.deepEqual([...document.querySelectorAll('#results-list .card h3')].map(e=>e.textContent),
  ['Low best value','Low costly','Low weak rating','Low farther','Mid','High','Luxury']);
 assert.equal(document.querySelector('input[type=range]'),null);
 assert.equal(posted[0].radius,1000);
 assert.equal(Object.hasOwn(posted[0],'spendingPosition'),false);
});

test('offscreen thumbnail loads only when observed and reuses its request',async()=>{
 const {requests,observers}=await boot({observer:true});
 const observer=observers.at(-1),target=observer.targets[0];
 assert.equal(requests.filter(u=>u.includes('/api/photo?')).length,0);
 observer.callback([{isIntersecting:true,target}]);
 await new Promise(r=>setTimeout(r,10));
 observer.callback([{isIntersecting:true,target}]);
 await new Promise(r=>setTimeout(r,10));
 assert.equal(requests.filter(u=>u.includes('/api/photo?')).length,1);
});

test('iPhone startup searches once with the precise fix, skipping an earlier coarse position',async()=>{
 const {document,posted}=await boot({ios:true});
 assert.equal(document.querySelector('.card h3')?.textContent,'Cheap cafe');
 assert.equal(posted.length,1);
 assert.equal(posted[0].lat,44.49);
 assert.equal(posted[0].lng,11.34);
});

test('favorites can be toggled from a preview without opening the detail',async()=>{
 const {document}=await boot();
 const heart=document.querySelector('.favorite'),card=document.querySelector('.card');
 heart.onclick();
 assert.equal(heart.getAttribute('aria-pressed'),'true');
 assert.equal(document.querySelector('.card'),card);
 assert.equal(document.querySelector('#route'),null);
 heart.onclick();
 assert.equal(heart.getAttribute('aria-pressed'),'false');
});

test('GPS movement reorders nearby venues and removes out-of-range cards without a new request',async()=>{
 const {document,emitPosition,posted}=await boot({ios:true,venues:[
  venue('Start venue','mid',30),venue('Next venue','mid',30,{lat:44.497})
 ]});
 const names=()=>[...document.querySelectorAll('#results-list .card h3')].map(e=>e.textContent);
 assert.deepEqual(names(),['Start venue','Next venue']);
 emitPosition({timestamp:Date.now(),coords:{latitude:44.496,longitude:11.34,accuracy:12}});
 assert.deepEqual(names(),['Next venue','Start venue']);
 emitPosition({timestamp:Date.now(),coords:{latitude:44.500,longitude:11.34,accuracy:12}});
 assert.deepEqual(names(),['Next venue']);
 assert.equal(posted.length,1);
});

test('iPhone displays the first live cards while coverage is still arriving',async()=>{
 let finish;
 const first=venue('Nearest restaurant','mid',30);
 const later=venue('Second restaurant','mid',30,{lat:44.491});
 const {document,requests}=await boot({ios:true,venues:[first,later],nearbyResponse:dataset=>{
  const body=new ReadableStream({start(controller){
   const send=record=>controller.enqueue(new TextEncoder().encode(JSON.stringify(record)+'\n'));
   send({stage:'nearby',data:{...dataset,venues:[first]}});
   finish=()=>{send({stage:'complete',status:200,data:dataset});controller.close()};
  }});
  return new Response(body,{headers:{'Content-Type':'application/x-ndjson'}});
 }});
 assert.equal(document.querySelector('.card h3')?.textContent,first.name);
 assert.match(document.querySelector('.status').textContent,/Location found/);
 assert.equal(document.querySelectorAll('.card').length,1);
 finish();
 for(let i=0;i<20&&document.querySelectorAll('.card').length<2;i++)await new Promise(r=>setTimeout(r,5));
 assert.equal(document.querySelectorAll('.card').length,2);
 assert.equal(document.querySelector('.status').textContent,'');
 assert.deepEqual(requests,['https://bb.test/api/nearby']);
});

test('live price updates stay hidden without replacing a card in the same tier',async()=>{
 let finish;
 const initial=venue('Price changes','mid',30);
 const updated=venue('Price changes','mid',40);
 const {document}=await boot({ios:true,nearbyResponse:dataset=>{
  const body=new ReadableStream({start(controller){
   const send=record=>controller.enqueue(new TextEncoder().encode(JSON.stringify(record)+'\n'));
   send({stage:'nearby',data:{...dataset,venues:[initial]}});
   finish=()=>{send({stage:'complete',status:200,data:{...dataset,venues:[updated]}});controller.close()};
  }});
  return new Response(body,{headers:{'Content-Type':'application/x-ndjson'}});
 }});
 const card=document.querySelector('.card');
 assert.doesNotMatch(card.textContent,/30/);
 finish();
 await new Promise(r=>setTimeout(r,5));
 assert.equal(document.querySelector('.card'),card);
 assert.doesNotMatch(card.textContent,/40/);
});

test('distance stays current when a live price response arrives',async()=>{
 let finish;
 const initial=venue('Moving price','mid',30),updated=venue('Moving price','mid',40);
 const {document,emitPosition}=await boot({ios:true,nearbyResponse:dataset=>{
  const body=new ReadableStream({start(controller){
   const send=record=>controller.enqueue(new TextEncoder().encode(JSON.stringify(record)+'\n'));
   send({stage:'nearby',data:{...dataset,venues:[initial]}});
   finish=()=>{send({stage:'complete',status:200,data:{...dataset,venues:[updated]}});controller.close()};
  }});
  return new Response(body,{headers:{'Content-Type':'application/x-ndjson'}});
 }});
 emitPosition({timestamp:Date.now(),coords:{latitude:44.4908,longitude:11.34,accuracy:12}});
 finish();await new Promise(r=>setTimeout(r,5));
 assert.doesNotMatch(document.querySelector('#results-list .card').textContent,/40/);
 assert.match(document.querySelector('[data-distance]').textContent,/89 m/);
});

test('open data beta discovers both sources offline and updates coverage as GPS moves',async()=>{
 const {document,requests,routes,emitPosition}=await boot({ios:true,openPilot:true});
 assert.equal(document.querySelector('.notice'),null);
 assert.equal(document.querySelector('.maps-attribution'),null);
 assert.ok(document.querySelector('#credits'));
 const names=()=>[...document.querySelectorAll('#results-list .card h3')].map(e=>e.textContent);
 assert.ok(names().length>100);
 assert.ok(names().includes('Sombrero Bologna'));
 assert.equal(document.querySelector('#results-list .star'),null);
 assert.doesNotMatch(document.querySelector('.card').textContent,/price|hours/i);
 const first=document.querySelector('.card');
 first.querySelector('.favorite').onclick();
 assert.equal(first.querySelector('.favorite').getAttribute('aria-pressed'),'true');
 first.querySelector('.card-open').onclick();
 assert.equal(document.querySelector('[data-place-link]'),null);
 assert.equal(document.querySelector('#about'),null);
 assert.match(document.querySelector('[data-detail-distance]').textContent,/\d+ m/);
 const heart=document.querySelector('.detail-title .favorite');
 assert.equal(heart.getAttribute('aria-pressed'),'true');
 heart.onclick();
 assert.equal(heart.getAttribute('aria-pressed'),'false');
 assert.ok(heart.getAttribute('aria-label').endsWith(document.querySelector('.detail-title h1 > span').textContent));
 const previousDistance=document.querySelector('[data-detail-distance]').textContent;
 emitPosition({timestamp:Date.now(),coords:{latitude:44.4908,longitude:11.34,accuracy:10}});
 assert.notEqual(document.querySelector('[data-detail-distance]').textContent,previousDistance);
 document.querySelector('#route').onclick();
 assert.equal(new URL(routes[0]).hostname,'maps.apple.com');
 assert.equal(new URL(routes[0]).searchParams.get('dirflg'),'w');
 document.querySelector('#back').onclick();

 emitPosition({timestamp:Date.now(),coords:{latitude:44.3919473,longitude:11.0745599,accuracy:10}});
 assert.ok(names().length>2 && names().length<20);
 emitPosition({timestamp:Date.now(),coords:{latitude:45.4,longitude:11.2,accuracy:10}});
 assert.equal(names().length,0);
 assert.match(document.querySelector('.status').textContent,/outside the beta areas/);
 assert.deepEqual(requests,[]);
});

test('category rail uses the card pictograms and keeps the selection while walking',async()=>{
 const {document,requests,emitPosition}=await boot({ios:true,openPilot:true});
 const buttons=[...document.querySelectorAll('[data-category-filter]')];
 const all=buttons[0],pizza=buttons.find(button=>button.dataset.categoryFilter==='pizza');
 const cards=()=>[...document.querySelectorAll('#results-list .card')];
 const assertPizza=()=>{
  assert.ok(cards().length>0);
  const icon=pizza.querySelector('svg').innerHTML;
  assert.ok(cards().every(card=>card.querySelector('.category-mark svg').innerHTML===icon));
  assert.equal(pizza.getAttribute('aria-pressed'),'true');
 };
 const count=cards().length;
 assert.equal(all.dataset.categoryFilter,'all');
 assert.equal(all.getAttribute('aria-pressed'),'true');
 assert.equal(document.querySelector('.card .venue-photo'),null);
 pizza.onclick();
 assertPizza();
 assert.ok(cards().length<count);
 const before=cards()[0].querySelector('[data-distance]').textContent;
 emitPosition({timestamp:Date.now(),coords:{latitude:44.4904,longitude:11.34,accuracy:10}});
 assertPizza();
 assert.notEqual(cards()[0].querySelector('[data-distance]').textContent,before);
 all.onclick();
 assert.ok(cards().length>100);
 assert.equal(all.getAttribute('aria-pressed'),'true');
 assert.equal(pizza.getAttribute('aria-pressed'),'false');
 assert.deepEqual(requests,[]);
});

test('gelaterias, pastry shops and delis have their own filters and card icons',async()=>{
 const {document,requests}=await boot({ios:true,openPilot:true});
 const buttons=[...document.querySelectorAll('[data-category-filter]')];
 assert.equal(buttons.length,15);
 assert.equal(buttons[0].dataset.categoryFilter,'all');
 for(const key of ['ice_cream','pastry','deli']){
  const button=buttons.find(item=>item.dataset.categoryFilter===key);
  button.onclick();
  const cards=[...document.querySelectorAll('#results-list .card')];
  assert.ok(cards.length>0,key);
  assert.ok(cards.every(card=>card.querySelector('.category-mark svg').innerHTML===button.querySelector('svg').innerHTML),key);
 }
 assert.deepEqual(requests,[]);
});

test('piadina, burgers, sushi, cocktail bars and takeaway use separate filters and confirmed data',async()=>{
 const {document,requests}=await boot({ios:true,openPilot:true});
 const byId=new Map(pilotCatalog.venues.map(venue=>[venue.id,venue]));
 for(const key of ['piadina','burger','sushi','cocktail','takeaway']){
  const button=document.querySelector(`[data-category-filter="${key}"]`);
  button.onclick();
  const cards=[...document.querySelectorAll('#results-list .card')];
  assert.ok(cards.length>0,key);
  for(const card of cards){
   const venue=byId.get(card.dataset.cardId);
   if(key==='cocktail') assert.equal(card.querySelector('.category-mark svg').innerHTML,button.querySelector('svg').innerHTML);
   assert.ok(key==='takeaway'?venue.takeaway===true:venue.category===key,venue.name);
  }
 }
 assert.deepEqual(requests,[]);
});


test('Android opens walking directions in Google Maps and hides confirmed broken websites',async()=>{
 for(const status of [200,404,410,503]){
  const {document,routes}=await boot({websiteStatus:status,venues:[
   venue('Osteria','mid',30,{websiteUri:'https://example.com/osteria'}),
  ]});
  document.querySelector('.card-open').onclick();
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(Boolean(document.querySelector('#venue-website')),status!==404&&status!==410);
  document.querySelector('#route').onclick();
  const route=new URL(routes[0]);
  assert.equal(route.hostname,'www.google.com');
  assert.equal(route.pathname,'/maps/dir/');
  assert.equal(route.searchParams.get('destination'),'44.49,11.34');
  assert.equal(route.searchParams.get('travelmode'),'walking');
 }
});

test('the plus adds a local venue with a chosen category and links to the mapped position',async()=>{
 const {document,values,requests,emitPosition}=await boot({ios:true,openPilot:true});
 const name='A new sushi venue';
 assert.equal(document.querySelector('.category-rail').lastElementChild.id,'add-venue');
 document.querySelector('#add-venue').onclick();
 const form=document.querySelector('#venue-form');
 form.querySelector('#venue-name').value=name;
 form.querySelector('#venue-category option[value="sushi"]').selected=true;
 form.onsubmit({preventDefault(){}});
 assert.equal(document.querySelector('.detail-title h1 > span').textContent,name);
 assert.equal(document.querySelector('.detail-title').firstElementChild.classList.contains('category-mark'),true);
 assert.equal(document.querySelector('.detail-title h1 > span').nextElementSibling.className,'favorite');
 const editor=document.querySelector('a[href*="openstreetmap.org/edit"]');
 assert.equal(new URL(editor.href).hash,'#map=20/44.490000/11.340000');
 assert.match(document.querySelector('[data-detail-distance]').textContent,/0 m/);
 assert.equal(JSON.parse(values.get('bb-local-venues'))[0].category,'sushi');
 document.querySelector('#back').onclick();
 assert.ok([...document.querySelectorAll('.card h3')].some(el=>el.textContent===name));
 emitPosition({timestamp:Date.now(),coords:{latitude:44.3919473,longitude:11.0745599,accuracy:10}});
 assert.ok(![...document.querySelectorAll('.card h3')].some(el=>el.textContent===name));
 assert.deepEqual(requests,[]);
});
