import {readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const files=(await readdir('dist',{recursive:true})).filter(f=>/\.(js|css|html|png|svg|webmanifest)$/.test(f)&&f!=='sw.js');
const hash=createHash('sha256');
for(const file of [...files].sort()){hash.update(file);hash.update(await readFile(`dist/${file}`))}
const version=hash.digest('hex').slice(0,12);
await writeFile('dist/sw.js',`const CACHE='karada-${version}';const FILES=${JSON.stringify(files.map(f=>'./'+f))};
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('karada-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;e.respondWith(fetch(e.request).catch(()=>caches.match(e.request).then(r=>r||(e.request.mode==='navigate'?caches.match('./index.html'):Response.error()))))});`);
