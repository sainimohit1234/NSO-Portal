import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { beforeAll, afterAll, beforeEach, describe, test } from 'vitest';

const rulesPath = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'firestore.rules');
const [emuHost, emuPort] = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080').split(':');

const ADMIN_EMAIL = 'admin@bluetokaicoffee.com';

let testEnv;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-nso-portal',
    firestore: { rules: readFileSync(rulesPath, 'utf8'), host: emuHost, port: Number(emuPort) },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  // Seed baseline docs with rules bypassed.
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users', 'alice'), {
      id: 'alice', email: 'alice@bluetokaicoffee.com', name: 'Alice', phone: '',
      role: 'USER', permissions: '', approved: false, registrationStatus: 'PENDING',
    });
    await setDoc(doc(db, 'users', 'bob'), {
      id: 'bob', email: 'bob@bluetokaicoffee.com', name: 'Bob', phone: '',
      role: 'USER', permissions: '', approved: true, registrationStatus: 'APPROVED',
    });
    await setDoc(doc(db, 'users', 'super1'), {
      id: 'super1', email: 'super@bluetokaicoffee.com', name: 'Super', phone: '',
      role: 'SUPER_ADMIN', permissions: '', approved: true, registrationStatus: 'APPROVED',
    });
    await setDoc(doc(db, 'stores', 's1'), { cafeName: 'Cafe One', status: 'LIVE', isActive: true });
  });
});

const asUser = (uid, email) => testEnv.authenticatedContext(uid, { email }).firestore();
const asAnon = () => testEnv.unauthenticatedContext().firestore();

describe('users: privilege escalation is blocked (Sprint 1 fix)', () => {
  test('owner CANNOT promote their own role', async () => {
    const db = asUser('alice', 'alice@bluetokaicoffee.com');
    await assertFails(updateDoc(doc(db, 'users', 'alice'), { role: 'SUPER_ADMIN' }));
  });
  test('owner CANNOT self-approve', async () => {
    const db = asUser('alice', 'alice@bluetokaicoffee.com');
    await assertFails(updateDoc(doc(db, 'users', 'alice'), { approved: true, registrationStatus: 'APPROVED' }));
  });
  test('owner CANNOT grant themselves permissions', async () => {
    const db = asUser('alice', 'alice@bluetokaicoffee.com');
    await assertFails(updateDoc(doc(db, 'users', 'alice'), { permissions: 'store_control_center' }));
  });
});

describe('users: legitimate flows still work', () => {
  test('owner CAN edit non-privileged profile fields (name/phone)', async () => {
    const db = asUser('alice', 'alice@bluetokaicoffee.com');
    await assertSucceeds(updateDoc(doc(db, 'users', 'alice'), { name: 'Alice Updated', phone: '9999999999' }));
  });
  test('self-registration as an unprivileged USER is allowed', async () => {
    const db = asUser('carol', 'carol@bluetokaicoffee.com');
    await assertSucceeds(setDoc(doc(db, 'users', 'carol'), {
      id: 'carol', email: 'carol@bluetokaicoffee.com', name: 'Carol',
      role: 'USER', permissions: '', approved: false, registrationStatus: 'PENDING',
    }));
  });
  test('self-registration CANNOT create a privileged (SUPER_ADMIN) profile', async () => {
    const db = asUser('mallory', 'mallory@bluetokaicoffee.com');
    await assertFails(setDoc(doc(db, 'users', 'mallory'), {
      id: 'mallory', email: 'mallory@bluetokaicoffee.com', role: 'SUPER_ADMIN', approved: false,
    }));
  });
  test('self-registration CANNOT create a pre-approved profile', async () => {
    const db = asUser('mallory', 'mallory@bluetokaicoffee.com');
    await assertFails(setDoc(doc(db, 'users', 'mallory'), {
      id: 'mallory', email: 'mallory@bluetokaicoffee.com', role: 'USER', approved: true,
    }));
  });
  test('the seed admin email may bootstrap itself as SUPER_ADMIN', async () => {
    const db = asUser('adminboot', ADMIN_EMAIL);
    await assertSucceeds(setDoc(doc(db, 'users', 'adminboot'), {
      id: 'adminboot', email: ADMIN_EMAIL, role: 'SUPER_ADMIN', approved: true, registrationStatus: 'APPROVED',
    }));
  });
});

describe('users: super-admin retains full control', () => {
  test('super-admin CAN change another user role/approval', async () => {
    const db = asUser('super1', 'super@bluetokaicoffee.com');
    await assertSucceeds(updateDoc(doc(db, 'users', 'alice'), { role: 'MANAGER', approved: true, registrationStatus: 'APPROVED' }));
  });
  test('super-admin CAN read any user; a regular user CANNOT read another user', async () => {
    await assertSucceeds(getDoc(doc(asUser('super1', 'super@bluetokaicoffee.com'), 'users', 'alice')));
    await assertFails(getDoc(doc(asUser('alice', 'alice@bluetokaicoffee.com'), 'users', 'bob')));
  });
});

describe('stores: read open to signed-in, writes super-admin-only', () => {
  test('signed-in user CAN read a store', async () => {
    await assertSucceeds(getDoc(doc(asUser('alice', 'alice@bluetokaicoffee.com'), 'stores', 's1')));
  });
  test('unauthenticated user CANNOT read a store', async () => {
    await assertFails(getDoc(doc(asAnon(), 'stores', 's1')));
  });
  test('non-super-admin CANNOT write a store directly', async () => {
    const db = asUser('alice', 'alice@bluetokaicoffee.com');
    await assertFails(setDoc(doc(db, 'stores', 's2'), { cafeName: 'Hacked', status: 'LIVE' }));
  });
  test('super-admin CAN write a store directly', async () => {
    const db = asUser('super1', 'super@bluetokaicoffee.com');
    await assertSucceeds(setDoc(doc(db, 'stores', 's2'), { cafeName: 'New Cafe', status: 'IN_PIPELINE' }));
  });
});

describe('default deny', () => {
  test('an unknown collection is not readable or writable', async () => {
    const db = asUser('alice', 'alice@bluetokaicoffee.com');
    await assertFails(getDoc(doc(db, 'secrets', 'x')));
    await assertFails(setDoc(doc(db, 'secrets', 'x'), { a: 1 }));
  });
});
