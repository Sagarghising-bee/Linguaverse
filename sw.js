/* ═══════════════════════════════
   sw.js — LinguaVerse Service Worker
   Handles PWA install + offline caching
═══════════════════════════════ */

const CACHE_NAME = 'linguaverse-v1';

// All files to cache for offline use
const CACHE_FILES = [
  '/',
  '/index.html',
  '/pages/chat.html',
  '/pages/setup.html',
  '/css/global.css',
  '/css/landing.css',
  '/css/chat.css',
  '/css/setup.css',
  '/js/canvas-bg.js',
  '/js/chat.js',
  '/js/setup.js',
  '/js/reveal.js',
  '/manifest.json',
];

// Install — cache all static files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(CACHE_FILES);
    }).then(() => self.skipWaiting())
  );
});

// Activate — clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch — serve from cache first, fall back to network
self.addEventListener('fetch', event => {
  // Only handle same-origin GET requests
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  // For Gemini API calls — always go to network, never cache
  if (event.request.url.includes('generativelanguage.googleapis.com')) return;
  if (event.request.url.includes('fonts.googleapis.com')) return;
  if (event.request.url.includes('fonts.gstatic.com')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cache successful responses
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback — serve index.html for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
