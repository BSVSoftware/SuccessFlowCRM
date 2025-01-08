const CACHE_NAME = 'successflowcrm-cache';
const FILES_TO_CACHE = [
    '..//',
    '../index.html',
    '../html/login.html',
    '../html/company.html',
    '../html/menue.html',
    '../css/styles.css',
    '../js/app.js',
    '../js/login.js',
    '../js/menue.js',
    '../js/offline.js',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(FILES_TO_CACHE))
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => response || fetch(event.request))
    );
});
