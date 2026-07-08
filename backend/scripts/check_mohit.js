"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const firebase_admin_1 = require("../src/lib/firebase-admin");
async function run() {
    const db = firebase_admin_1.firebaseAdmin.firestore();
    const usersRef = db.collection('users');
    const snapshot = await usersRef.get();
    snapshot.forEach(doc => {
        const data = doc.data();
        if (data.name && data.name.toLowerCase().includes('mohit')) {
            console.log(`User: ${data.name} | Role: ${data.role} | Permissions: ${data.permissions}`);
        }
    });
}
run().catch(console.error);
//# sourceMappingURL=check_mohit.js.map