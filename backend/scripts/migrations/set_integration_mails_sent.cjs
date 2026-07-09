const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const serviceAccount = require('../../service-account.json');
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
const db = admin.firestore();

async function run() {
  const storesSnap = await db.collection('stores').get();
  let updatedCount = 0;
  
  for (const doc of storesSnap.docs) {
    const data = doc.data();
    
    // Set all integration mail statuses to 'Sent' for all existing stores
    const updates = {};
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

  // Update metadata so frontend cache refreshes
  await db.collection('metadata').doc('store_updates').set({ lastUpdated: new Date().toISOString() }, { merge: true });

  console.log(`Updated ${updatedCount} stores with Sent mail statuses.`);
  process.exit(0);
}

run().catch(console.error);
