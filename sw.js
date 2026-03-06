const CACHE_NAME = 'sotd-cache-v1';

// The "App Shell" files we want to save to the user's phone
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './app.js',
    './SOTD_Logo.png',
    './manifest.json'
];

// 1. Install Phase: Download and cache the App Shell
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('Opened cache and caching app shell.');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// 2. Fetch Phase: Serve from Cache if offline, otherwise go to Network
self.addEventListener('fetch', event => {
    // We only want to cache the shell, NOT the live database API calls
    if (event.request.method !== 'GET' || event.request.url.includes('supabase.co')) {
        return; 
    }

    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            // Return the cached file if we have it, else fetch from the internet
            return cachedResponse || fetch(event.request);
        })
    );
});