const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');

const serviceAccount = require('/Users/deepsri/Documents/Projects/NSM Portal/backend/serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function run() {
  const snapshot = await db.collection('stores').get();
  let updated = 0;
  
  const batch = db.batch();

  snapshot.forEach(doc => {
    const data = doc.data();
    const status = data.status || 'Unknown';
    if (status.toLowerCase() === 'closed') {
      if (data.isActive === false) {
        const ref = db.collection('stores').doc(doc.id);
        batch.update(ref, { isActive: true });
        updated++;
      }
    }
  });
  
  if (updated > 0) {
    await batch.commit();
    console.log(`Successfully updated ${updated} closed stores to isActive = true.`);
  } else {
    console.log('No closed stores found with isActive = false.');
  }
}
run().catch(console.error);
