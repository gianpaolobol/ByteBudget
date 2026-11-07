import {cp,mkdir,rm,readdir} from 'node:fs/promises';
await mkdir('dist',{recursive:true});for(const name of await readdir('dist'))await rm(`dist/${name}`,{recursive:true,force:true});
for(const name of ['index.html','src','public']) await cp(name,`dist/${name}`,{recursive:true});
await cp('public/sw.js','dist/sw.js');console.log('Built dist/');
