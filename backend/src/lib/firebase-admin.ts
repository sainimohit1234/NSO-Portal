import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'nso-portal',
    storageBucket: process.env.STORAGE_BUCKET || 'nso-portal.firebasestorage.app'
  });
}

export const firebaseAdmin = admin;

let cachedBucketInstance: any = null;

export async function getActiveBucket() {
  if (cachedBucketInstance) {
    return cachedBucketInstance;
  }

  const customBucketName = process.env.STORAGE_BUCKET;
  if (customBucketName) {
    cachedBucketInstance = admin.storage().bucket(customBucketName);
    return cachedBucketInstance;
  }

  // Try nso-portal.firebasestorage.app
  try {
    const bucket = admin.storage().bucket('nso-portal.firebasestorage.app');
    const [exists] = await bucket.exists();
    if (exists) {
      cachedBucketInstance = bucket;
      return bucket;
    }
  } catch (e) {
    console.warn('Probe for firebasestorage.app bucket failed:', e);
  }

  // Try nso-portal.appspot.com
  try {
    const bucket = admin.storage().bucket('nso-portal.appspot.com');
    const [exists] = await bucket.exists();
    if (exists) {
      cachedBucketInstance = bucket;
      return bucket;
    }
  } catch (e) {
    console.warn('Probe for appspot.com bucket failed:', e);
  }

  // Fallback to default
  cachedBucketInstance = admin.storage().bucket();
  return cachedBucketInstance;
}
