import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import { auth, firestore } from '../lib/firebase';

const STORE_DEBUG_PREFIX = '[StoreService]';

function logStoreDebug(message, details) {
  if (details !== undefined) {
    console.log(`${STORE_DEBUG_PREFIX} ${message}`, details);
    return;
  }

  console.log(`${STORE_DEBUG_PREFIX} ${message}`);
}

function waitForAuthState() {
  if (auth.currentUser) {
    return Promise.resolve(auth.currentUser);
  }

  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      unsubscribe();
      reject(new Error('Timed out while waiting for authenticated session.'));
    }, 10000);

    const unsubscribe = onAuthStateChanged(
      auth,
      user => {
        window.clearTimeout(timeoutId);
        unsubscribe();

        if (!user) {
          reject(new Error('No authenticated user available for store fetch.'));
          return;
        }

        resolve(user);
      },
      error => {
        window.clearTimeout(timeoutId);
        unsubscribe();
        reject(error);
      }
    );
  });
}

function normalizeStoreDocument(docSnapshot) {
  const data = docSnapshot.data();
  return {
    ...data,
    id: docSnapshot.id
  };
}

export async function fetchStoresFromFirestore() {
  const currentUser = await waitForAuthState();
  logStoreDebug('Fetching stores from Firestore.', {
    uid: currentUser.uid,
    email: currentUser.email || null
  });

  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const metadataDocRef = doc(firestore, 'metadata', 'store_updates');
    const metadataSnap = await getDoc(metadataDocRef);
    const serverLastUpdated = metadataSnap.exists() ? metadataSnap.data().lastUpdated : null;

    const idb = await openIndexedDB();
    const cachedData = await idb.get('stores_cache');

    if (cachedData && serverLastUpdated && cachedData.lastUpdated === serverLastUpdated) {
      logStoreDebug('Cache hit. Returning stores from IndexedDB.', {
        count: cachedData.stores.length,
        lastUpdated: serverLastUpdated
      });
      return cachedData.stores;
    }

    logStoreDebug('Cache miss or data stale. Fetching full collection from Firestore.');
    const snapshot = await getDocs(collection(firestore, 'stores'));
    const stores = snapshot.docs.map(normalizeStoreDocument);

    if (serverLastUpdated) {
      await idb.put('stores_cache', { lastUpdated: serverLastUpdated, stores });
      logStoreDebug('Updated IndexedDB cache.', { lastUpdated: serverLastUpdated });
    }

    return Array.isArray(stores) ? stores : [];
  } catch (error) {
    logStoreDebug('Error in caching mechanism, falling back to direct fetch', { error });
    const snapshot = await getDocs(collection(firestore, 'stores'));
    const stores = snapshot.docs.map(normalizeStoreDocument);
    return Array.isArray(stores) ? stores : [];
  }
}

function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('NSOPortalDB', 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('caches')) {
        db.createObjectStore('caches');
      }
    };
    request.onsuccess = (e) => {
      const db = e.target.result;
      resolve({
        get: (key) => new Promise((res, rej) => {
          const tx = db.transaction('caches', 'readonly');
          const store = tx.objectStore('caches');
          const req = store.get(key);
          req.onsuccess = () => res(req.result);
          req.onerror = () => rej(req.error);
        }),
        put: (key, value) => new Promise((res, rej) => {
          const tx = db.transaction('caches', 'readwrite');
          const store = tx.objectStore('caches');
          const req = store.put(value, key);
          req.onsuccess = () => res();
          req.onerror = () => rej(req.error);
        })
      });
    };
    request.onerror = () => reject(request.error);
  });
}
