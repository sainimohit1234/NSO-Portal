const admin = require('firebase-admin');
admin.initializeApp({
  credential: admin.credential.applicationDefault()
});
const db = admin.firestore();
async function check() {
  const snapshot = await db.collection('stores').where('cafeName', '==', 'Got Tea 123').get();
  if (snapshot.empty) {
    console.log("Not found");
  } else {
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log("Store:", data.cafeName);
      console.log("legalMailSentAt:", data.legalMailSentAt);
      console.log("financialMailSentAt:", data.financialMailSentAt);
      console.log("projectMailSentAt:", data.projectMailSentAt);
    });
  }
}
check();
