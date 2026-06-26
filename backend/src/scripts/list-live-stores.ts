import { firebaseAdmin } from '../lib/firebase-admin';

async function main() {
  const db = firebaseAdmin.firestore();
  console.log("Fetching stores from Firestore...");
  const snapshot = await db.collection('stores').get();
  console.log(`Fetched ${snapshot.size} stores.`);

  const liveStores = [];
  
  snapshot.forEach(doc => {
    const data = doc.data();
    const code = (data.cafeCode || '').toUpperCase();
    const isTarget = code.startsWith('CA-') || code.startsWith('GOT-') || code.startsWith('CAGT-');
    const isActive = data.isActive !== false;
    const isLive = data.status === 'LIVE';

    if (isActive && isTarget && isLive) {
      liveStores.push({
        id: doc.id,
        cafeCode: data.cafeCode,
        cafeName: data.cafeName,
        status: data.status,
        isActive: data.isActive
      });
    }
  });

  console.log(`\nTotal Live Outlet Count: ${liveStores.length}`);
  console.log("\nCafe Code List:\n");
  liveStores.sort((a, b) => a.cafeCode.localeCompare(b.cafeCode));
  liveStores.forEach(s => {
    console.log(`${s.cafeCode} - ${s.cafeName}`);
  });
}

main().catch(err => {
  console.error("Error in script:", err);
});
