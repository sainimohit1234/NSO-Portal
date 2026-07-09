import { firebaseAdmin } from '../../src/lib/firebase-admin';

async function run() {
  const db = firebaseAdmin.firestore();
  const storesSnap = await db.collection('stores').get();
  let updatedCount = 0;
  
  for (const doc of storesSnap.docs) {
    const data = doc.data();
    const updates: any = {};
    if (!data.btZomatoMailStatus) updates.btZomatoMailStatus = 'Sent';
    if (!data.btSwiggyMailStatus) updates.btSwiggyMailStatus = 'Sent';
    if (!data.suchaliZomatoMailStatus) updates.suchaliZomatoMailStatus = 'Sent';
    if (!data.suchaliSwiggyMailStatus) updates.suchaliSwiggyMailStatus = 'Sent';
    if (!data.gotTeaZomatoMailStatus) updates.gotTeaZomatoMailStatus = 'Sent';
    if (!data.gotTeaSwiggyMailStatus) updates.gotTeaSwiggyMailStatus = 'Sent';
    
    if (Object.keys(updates).length > 0) {
      await db.collection('stores').doc(doc.id).update(updates);
      updatedCount++;
    }
  }

  await db.collection('metadata').doc('store_updates').set({ lastUpdated: new Date().toISOString() }, { merge: true });
  console.log(`Updated ${updatedCount} stores with Sent mail statuses.`);
  process.exit(0);
}

run().catch(console.error);
