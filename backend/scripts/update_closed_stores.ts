import * as admin from 'firebase-admin';
import * as path from 'path';

const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'nso-portal'
});

const db = admin.firestore();

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
