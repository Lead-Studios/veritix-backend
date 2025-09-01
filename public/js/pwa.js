// Veritix PWA Client-side functionality
class VeritixPWA {
  constructor() {
    this.swRegistration = null;
    this.isOnline = navigator.onLine;
    this.installPrompt = null;
    this.init();
  }

  async init() {
    // Register service worker
    if ('serviceWorker' in navigator) {
      try {
        this.swRegistration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', this.swRegistration);
        
        // Listen for service worker updates
        this.swRegistration.addEventListener('updatefound', () => {
          this.handleServiceWorkerUpdate();
        });
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }

    // Set up PWA install prompt
    this.setupInstallPrompt();
    
    // Set up offline/online detection
    this.setupConnectivityDetection();
    
    // Set up push notifications
    this.setupPushNotifications();
    
    // Set up background sync
    this.setupBackgroundSync();
    
    // Track PWA analytics
    this.trackPWAEvent('APP_LAUNCH');
  }

  // PWA Installation
  setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.installPrompt = e;
      this.showInstallButton();
    });

    window.addEventListener('appinstalled', () => {
      console.log('PWA installed successfully');
      this.hideInstallButton();
      this.trackPWAEvent('APP_INSTALL');
    });
  }

  async installPWA() {
    if (!this.installPrompt) {
      console.log('Install prompt not available');
      return;
    }

    const result = await this.installPrompt.prompt();
    console.log('Install prompt result:', result);
    
    this.installPrompt = null;
    this.hideInstallButton();
  }

  showInstallButton() {
    const installButton = document.getElementById('pwa-install-btn');
    if (installButton) {
      installButton.style.display = 'block';
      installButton.addEventListener('click', () => this.installPWA());
    }
  }

  hideInstallButton() {
    const installButton = document.getElementById('pwa-install-btn');
    if (installButton) {
      installButton.style.display = 'none';
    }
  }

  // Connectivity Detection
  setupConnectivityDetection() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.handleOnlineStatus();
      this.trackPWAEvent('NETWORK_RECONNECT');
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.handleOfflineStatus();
      this.trackPWAEvent('NETWORK_DISCONNECT');
    });
  }

  handleOnlineStatus() {
    console.log('Back online - syncing data');
    this.showConnectionStatus('online');
    this.syncOfflineData();
  }

  handleOfflineStatus() {
    console.log('Gone offline - enabling offline mode');
    this.showConnectionStatus('offline');
  }

  showConnectionStatus(status) {
    const statusElement = document.getElementById('connection-status');
    if (statusElement) {
      statusElement.className = `connection-status ${status}`;
      statusElement.textContent = status === 'online' ? 'Connected' : 'Offline Mode';
    }
  }

  // Push Notifications
  async setupPushNotifications() {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      console.log('Push notifications not supported');
      return;
    }

    // Check if already subscribed
    const subscription = await this.getPushSubscription();
    if (subscription) {
      console.log('Already subscribed to push notifications');
      return;
    }

    // Show notification permission prompt
    this.showNotificationPrompt();
  }

  async subscribeToPushNotifications() {
    try {
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        console.log('Notification permission denied');
        return;
      }

      const subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(window.VAPID_PUBLIC_KEY)
      });

      // Send subscription to backend
      await this.sendSubscriptionToBackend(subscription);
      
      this.trackPWAEvent('PUSH_NOTIFICATION_SUBSCRIBED');
      console.log('Subscribed to push notifications');
      
    } catch (error) {
      console.error('Push subscription failed:', error);
    }
  }

  async getPushSubscription() {
    if (!this.swRegistration) return null;
    return await this.swRegistration.pushManager.getSubscription();
  }

  async sendSubscriptionToBackend(subscription) {
    const response = await fetch('/api/pwa/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')),
          auth: this.arrayBufferToBase64(subscription.getKey('auth'))
        },
        userAgent: navigator.userAgent,
        deviceInfo: this.getDeviceInfo()
      })
    });

    if (!response.ok) {
      throw new Error('Failed to send subscription to backend');
    }
  }

  showNotificationPrompt() {
    const promptElement = document.getElementById('notification-prompt');
    if (promptElement) {
      promptElement.style.display = 'block';
      
      const enableBtn = promptElement.querySelector('.enable-notifications');
      if (enableBtn) {
        enableBtn.addEventListener('click', () => {
          this.subscribeToPushNotifications();
          promptElement.style.display = 'none';
        });
      }
    }
  }

  // Background Sync
  setupBackgroundSync() {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      console.log('Background sync supported');
    } else {
      console.log('Background sync not supported');
    }
  }

  async queueBackgroundSync(action, data) {
    if (!this.swRegistration) {
      console.error('Service worker not registered');
      return;
    }

    try {
      // Store data for background sync
      await this.storeOfflineData(action, data);
      
      // Register background sync
      await this.swRegistration.sync.register(action);
      
      console.log('Background sync queued:', action);
      this.trackPWAEvent('BACKGROUND_SYNC_QUEUED', { action });
      
    } catch (error) {
      console.error('Background sync failed:', error);
    }
  }

  // Offline Data Management
  async storeOfflineData(key, data) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('VeritixOfflineDB', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['offline-data'], 'readwrite');
        const store = transaction.objectStore('offline-data');
        
        const item = {
          id: key + '-' + Date.now(),
          key,
          data,
          timestamp: Date.now()
        };
        
        const addRequest = store.add(item);
        addRequest.onsuccess = () => resolve(item);
        addRequest.onerror = () => reject(addRequest.error);
      };
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('offline-data')) {
          db.createObjectStore('offline-data', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('pending-purchases')) {
          db.createObjectStore('pending-purchases', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('pending-user-updates')) {
          db.createObjectStore('pending-user-updates', { keyPath: 'id' });
        }
      };
    });
  }

  async getOfflineData(key) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('VeritixOfflineDB', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['offline-data'], 'readonly');
        const store = transaction.objectStore('offline-data');
        const getRequest = store.getAll();
        
        getRequest.onsuccess = () => {
          const items = getRequest.result.filter(item => item.key === key);
          resolve(items);
        };
        getRequest.onerror = () => reject(getRequest.error);
      };
    });
  }

  async syncOfflineData() {
    try {
      // Trigger background sync for all pending data
      if (this.swRegistration) {
        await this.swRegistration.sync.register('user-data');
        await this.swRegistration.sync.register('ticket-purchase');
        await this.swRegistration.sync.register('event-data');
      }
      
      console.log('Offline data sync triggered');
      this.trackPWAEvent('OFFLINE_SYNC_TRIGGERED');
      
    } catch (error) {
      console.error('Offline sync failed:', error);
    }
  }

  // Ticket Management
  async cacheUserTickets() {
    try {
      const response = await fetch('/api/tickets/user', {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });
      
      if (response.ok) {
        const tickets = await response.json();
        await this.storeOfflineData('user-tickets', tickets);
        console.log('User tickets cached for offline access');
        this.trackPWAEvent('TICKETS_CACHED');
      }
    } catch (error) {
      console.error('Failed to cache tickets:', error);
    }
  }

  async getOfflineTickets() {
    const cachedTickets = await this.getOfflineData('user-tickets');
    return cachedTickets.length > 0 ? cachedTickets[0].data : [];
  }

  // Service Worker Update Handling
  handleServiceWorkerUpdate() {
    const newWorker = this.swRegistration.installing;
    
    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        this.showUpdatePrompt();
      }
    });
  }

  showUpdatePrompt() {
    const updatePrompt = document.getElementById('update-prompt');
    if (updatePrompt) {
      updatePrompt.style.display = 'block';
      
      const updateBtn = updatePrompt.querySelector('.update-app');
      if (updateBtn) {
        updateBtn.addEventListener('click', () => {
          this.updateServiceWorker();
          updatePrompt.style.display = 'none';
        });
      }
    }
  }

  updateServiceWorker() {
    if (this.swRegistration && this.swRegistration.waiting) {
      this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }

  // Analytics
  async trackPWAEvent(eventType, eventData = {}) {
    const analyticsData = {
      eventType,
      sessionId: this.getSessionId(),
      url: window.location.href,
      deviceInfo: this.getDeviceInfo(),
      performanceMetrics: this.getPerformanceMetrics(),
      eventData
    };

    try {
      if (this.isOnline) {
        await fetch('/api/pwa/analytics/track', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.getAuthToken()}`
          },
          body: JSON.stringify(analyticsData)
        });
      } else {
        // Store for later sync
        await this.storeOfflineData('pending-analytics', analyticsData);
      }
    } catch (error) {
      console.error('Analytics tracking failed:', error);
    }
  }

  // Utility Functions
  getAuthToken() {
    return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  }

  getSessionId() {
    let sessionId = sessionStorage.getItem('pwa_session_id');
    if (!sessionId) {
      sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('pwa_session_id', sessionId);
    }
    return sessionId;
  }

  getDeviceInfo() {
    return {
      userAgent: navigator.userAgent,
      deviceType: this.getDeviceType(),
      browserName: this.getBrowserName(),
      osName: this.getOSName(),
      screenWidth: screen.width,
      screenHeight: screen.height,
      orientation: screen.orientation ? screen.orientation.type : 'unknown',
      networkType: navigator.connection ? navigator.connection.effectiveType : 'unknown',
      isOnline: navigator.onLine,
      isStandalone: window.matchMedia('(display-mode: standalone)').matches,
      batteryLevel: navigator.getBattery ? 'available' : 'unavailable'
    };
  }

  getDeviceType() {
    const userAgent = navigator.userAgent;
    if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
      return 'tablet';
    }
    if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)) {
      return 'mobile';
    }
    return 'desktop';
  }

  getBrowserName() {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  getOSName() {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS')) return 'iOS';
    return 'Unknown';
  }

  getPerformanceMetrics() {
    if (!window.performance) return {};
    
    const navigation = performance.getEntriesByType('navigation')[0];
    return {
      loadTime: navigation ? navigation.loadEventEnd - navigation.loadEventStart : 0,
      renderTime: navigation ? navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart : 0,
      networkLatency: navigation ? navigation.responseStart - navigation.requestStart : 0,
      memoryUsage: performance.memory ? performance.memory.usedJSHeapSize : 0
    };
  }

  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
}

// Initialize PWA when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.veritixPWA = new VeritixPWA();
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VeritixPWA;
}
