const CACHE_NAME = 'successflowcrm-cache';
const FILES_TO_CACHE = [
    '/CRM/',
    '/CRM/index.html',
    '/CRM/html/login.html',
    '/CRM/html/company.html',
    '/CRM/html/menue.html',
    '/CRM/css/styles.css',
    '/CRM/js/app.js',
    '/CRM/js/login.js',
    '/CRM/js/menue.js',
    '/CRM/js/offline.js',
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
