import {cp,mkdir,rm,readdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
const mode=process.env.BYTEBUDGET_MODE||'live';
if(!['live','demo'].includes(mode))throw new Error('BYTEBUDGET_MODE must be live or demo');
await mkdir('dist',{recursive:true});for(const name of await readdir('dist'))await rm(`dist/${name}`,{recursive:true,force:true});
await mkdir('dist/client',{recursive:true});
for(const name of ['index.html','src','public'])await cp(name,`dist/client/${name}`,{recursive:true});
if(mode==='demo'){const html=await readFile('dist/client/index.html','utf8');await writeFile('dist/client/index.html',html.replace(/<html(?=\s|>)/i,'<html data-demo-preview="true"'));}
await cp('public/sw.js','dist/client/sw.js');
await build({entryPoints:['src/app.js'],outfile:'dist/client/src/app.js',bundle:true,format:'esm',target:['safari16','chrome110'],minify:true});
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
const assets={};
async function collect(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())await collect(p);else{const ext=path.extname(p),data=await readFile(p),base64=ext==='.png';assets['/'+path.relative('dist/client',p)]={type:types[ext]||'application/octet-stream',content:base64?data.toString('base64'):data.toString('utf8'),base64}}}}
await collect('dist/client');await mkdir('.build',{recursive:true});await writeFile('.build/assets.js',`export const assets=${JSON.stringify(assets)};`);
await mkdir('dist/server',{recursive:true});await build({entryPoints:['worker/index.js'],outfile:'dist/server/index.js',bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true});
console.log('Built web/native assets and server Worker. Live provider requires explicit configuration.');
