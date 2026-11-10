import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {build} from 'esbuild';
import {parseHTML} from 'linkedom';
const now=new Date().toISOString();
const venue=(id,tier,max,extra={})=>({id,name:id,lat:44.49,lng:11.34,currency:'EUR',rating:4.5,reviewCount:20,isOpen:true,openingStatus:'open',sourceTier:tier,prices:{},venuePrice:{min:max-5,max,updatedAt:now,source:'Google Maps priceRange',scope:'venue-estimate'},...extra});
async function boot({observer=false,ios=false}={}){
 const requests=[],observers=[],posted=[];
 const {window,document}=parseHTML('<html><body><div id="app"></div></body></html>');
 const values=new Map([['bb-spending-position','450']]);const dataset={city:'Valsamoggia',country:'IT',currency:'EUR',timeZone:'Europe/Rome',lat:44.49,lng:11.34,demo:false,pricingScope:'venue',venues:[venue('Unknown price','high',40,{venuePrice:undefined}),venue('Cheap cafe','low',15,{photo:{name:'places/cheap/photos/real',authorAttributions:[{displayName:'Real author',uri:'https://maps.google.com/maps/contrib/1'}]}}),venue('Mid restaurant','high',40,{isOpen:false,openingStatus:'closed',websiteUri:'https://example.com',googleMapsUri:'https://maps.google.com/?cid=123'})]};
 window.BYTEBUDGET_CONFIG={apiBase:'https://bb.test'};
 const nativePlatform=ios?'ios':'android';
 const geolocation=ios?`export const Geolocation={
  checkPermissions:async()=>({location:'granted'}),
  watchPosition:async(options,receive)=>{
   receive({coords:{latitude:44.5,longitude:11.35,accuracy:600}});
   receive({coords:{latitude:44.49,longitude:11.34,accuracy:5}});
   return 'test-watch';
  },
  clearWatch:async()=>{}
 }`:'export const Geolocation={getCurrentPosition:async()=>({coords:{latitude:44.49,longitude:11.34,accuracy:5}})}';
 const {outputFiles}=await build({entryPoints:['src/app.js'],bundle:true,write:false,format:'iife',define:{__BYTEBUDGET_ALLOW_DEMO__:'false'},plugins:[{name:'native-boundary',setup(b){b.onResolve({filter:/^@capacitor\/(core|geolocation)$/},a=>({path:a.path,namespace:'native-test'}));b.onLoad({filter:/.*/,namespace:'native-test'},a=>({contents:a.path.endsWith('/core')?`export const Capacitor={isNativePlatform:()=>true,getPlatform:()=>'${nativePlatform}'}`:geolocation}));}}]});
 const context={window,document,console,Intl,Date,URL,AbortSignal,setTimeout,clearTimeout,scrollTo(){},navigator:{languages:['en']},location:{origin:'https://localhost',protocol:'https:'},localStorage:{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)},fetch:async (url,options)=>{requests.push(String(url));if(options?.method==='POST')posted.push(JSON.parse(options.body));return Response.json(String(url).includes('/api/photo?')?{photoUri:'https://lh3.googleusercontent.com/genuine-image'}:String(url).endsWith('/api/status')?{configured:true,mode:'nearby'}:dataset)}};
 if(observer)context.IntersectionObserver=class{constructor(callback){this.callback=callback;this.targets=[];observers.push(this)}observe(el){this.targets.push(el)}unobserve(){}disconnect(){}};
 vm.runInNewContext(outputFiles[0].text,context);
 for(let i=0;i<100&&!document.querySelector('.result-head');i++)await new Promise(r=>setTimeout(r,5));
 return {document,window,requests,observers,posted};
}
test('live UI lets a three-price-or-less town change budget and never mixes Low into Mid',async()=>{
 const {document}=await boot();
 assert.equal(document.querySelector('.card h3')?.textContent,'Mid restaurant');
 assert.match(document.querySelector('.card')?.textContent||'',/Closed/i);
 const slider=document.querySelector('#spending');assert.equal(slider.hasAttribute('disabled'),false);
 slider.value='249';slider.oninput({target:slider});await Promise.resolve();assert.equal(document.querySelector('#spending-tier').textContent,'Low');assert.match(document.querySelector('#spending-price').textContent,/19.99/);
 assert.equal(document.querySelector('.card h3').textContent,'Cheap cafe');
 slider.onchange({target:slider});
 for(let i=0;i<4;i++)await new Promise(r=>setTimeout(r,5));for(let i=0;i<100&&!document.querySelector('.result-head');i++)await new Promise(r=>setTimeout(r,5));
 assert.deepEqual([...document.querySelectorAll('.card h3')].map(e=>e.textContent),['Cheap cafe']);
 const img=document.querySelector('.card img');assert.ok(img?.getAttribute('src').includes('googleusercontent.com/genuine-image'));assert.equal(document.querySelector('.card .plate'),null);
 document.querySelector('.card').onclick();assert.match(document.body.textContent,/Real author/);assert.ok(document.querySelector('a[data-place-link]'));
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

test('distance uses the same forgiving drag surface and does not request GPS during movement',async()=>{
 const {document,requests}=await boot();document.querySelector('#edit').onclick();
 const input=document.querySelector('#radius'),surface=input.parentElement;
 surface.getBoundingClientRect=()=>({left:0,width:300,top:0,height:88});input.focus=()=>{};
 const event=(x,y=44)=>({pointerId:5,clientX:x,clientY:y,button:0,isPrimary:true,preventDefault(){}});
 const before=requests.length;surface.onpointerdown(event(226,8));surface.onpointermove(event(260,9));surface.onpointermove(event(285,130));surface.onpointerup(event(285,130));
 assert.equal(document.querySelector('#radius'),input);assert.ok(Number(input.value)>800);assert.match(document.querySelector('#distance-label').textContent,/1000 m/);assert.equal(requests.length,before);
});

test('committing an empty tier updates both cards and result count',async()=>{const {document}=await boot();const slider=document.querySelector('#spending');slider.value='700';slider.oninput({target:slider});assert.equal(document.querySelectorAll('.card').length,1);slider.onchange({target:slider});assert.equal(document.querySelectorAll('.card:not(.alternative-card)').length,0);assert.ok(document.querySelector('.alternative-card'));assert.match(document.querySelector('#result-count').textContent,/^0/)});
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
 assert.match(document.querySelector('#result-criteria').textContent,/100 m/);
 assert.equal(requests.length,before);
});

test('iPhone startup searches once with the precise fix, skipping an earlier coarse position',async()=>{
 const {document,posted}=await boot({ios:true});
 assert.equal(document.querySelector('.card h3')?.textContent,'Mid restaurant');
 assert.equal(posted.length,1);
 assert.equal(posted[0].lat,44.49);
 assert.equal(posted[0].lng,11.34);
});
