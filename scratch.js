const { db } = require('./backend/src/utils/firebase');
async function run() {
  const snapshot = await db.collection('stores').where('cafeName', '==', 'FreshTest').get();
  snapshot.forEach(doc => console.log(doc.id, doc.data()));
}
run();
