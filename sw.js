/**
 * TypeSpeed service worker. Saves the app's files on install so the page
 * loads without a network connection. Requests try the network first and
 * fall back to the saved copy, so a new deploy is picked up on the next
 * load while online.
 */
const CACHE = 'typespeed';
const FILES = [
    './',
    'index.html',
    'style.css',
    'theme.js',
    'texts.js',
    'script.js',
    'manifest.webmanifest',
    'fonts/jetbrains-mono-latin.woff2',
    'fonts/space-grotesk-latin.woff2',
    'icons/icon-192.png',
    'icons/icon-512.png',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches
            .open(CACHE)
            .then((cache) => cache.addAll(FILES))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
    event.respondWith(
        fetch(request)
            .then((response) => {
                if (response.ok) {
                    const copy = response.clone();
                    caches.open(CACHE).then((cache) => cache.put(request, copy));
                }
                return response;
            })
            // ignoreSearch: the page URL may carry a query string.
            .catch(() => caches.match(request, { ignoreSearch: true }))
    );
});
