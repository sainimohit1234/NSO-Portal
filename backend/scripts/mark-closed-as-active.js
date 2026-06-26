"use strict";
/**
 * One-time script: Set isActive = true for all stores with status CLOSED or Closed.
 *
 * Run with:
 *   npx ts-node -r tsconfig-paths/register scripts/mark-closed-as-active.ts
 *
 * Or via the backend package.json script (if configured).
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const admin = __importStar(require("firebase-admin"));
if (!admin.apps.length) {
    admin.initializeApp({ projectId: 'nso-portal' });
}
const db = admin.firestore();
async function run() {
    console.log('Fetching all stores from Firestore...');
    const snapshot = await db.collection('stores').get();
    const CLOSED_STATUSES = new Set(['CLOSED', 'Closed']);
    const toUpdate = [];
    snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const status = data.status || '';
        const isActive = data.isActive;
        if (CLOSED_STATUSES.has(status) && isActive === false) {
            toUpdate.push(docSnap.id);
        }
    });
    console.log(`Found ${toUpdate.length} closed store(s) that have isActive=false. Updating...`);
    if (toUpdate.length === 0) {
        console.log('Nothing to update.');
        return;
    }
    // Firestore batch limit is 500 ops per commit
    const BATCH_SIZE = 400;
    let updated = 0;
    for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
        const chunk = toUpdate.slice(i, i + BATCH_SIZE);
        const batch = db.batch();
        for (const docId of chunk) {
            const ref = db.collection('stores').doc(docId);
            batch.update(ref, { isActive: true });
        }
        await batch.commit();
        updated += chunk.length;
        console.log(`  Committed batch: ${updated}/${toUpdate.length}`);
    }
    console.log(`\n✅ Done! Marked ${updated} closed store(s) as active (isActive=true).`);
}
run().catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
});
//# sourceMappingURL=mark-closed-as-active.js.map