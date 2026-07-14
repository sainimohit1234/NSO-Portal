import { firebaseAdmin } from '../lib/firebase-admin';
import { logAudit } from '../lib/audit-logger';

export async function getThemes(): Promise<string[]> {
  let themes: string[] = [];
  try {
    const doc = await firebaseAdmin.firestore().collection('system').doc('themes').get();
    if (doc.exists) {
      themes = doc.data()?.urls || [];
    }
  } catch (e) {
    console.error('Failed to fetch themes from Firestore', e);
  }
  return themes;
}

export async function saveThemes(urls: string[]): Promise<void> {
  const oldDoc = await firebaseAdmin.firestore().collection('system').doc('themes').get();
  const oldData = oldDoc.exists ? oldDoc.data()?.urls || [] : [];

  await firebaseAdmin.firestore().collection('system').doc('themes').set({ urls });
  
  await logAudit('Settings', 'Update Custom Themes', oldData, urls);
}
