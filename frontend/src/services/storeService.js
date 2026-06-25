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

  const snapshot = await getDocs(collection(firestore, 'stores'));
  const stores = snapshot.docs.map(normalizeStoreDocument);

  logStoreDebug('Firestore store fetch completed.', {
    count: stores.length
  });

  return Array.isArray(stores) ? stores : [];
}
