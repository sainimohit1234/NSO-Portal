import { firebaseAdmin } from '../lib/firebase-admin';

const db = firebaseAdmin.firestore();

/**
 * Retrieves the message ID of the initial email sent for a given Cafe Code from Firestore.
 * Returns null if no thread exists.
 */
export async function getThreadMessageId(cafeCode: string): Promise<string | null> {
  try {
    const docRef = db.collection('emailThreads').doc(cafeCode);
    const docSnap = await docRef.get();
    if (docSnap.exists) {
      const data = docSnap.data();
      return data?.messageId || null;
    }
  } catch (e) {
    console.error('Failed to get thread message ID from Firestore', e);
  }
  return null;
}

/**
 * Saves the message ID of the initial email sent for a given Cafe Code in Firestore.
 */
export async function saveThreadMessageId(cafeCode: string, messageId: string): Promise<void> {
  try {
    const docRef = db.collection('emailThreads').doc(cafeCode);
    await docRef.set({
      messageId,
      updatedAt: new Date().toISOString()
    });
  } catch (e) {
    console.error('Failed to save thread message ID to Firestore', e);
  }
}
