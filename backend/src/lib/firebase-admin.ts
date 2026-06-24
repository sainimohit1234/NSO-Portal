import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'nso-portal',
  });
}

export const firebaseAdmin = admin;
