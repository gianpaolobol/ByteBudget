const CACHE='bytebudget-shell-v6';
const SHELL=['./','./index.html','./src/app.js','./src/domain.js','./src/location.js','./src/live-client.js','./src/provider.js','./src/demo.js','./src/style.css','./public/icon.svg','./public/icon-192.png','./public/icon-512.png','./public/manifest.webmanifest'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin||!SHELL.some(p=>new URL(p,self.registration.scope).href===u.href))return;e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));});
