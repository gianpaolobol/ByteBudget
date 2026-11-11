import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {build} from 'esbuild';
import {parseHTML} from 'linkedom';
const now=new Date().toISOString();
const venue=(id,tier,max,extra={})=>({id,name:id,lat:44.49,lng:11.34,currency:'EUR',rating:4.5,reviewCount:20,isOpen:true,openingStatus:'open',sourceTier:tier,prices:{},venuePrice:{min:max-5,max,updatedAt:now,source:'Google Maps priceRange',scope:'venue-estimate'},...extra});
async function boot({observer=false,ios=false,venues,nearbyResponse}={}){
 const requests=[],observers=[],posted=[];let receivePosition;
 const {window,document}=parseHTML('<html><body><div id="app"></div></body></html>');
 const values=new Map([['bb-spending-position','450']]);const dataset={city:'Valsamoggia',country:'IT',currency:'EUR',timeZone:'Europe/Rome',lat:44.49,lng:11.34,demo:false,pricingScope:'venue',venues:[venue('Unknown price','high',40,{venuePrice:undefined}),venue('Cheap cafe','low',15,{photo:{name:'places/cheap/photos/real',authorAttributions:[{displayName:'Real author',uri:'https://maps.google.com/maps/contrib/1'}]}}),venue('Mid restaurant','high',40,{isOpen:false,openingStatus:'closed',websiteUri:'https://example.com',googleMapsUri:'https://maps.google.com/?cid=123'})]};
 if(venues)dataset.venues=venues;
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
 const {outputFiles}=await build({entryPoints:['src/app.js'],bundle:true,write:false,format:'iife',define:{__BYTEBUDGET_ALLOW_DEMO__:'false'},plugins:[{name:'native-boundary',setup(b){b.onResolve({filter:/^@capacitor\/(core|geolocation)$/},a=>({path:a.path,namespace:'native-test'}));b.onLoad({filter:/.*/,namespace:'native-test'},a=>({contents:a.path.endsWith('/core')?`export const Capacitor={isNativePlatform:()=>true,getPlatform:()=>'${nativePlatform}'}`:geolocation}));}}]});
 const context={window,document,console,Intl,Date,URL,AbortSignal,TextDecoder,setTimeout,clearTimeout,recordWatch:receive=>{receivePosition=receive},scrollTo(){},navigator:{languages:['en']},location:{origin:'https://localhost',protocol:'https:'},localStorage:{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)},fetch:async (url,options)=>{requests.push(String(url));if(options?.method==='POST'){posted.push(JSON.parse(options.body));if(nearbyResponse)return nearbyResponse(dataset)}return Response.json(String(url).includes('/api/photo?')?{photoUri:'https://lh3.googleusercontent.com/genuine-image'}:String(url).endsWith('/api/status')?{configured:true,mode:'nearby'}:dataset)}};
 if(observer)context.IntersectionObserver=class{constructor(callback){this.callback=callback;this.targets=[];observers.push(this)}observe(el){this.targets.push(el)}unobserve(){}disconnect(){}};
 vm.runInNewContext(outputFiles[0].text,context);
 for(let i=0;i<100&&!document.querySelector('.result-head');i++)await new Promise(r=>setTimeout(r,5));
 return {document,window,requests,observers,posted,emitPosition:position=>receivePosition(position)};
}
test('a maximum budget includes cheaper venues and excludes closed venues',async()=>{
 const {document}=await boot();
 assert.equal(document.querySelector('.card h3')?.textContent,'Cheap cafe');
 assert.doesNotMatch(document.querySelector('#results-list')?.textContent||'',/Mid restaurant/);
 const slider=document.querySelector('#spending');assert.equal(slider.hasAttribute('disabled'),false);
 slider.value='249';slider.oninput({target:slider});await Promise.resolve();assert.equal(document.querySelector('[data-tier-label].active').textContent,'Low');assert.match(document.querySelector('#spending-price').textContent,/19.99/);
 assert.equal(document.querySelector('.card h3').textContent,'Cheap cafe');
 slider.onchange({target:slider});
 for(let i=0;i<4;i++)await new Promise(r=>setTimeout(r,5));for(let i=0;i<100&&!document.querySelector('.result-head');i++)await new Promise(r=>setTimeout(r,5));
 assert.deepEqual([...document.querySelectorAll('.card h3')].map(e=>e.textContent),['Cheap cafe']);
 const img=document.querySelector('.card img');assert.ok(img?.getAttribute('src').includes('googleusercontent.com/genuine-image'));assert.equal(document.querySelector('.card .plate'),null);
 document.querySelector('.card-open').onclick();assert.match(document.body.textContent,/Real author/);assert.ok(document.querySelector('a[data-place-link]'));
});

test('offscreen thumbnail does not consume photo quota; repeated slider movement reuses its request',async()=>{
 const {document,requests,observers}=await boot({observer:true});
 let slider=document.querySelector('#spending');slider.value='249';slider.oninput({target:slider});slider.onchange({target:slider});
 assert.equal(requests.filter(u=>u.includes('/api/photo?')).length,0);
 let obs=observers.at(-1);assert.equal(obs.targets[0].hasAttribute('hidden'),false);assert.ok(obs.targets[0].classList.contains('venue-photo'));obs.callback([{isIntersecting:true,target:obs.targets[0]}]);
 await new Promise(r=>setTimeout(r,10));assert.equal(requests.filter(u=>u.includes('/api/photo?')).length,1);
 slider.value='248';slider.oninput({target:slider});slider.onchange({target:slider});obs=observers.at(-1);obs.callback([{isIntersecting:true,target:obs.targets[0]}]);
 await new Promise(r=>setTimeout(r,10));assert.equal(requests.filter(u=>u.includes('/api/photo?')).length,1);
});

test('dragging keeps card DOM and photo observer unchanged until release; unknown prices excluded',async()=>{
 const {document,observers}=await boot({observer:true});
 assert.equal(document.querySelectorAll('.card').length,1);
 const slider=document.querySelector('#spending'),card=document.querySelector('.card'),obs=observers.at(-1);
 for(let n=0;n<100;n++){slider.value=String(n*10);slider.oninput({target:slider})}
 assert.equal(document.querySelector('.card'),card);assert.equal(observers.at(-1),obs);
 assert.equal(document.querySelector('#spending'),slider);
 assert.match(document.querySelector('#result-count').textContent,/^1/);
 slider.value='249';slider.oninput({target:slider});slider.onchange({target:slider});
 assert.equal(document.querySelectorAll('.card').length,1);assert.equal(document.querySelector('.card h3').textContent,'Cheap cafe');
});

test('distance increases upward in the side rail without requesting GPS',async()=>{
 const {document,requests}=await boot();
 const input=document.querySelector('#radius'),surface=input.parentElement;
 surface.getBoundingClientRect=()=>({left:0,width:44,top:0,height:300});input.focus=()=>{};
 const event=(x,y)=>({pointerId:5,clientX:x,clientY:y,button:0,isPrimary:true,preventDefault(){}});
 const before=requests.length;surface.onpointerdown(event(8,74));surface.onpointermove(event(9,40));surface.onpointermove(event(-30,15));surface.onpointerup(event(-30,15));
 assert.equal(document.querySelector('#radius'),input);assert.ok(Number(input.value)>800);assert.match(document.querySelector('#distance-label').textContent,/1000 m/);assert.equal(requests.length,before);
});

test('increasing the budget and infinity retain the affordable results',async()=>{
 const {document}=await boot({venues:[venue('Low','low',10),venue('Mid','mid',30),venue('High','high',90)]});
 const slider=document.querySelector('#spending');
 for(const [value,count] of [[249,1],[250,1],[375,2],[749,3],[1000,3]]){
  slider.value=String(value);slider.oninput({target:slider});slider.onchange({target:slider});
  assert.equal(document.querySelectorAll('#results-list .card').length,count);
  assert.match(document.querySelector('#result-count').textContent,new RegExp('^'+count));
 }
 assert.equal(document.querySelector('#refresh'),null);
 assert.ok(document.querySelector('.filter-dock'));
 assert.equal(document.querySelector('.filter-dock input').id,'spending');
 assert.equal(document.querySelector('.distance-rail input').getAttribute('aria-orientation'),'vertical');
});
test('both filters respond in the live results without new provider calls',async()=>{
 const {document,requests}=await boot({observer:true});
 const rad=document.querySelector('#radius');
 assert.ok(rad);
 const before=requests.length;
 rad.value='100';rad.oninput({target:rad});
 const slider=document.querySelector('#spending');
 slider.value='249';slider.oninput({target:slider});
 await new Promise(r=>setTimeout(r,25));
 assert.equal(document.querySelector('.card h3')?.textContent,'Cheap cafe');
 assert.match(document.querySelector('#distance-label').textContent,/100 m/);
 assert.equal(requests.length,before);
});

test('iPhone startup searches once with the precise fix, skipping an earlier coarse position',async()=>{
 const {document,posted}=await boot({ios:true});
 assert.equal(document.querySelector('.card h3')?.textContent,'Cheap cafe');
 assert.equal(posted.length,1);
 assert.equal(posted[0].lat,44.49);
 assert.equal(posted[0].lng,11.34);
});

test('uniform cards include cheaper places and keep uncertain ranges after all results',async()=>{
 const {document,requests}=await boot({venues:[
  venue('Hamerica’s','mid',30,{rating:4.0}),
  venue('Farther','mid',30,{lat:44.494,rating:4.9,reviewCount:400}),
  venue('Fradiavolo','low',20,{lat:44.49012}),
  venue('Uncertain','mid',50,{lat:44.49029,venuePrice:{min:30,max:50,updatedAt:now,source:'Google Maps priceRange',scope:'venue-estimate'}}),
  venue('Unknown','mid',40,{venuePrice:undefined}),
  venue('Closed','mid',30,{isOpen:false,openingStatus:'closed'})
 ]});
 assert.deepEqual([...document.querySelectorAll('#results-list .card h3')].map(e=>e.textContent),['Hamerica’s','Fradiavolo','Farther']);
 const alternatives=document.querySelector('#budget-alternatives');
 assert.ok(alternatives);
 assert.equal(alternatives.hasAttribute('open'),false);
 assert.equal(alternatives.querySelector('.card h3').textContent,'Uncertain');
 assert.equal(alternatives.querySelector('.favorite').getAttribute('aria-pressed'),'false');
 assert.equal(document.querySelector('#nearby-alternatives'),null);
 assert.equal(requests.filter(u=>u.endsWith('/api/nearby')).length,1);
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

test('GPS movement updates the list without another search action',async()=>{
 const {document,emitPosition,posted}=await boot({ios:true,venues:[venue('Start venue','mid',30)]});
 const rad=document.querySelector('#radius');rad.value='100';rad.oninput({target:rad});rad.onchange();
 assert.equal(document.querySelectorAll('#results-list .card').length,1);
 emitPosition({timestamp:Date.now(),coords:{latitude:44.492,longitude:11.34,accuracy:12}});
 assert.equal(document.querySelectorAll('#results-list .card').length,0);
 assert.equal(posted.length,1);
 emitPosition({timestamp:Date.now(),coords:{latitude:44.49,longitude:11.34,accuracy:12}});
 assert.equal(document.querySelectorAll('#results-list .card').length,1);
});

test('dense streets keep every partially compatible price in uniform collapsed cards',async()=>{
 const venues=Array.from({length:19},(_,i)=>venue('Venue '+i,'high',60,{lat:44.49+i*0.00005,venuePrice:{min:30,max:60,updatedAt:now,source:'Google Maps priceRange',scope:'venue-estimate'}}));
 const {document}=await boot({venues});
 assert.equal(document.querySelectorAll('#alternative-list .card').length,19);
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

test('new live prices update existing cards without replacing the filter controls',async()=>{
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
 const slider=document.querySelector('#spending'),card=document.querySelector('.card');
 assert.match(card.textContent,/30/);
 finish();
 for(let i=0;i<20&&!document.querySelector('.card').textContent.includes('40');i++)await new Promise(r=>setTimeout(r,5));
 assert.equal(document.querySelector('#spending'),slider);
 assert.equal(document.querySelector('.card'),card);
 assert.match(card.textContent,/40/);
});

test('a live price response is retained when GPS changes during a slider gesture',async()=>{
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
 const input=document.querySelector('#radius'),surface=input.parentElement;
 surface.getBoundingClientRect=()=>({left:0,width:44,top:0,height:300});
 const event={pointerId:7,clientX:22,clientY:75,button:0,isPrimary:true,preventDefault(){}};
 surface.onpointerdown(event);
 finish();await new Promise(r=>setTimeout(r,5));
 emitPosition({timestamp:Date.now(),coords:{latitude:44.4908,longitude:11.34,accuracy:12}});
 surface.onpointerup(event);
 assert.match(document.querySelector('#results-list .card').textContent,/40/);
 assert.match(document.querySelector('[data-distance]').textContent,/89 m/);
});

test('backgrounding during a drag releases the controls on resume',async()=>{
 const {document,window}=await boot({ios:true});
 const input=document.querySelector('#radius'),surface=input.parentElement;
 surface.getBoundingClientRect=()=>({left:0,width:44,top:0,height:300});
 surface.onpointerdown({pointerId:9,clientX:22,clientY:75,button:0,isPrimary:true});
 Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});
 document.dispatchEvent(new window.Event('visibilitychange'));
 Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});
 document.dispatchEvent(new window.Event('visibilitychange'));
 await new Promise(r=>setTimeout(r,5));
 assert.equal(document.querySelector('#radius')===input,false);
 const slider=document.querySelector('#spending');
 slider.value='249';slider.oninput({target:slider});slider.onchange();
 assert.match(document.querySelector('#spending-price').textContent,/19.99/);
});
