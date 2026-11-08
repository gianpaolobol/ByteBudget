import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {build} from 'esbuild';
import {parseHTML} from 'linkedom';
const now=new Date().toISOString();
const venue=(id,tier,max,extra={})=>({id,name:id,lat:44.49,lng:11.34,currency:'EUR',rating:4.5,reviewCount:20,isOpen:true,openingStatus:'open',sourceTier:tier,prices:{},venuePrice:{min:max-5,max,updatedAt:now,source:'Google Maps priceRange',scope:'venue-estimate'},...extra});
async function boot({observer=false}={}){
 const requests=[],observers=[];
 const {window,document}=parseHTML('<html><body><div id="app"></div></body></html>');
 const values=new Map();const dataset={city:'Valsamoggia',country:'IT',currency:'EUR',timeZone:'Europe/Rome',lat:44.49,lng:11.34,demo:false,pricingScope:'venue',venues:[venue('Cheap cafe','low',20,{photo:{name:'places/cheap/photos/real',authorAttributions:[{displayName:'Real author',uri:'https://maps.google.com/maps/contrib/1'}]}}),venue('Mid restaurant','mid',40,{isOpen:false,openingStatus:'closed',websiteUri:'https://example.com',googleMapsUri:'https://maps.google.com/?cid=123'})]};
 window.BYTEBUDGET_CONFIG={apiBase:'https://bb.test'};
 const {outputFiles}=await build({entryPoints:['src/app.js'],bundle:true,write:false,format:'iife',define:{__BYTEBUDGET_ALLOW_DEMO__:'false'},plugins:[{name:'native-boundary',setup(b){b.onResolve({filter:/^@capacitor\/(core|geolocation)$/},a=>({path:a.path,namespace:'native-test'}));b.onLoad({filter:/.*/,namespace:'native-test'},a=>({contents:a.path.endsWith('/core')?'export const Capacitor={isNativePlatform:()=>true}':'export const Geolocation={getCurrentPosition:async()=>({coords:{latitude:44.49,longitude:11.34,accuracy:5}})}'}));}}]});
 const context={window,document,console,Intl,Date,URL,AbortSignal,scrollTo(){},navigator:{languages:['en']},location:{origin:'https://localhost',protocol:'https:'},localStorage:{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)},fetch:async url=>{requests.push(String(url));return Response.json(String(url).includes('/api/photo?')?{photoUri:'https://lh3.googleusercontent.com/genuine-image'}:String(url).endsWith('/api/status')?{configured:true,mode:'nearby'}:dataset)}};
 if(observer)context.IntersectionObserver=class{constructor(callback){this.callback=callback;this.targets=[];observers.push(this)}observe(el){this.targets.push(el)}unobserve(){}disconnect(){}};
 vm.runInNewContext(outputFiles[0].text,context);
 for(let i=0;i<100&&!document.querySelector('.result-head');i++)await new Promise(r=>setTimeout(r,5));
 return {document,window,requests,observers};
}
test('live UI lets a three-price-or-less town change budget and never mixes Low into Mid',async()=>{
 const {document}=await boot();
 assert.equal(document.querySelector('.card h3')?.textContent,'Mid restaurant');
 assert.match(document.querySelector('.card')?.textContent||'',/Closed/i);
 const slider=document.querySelector('#spending');assert.equal(slider.hasAttribute('disabled'),false);
 slider.value='100';slider.oninput({target:slider});assert.equal(document.querySelector('#spending-tier').textContent,'Low');assert.match(document.querySelector('#spending-price').textContent,/20/);
 for(let i=0;i<4;i++)await new Promise(r=>setTimeout(r,5));for(let i=0;i<100&&!document.querySelector('.result-head');i++)await new Promise(r=>setTimeout(r,5));
 assert.deepEqual([...document.querySelectorAll('.card h3')].map(e=>e.textContent),['Cheap cafe']);
 const img=document.querySelector('.card img');assert.ok(img?.getAttribute('src').includes('googleusercontent.com/genuine-image'));assert.equal(document.querySelector('.card .plate'),null);
 document.querySelector('.card').onclick();assert.match(document.body.textContent,/Real author/);assert.ok(document.querySelector('a[data-place-link]'));
});

test('offscreen thumbnail does not consume photo quota; repeated slider movement reuses its request',async()=>{
 const {document,requests,observers}=await boot({observer:true});
 let slider=document.querySelector('#spending');slider.value='100';slider.oninput({target:slider});
 assert.equal(requests.filter(u=>u.includes('/api/photo?')).length,0);
 let obs=observers.at(-1);assert.equal(obs.targets[0].hasAttribute('hidden'),false);assert.ok(obs.targets[0].classList.contains('venue-photo'));obs.callback([{isIntersecting:true,target:obs.targets[0]}]);
 await new Promise(r=>setTimeout(r,10));assert.equal(requests.filter(u=>u.includes('/api/photo?')).length,1);
 slider.value='120';slider.oninput({target:slider});obs=observers.at(-1);obs.callback([{isIntersecting:true,target:obs.targets[0]}]);
 await new Promise(r=>setTimeout(r,10));assert.equal(requests.filter(u=>u.includes('/api/photo?')).length,1);
});
