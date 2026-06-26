import { firebaseAdmin } from '../lib/firebase-admin';

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchPincodeDetails(pincode: string) {
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
    if (!res.ok) return null;
    const data: any = await res.json();
    if (data && data[0] && data[0].Status === 'Success') {
      const postOfficeList = data[0].PostOffice;
      if (postOfficeList && postOfficeList.length > 0) {
        return {
          city: postOfficeList[0].District,
          state: postOfficeList[0].State
        };
      }
    }
  } catch (err) {
    console.error(`Error fetching pincode ${pincode}:`, err);
  }
  return null;
}

async function main() {
  const db = firebaseAdmin.firestore();
  console.log("Fetching stores from Firestore...");
  const snapshot = await db.collection('stores').get();
  console.log(`Fetched ${snapshot.size} stores.`);

  let updatedCount = 0;
  let skippedCount = 0;

  for (const doc of snapshot.docs) {
    const store = doc.data();
    const id = doc.id;
    const cafeName = store.cafeName || 'Untitled Café';
    const cafeCode = store.cafeCode || 'No Code';
    const addressText = store.cafeAddress || store.address || '';

    // Search for a 6-digit PIN code in the address
    const match = addressText.match(/\b\d{6}\b/);
    if (!match) {
      skippedCount++;
      continue;
    }

    const extractedPin = match[0];
    const currentPin = store.pinCode || '';
    const currentCity = store.city || '';
    const currentState = store.state || '';

    // We migrate if PIN is not saved, or if City/State are empty or contain State name in City field
    // (e.g. city field equal to UP/Haryana and state field being empty)
    const isStateInCity = ['up', 'haryana', 'uttar pradesh', 'delhi', 'punjab', 'maharashtra', 'karnataka', 'tamil nadu'].includes(currentCity.toLowerCase());
    const needsUpdate = !currentPin || currentPin !== extractedPin || !currentCity || !currentState || isStateInCity;

    if (!needsUpdate) {
      skippedCount++;
      continue;
    }

    console.log(`\nResolving PIN ${extractedPin} for "${cafeName}" (${cafeCode})...`);
    
    // Add rate-limiting delay between requests
    await delay(300);
    const details = await fetchPincodeDetails(extractedPin);

    if (details) {
      const updates = {
        pinCode: extractedPin,
        city: details.city,
        state: details.state
      };
      
      await db.collection('stores').doc(id).update(updates);
      console.log(`✅ Updated: Pin=${extractedPin}, City="${details.city}", State="${details.state}"`);
      updatedCount++;
    } else {
      // If postal lookup failed, we still populate the pinCode
      await db.collection('stores').doc(id).update({ pinCode: extractedPin });
      console.log(`⚠️ Updated only PIN (Lookup Failed): Pin=${extractedPin}`);
      updatedCount++;
    }
  }

  console.log(`\nMigration completed: ${updatedCount} stores updated, ${skippedCount} skipped.`);
}

main().catch(err => {
  console.error("Migration failed:", err);
});
