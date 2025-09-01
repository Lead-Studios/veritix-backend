// Veritix PWA Service Worker
const CACHE_NAME = 'veritix-v1';
const OFFLINE_URL = '/offline.html';

// Files to cache for offline functionality
const STATIC_CACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/css/app.css',
  '/js/app.js',
];

// API endpoints to cache
const API_CACHE_URLS = [
  '/api/events',
  '/api/tickets',
  '/api/user/profile',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - handle network requests with caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests with network-first strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Handle static assets with cache-first strategy
  if (STATIC_CACHE_URLS.includes(url.pathname)) {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  // Handle navigation requests with network-first, fallback to offline page
  if (request.mode === 'navigate') {
    event.respondWith(navigationStrategy(request));
    return;
  }

  // Default strategy for other requests
  event.respondWith(networkFirstStrategy(request));
});

// Network-first strategy for API calls
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful API responses
    if (networkResponse.ok && request.method === 'GET') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Network failed, trying cache:', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline indicator for failed API calls
    return new Response(
      JSON.stringify({ 
        error: 'Offline', 
        message: 'This content is not available offline' 
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Cache-first strategy for static assets
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    console.log('Failed to fetch and cache:', request.url);
    throw error;
  }
}

// Navigation strategy with offline fallback
async function navigationStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    console.log('Navigation failed, showing offline page');
    const cache = await caches.open(CACHE_NAME);
    return cache.match(OFFLINE_URL);
  }
}

// Background sync for ticket purchases and data updates
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'ticket-purchase') {
    event.waitUntil(syncTicketPurchases());
  } else if (event.tag === 'user-data') {
    event.waitUntil(syncUserData());
  } else if (event.tag === 'event-data') {
    event.waitUntil(syncEventData());
  }
});

// Sync ticket purchases when back online
async function syncTicketPurchases() {
  try {
    const pendingPurchases = await getStoredData('pending-purchases');
    
    for (const purchase of pendingPurchases) {
      try {
        const response = await fetch('/api/tickets/purchase', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${purchase.token}`
          },
          body: JSON.stringify(purchase.data)
        });
        
        if (response.ok) {
          await removeStoredData('pending-purchases', purchase.id);
          console.log('Synced ticket purchase:', purchase.id);
        }
      } catch (error) {
        console.error('Failed to sync purchase:', purchase.id, error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Sync user data updates
async function syncUserData() {
  try {
    const pendingUpdates = await getStoredData('pending-user-updates');
    
    for (const update of pendingUpdates) {
      try {
        const response = await fetch('/api/user/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${update.token}`
          },
          body: JSON.stringify(update.data)
        });
        
        if (response.ok) {
          await removeStoredData('pending-user-updates', update.id);
          console.log('Synced user data:', update.id);
        }
      } catch (error) {
        console.error('Failed to sync user data:', update.id, error);
      }
    }
  } catch (error) {
    console.error('User data sync failed:', error);
  }
}

// Sync event data updates
async function syncEventData() {
  try {
    // Refresh cached event data
    const cache = await caches.open(CACHE_NAME);
    const eventUrls = ['/api/events', '/api/events/featured', '/api/events/trending'];
    
    for (const url of eventUrls) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          await cache.put(url, response.clone());
          console.log('Refreshed event cache:', url);
        }
      } catch (error) {
        console.error('Failed to refresh event cache:', url, error);
      }
    }
  } catch (error) {
    console.error('Event data sync failed:', error);
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  const options = {
    body: 'New event update available!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Event',
        icon: '/icons/checkmark.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/xmark.png'
      }
    ]
  };

  if (event.data) {
    const payload = event.data.json();
    options.body = payload.body || options.body;
    options.data = { ...options.data, ...payload.data };
  }

  event.waitUntil(
    self.registration.showNotification('Veritix', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/events')
    );
  } else if (event.action === 'close') {
    // Just close the notification
    return;
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Utility functions for IndexedDB storage
async function getStoredData(storeName) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('VeritixOfflineDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const getRequest = store.getAll();
      
      getRequest.onsuccess = () => resolve(getRequest.result);
      getRequest.onerror = () => reject(getRequest.error);
    };
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: 'id' });
      }
    };
  });
}

async function removeStoredData(storeName, id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('VeritixOfflineDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const deleteRequest = store.delete(id);
      
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    };
  });
}

// Handle message events from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('Veritix Service Worker loaded');
