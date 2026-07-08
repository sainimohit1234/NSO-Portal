"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const firebase_admin_1 = require("../src/lib/firebase-admin");
async function run() {
    const db = firebase_admin_1.firebaseAdmin.firestore();
    const usersRef = db.collection('users');
    const snapshot = await usersRef.get();
    let updated = false;
    for (const doc of snapshot.docs) {
        const data = doc.data();
        if (data.name && data.name.toLowerCase().includes('mohit')) {
            let perms = data.permissions || '';
            const list = perms.split(',').map(p => p.trim()).filter(p => p);
            if (!list.includes('APPROVER')) {
                list.push('APPROVER');
                if (!list.includes('nso_approval'))
                    list.push('nso_approval');
                if (!list.includes('nso_approval:APPROVER'))
                    list.push('nso_approval:APPROVER');
                await doc.ref.update({ permissions: list.join(',') });
                console.log(`Updated permissions for ${data.name}: ${list.join(',')}`);
                updated = true;
            }
            else {
                console.log(`${data.name} already has APPROVER permission.`);
            }
        }
    }
    if (!updated)
        console.log('No user needed updates.');
}
run().catch(console.error);
//# sourceMappingURL=fix_mohit.js.map