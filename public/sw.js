/* Form offline shell. Personal API responses and auth pages are never cached. */
const CACHE='form-shell-v2';
const ASSETS=/* ASSET_LIST */[];
self.addEventListener('install',event=>{event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);const shell=await fetch('/offline',{credentials:'include',cache:'no-store'});
 if(!shell.ok||shell.redirected||!(await shell.clone().text()).includes('FORM_OFFLINE_SHELL'))throw new Error('Sign in to prepare offline mode.');
 await cache.put('/offline',shell);await cache.addAll(ASSETS);await self.skipWaiting();
})());});
self.addEventListener('activate',event=>{event.waitUntil(self.clients.claim());});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);if(url.origin!==self.location.origin||event.request.method!=='GET')return;
 if(event.request.mode==='navigate'&&(url.pathname==='/'||url.pathname==='/offline')){
  event.respondWith(fetch(event.request).catch(async()=>await (await caches.open(CACHE)).match('/offline')||Response.error()));return;
 }
 if(ASSETS.includes(url.pathname))event.respondWith((async()=>{const hit=await (await caches.open(CACHE)).match(event.request);if(hit)return hit;const response=await fetch(event.request);if(response.ok){const cache=await caches.open(CACHE);await cache.put(event.request,response.clone());}return response;})());
});
