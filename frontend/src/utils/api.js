import axios from 'axios';
import { auth } from '../lib/firebase';

export function normalizeListResponse(payload, preferredKeys = []) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== 'object') {
    return [];
  }

  for (const key of preferredKeys) {
    if (Array.isArray(payload[key])) {
      return payload[key];
    }
  }

  const firstArrayValue = Object.values(payload).find(Array.isArray);
  return Array.isArray(firstArrayValue) ? firstArrayValue : [];
}

const apiClient = axios.create();

apiClient.interceptors.request.use(async (config) => {
  if (auth.currentUser) {
    try {
      // getIdToken() returns the cached token instantly and refreshes only when
      // it is expired/near-expiry. Forcing a refresh on every call added a
      // network round-trip to Firebase Auth before each request (major latency).
      const token = await auth.currentUser.getIdToken();
      config.headers['Authorization'] = `Bearer ${token}`;
    } catch (error) {
      console.error('Failed to get Firebase ID token:', error);
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default apiClient;
