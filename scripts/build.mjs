import {cp,mkdir,rm,readdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
const mode=process.env.BYTEBUDGET_MODE||'live';
if(!['live','demo'].includes(mode))throw new Error('BYTEBUDGET_MODE must be live or demo');
const openPilot=process.env.BYTEBUDGET_OPEN_PILOT==='true';
const apiBase=openPilot?'':process.env.BYTEBUDGET_API_BASE||'';
if(apiBase){let url;try{url=new URL(apiBase)}catch{throw new Error('BYTEBUDGET_API_BASE must be an HTTPS origin')}
 if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw new Error('BYTEBUDGET_API_BASE must be an HTTPS origin without credentials, path or query');}
await mkdir('dist',{recursive:true});for(const name of await readdir('dist'))await rm(`dist/${name}`,{recursive:true,force:true});
await mkdir('dist/client',{recursive:true});
for(const name of ['index.html','public'])await cp(name,`dist/client/${name}`,{recursive:true});
if(!openPilot)await rm('dist/client/public/open-pilot-catalog.json',{force:true});
await mkdir('dist/client/src',{recursive:true});await cp('src/style.css','dist/client/src/style.css');
if(openPilot&&mode!=='live')throw new Error('Open data pilot requires live build mode');
if(mode==='demo'){const html=await readFile('dist/client/index.html','utf8');await writeFile('dist/client/index.html',html.replace(/<html(?=\s|>)/i,'<html data-demo-preview="true"'));}
if(apiBase){const html=await readFile('dist/client/index.html','utf8');await writeFile('dist/client/index.html',html.replace('</head>',`<script>globalThis.BYTEBUDGET_CONFIG=${JSON.stringify({apiBase}).replaceAll('<','\\u003c')}</script></head>`));}
await cp('public/sw.js','dist/client/sw.js');
await build({entryPoints:['src/app.js'],outfile:'dist/client/src/app.js',bundle:true,format:'esm',target:['safari16','chrome110'],minify:true,treeShaking:true,plugins:[...(!openPilot?[{name:'exclude-open-pilot',setup(b){b.onLoad({filter:/[\\/]src[\\/]open-pilot\.js$/},()=>({contents:'export function openPilotDataset(){} export function selectOpenPilotVenues(){}',loader:'js'}))}}]:[]),...(mode==='live'?[{name:'exclude-fictional-data',setup(b){b.onLoad({filter:/[\\/]src[\\/](demo|bootstrap)\.js$/},({path:file})=>({contents:file.endsWith('bootstrap.js')?'export function initialDemoDataset(){return null} export async function discoverDemoPreview(){return false}':'export function demoCity(){throw new Error("Demo disabled in live build")}',loader:'js'}))}}]:[])],define:{__BYTEBUDGET_OPEN_PILOT__:String(openPilot),__BYTEBUDGET_ALLOW_DEMO__:mode==='demo'?'true':'false'}});
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json','.json':'application/json; charset=utf-8'};
const assets={};
async function collect(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())await collect(p);else{const ext=path.extname(p),data=await readFile(p),base64=ext==='.png';assets['/'+path.relative('dist/client',p)]={type:types[ext]||'application/octet-stream',content:base64?data.toString('base64'):data.toString('utf8'),base64}}}}
await collect('dist/client');await mkdir('.build',{recursive:true});await writeFile('.build/assets.js',`export const assets=${JSON.stringify(assets)};`);
await mkdir('dist/server',{recursive:true});await build({entryPoints:['worker/index.js'],outfile:'dist/server/index.js',bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true});
console.log(openPilot?'Built offline open data pilot.':'Built web/native assets and server Worker. Live provider requires explicit configuration.');
