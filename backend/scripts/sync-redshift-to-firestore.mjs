import dotenv from 'dotenv';
import { Pool } from 'pg';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, writeBatch, doc, collection, serverTimestamp, setDoc } from 'firebase/firestore';

dotenv.config({ path: new URL('../.env', import.meta.url) });

const redshiftPool = new Pool({
  host: process.env.REDSHIFT_HOST,
  port: Number(process.env.REDSHIFT_PORT || 5439),
  database: process.env.REDSHIFT_DB_NAME,
  user: process.env.REDSHIFT_USER,
  password: process.env.REDSHIFT_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

const firebaseConfig = {
  apiKey: 'AIzaSyBm1Auo9tyOVGJ6yYUybgRHCqGxPTeDmaA',
  authDomain: 'nso-portal.firebaseapp.com',
  projectId: 'nso-portal',
  storageBucket: 'nso-portal.firebasestorage.app',
  messagingSenderId: '413592965093',
  appId: '1:413592965093:web:6ec023c3f3fdeb8438a90c'
};

const syncEmail = process.env.FIREBASE_SYNC_EMAIL || 'admin@bluetokaicoffee.com';
const syncPassword = process.env.FIREBASE_SYNC_PASSWORD || 'Bluetokai@123';

function normalizeString(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  if (!normalized || normalized === '0' || normalized === '-') return null;
  return normalized;
}

function normalizeNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeEmail(value) {
  const normalized = normalizeString(value)?.toLowerCase() || null;
  return normalized?.includes('@') ? normalized : null;
}

function normalizeDateString(value) {
  const normalized = normalizeString(value);
  if (!normalized) return null;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().split('T')[0];
}

function normalizeTimeString(value) {
  const normalized = normalizeString(value);
  return normalized ? normalized.slice(0, 8) : null;
}

function hashCode(text) {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function inferBrand(row) {
  const cafeMail = normalizeEmail(row.cafe_mail_id) || '';
  const cafeName = normalizeString(row.cafe_name)?.toLowerCase() || '';
  const ownership = normalizeString(row.cafe_ownership)?.toLowerCase() || '';

  if (cafeMail.endsWith('@gottea.in') || cafeName.includes('got tea')) {
    return 'GOT_TEA';
  }

  if (ownership.includes('suchali')) {
    return 'BLUE_TOKAI_SUCHALI';
  }

  return 'BLUE_TOKAI_SUCHALI';
}

function mapStatus(row) {
  const sourceStatus = normalizeString(row.status)?.toUpperCase() || '';

  if (sourceStatus === 'CLOSED') return 'CLOSED';
  if (sourceStatus === 'UPCOMING') return 'UPCOMING';

  const launchDate = normalizeDateString(row.launch_date);
  const today = new Date().toISOString().split('T')[0] || '';
  if (launchDate && launchDate > today) return 'UPCOMING';

  return 'LIVE';
}

function mapRow(row) {
  const cafeCode = normalizeString(row.cafe_code);
  const cafeName = normalizeString(row.cafe_name);

  if (!cafeCode || !cafeName) return null;

  const inferredBrand = inferBrand(row);
  const status = mapStatus(row);
  const latitude = normalizeNumber(row.latitude);
  const longitude = normalizeNumber(row.longitude);
  const launchDate = normalizeDateString(row.launch_date);

  return {
    id: hashCode(cafeCode),
    cafeCode,
    cafeName,
    brand: inferredBrand,
    status,
    isActive: status !== 'CLOSED',
    cafeModel: normalizeString(row.cafe_model),
    cafeAddress: normalizeString(row.address),
    address: normalizeString(row.address),
    city: normalizeString(row.city),
    zone: normalizeString(row.zone),
    location: normalizeString(row.location),
    latitude,
    lat: latitude,
    latt: latitude,
    lng: longitude,
    long: longitude,
    launchDate,
    openingTime: normalizeTimeString(row.opening_time),
    closingTime: normalizeTimeString(row.closing_time),
    cafeOpenTiming: normalizeTimeString(row.opening_time),
    cafeClosingTime: normalizeTimeString(row.closing_time),
    actualClosingTime: normalizeTimeString(row.actual_closing_time),
    phone: normalizeString(row.phone_number),
    cafePhoneNumber: normalizeString(row.phone_number),
    email: normalizeEmail(row.cafe_mail_id),
    cafeMailId: normalizeEmail(row.cafe_mail_id),
    cmMailId: normalizeEmail(row.cm_mail_id),
    ownership: normalizeString(row.cafe_ownership),
    storeType: normalizeString(row.store_type),
    launchStatus: normalizeString(row.comment),
    cafeLaunchMonth: normalizeString(row.cafe_launch_month),
    areaManagerName: normalizeString(row.area_manager_name),
    areaManagerEmail: normalizeEmail(row.area_manager_email),
    areaManagerPhone: normalizeString(row.area_manager_phone),
    cityHeadName: normalizeString(row.city_head_name),
    cityHeadEmail: normalizeEmail(row.city_head_email),
    cityHeadPhone: normalizeString(row.city_head_phone),
    cafeManagerName: normalizeString(row.branch_poc_name),
    cafeManagerMailId: normalizeEmail(row.cm_mail_id),
    cafeManagerContactNo: normalizeString(row.phone_number),
    blueTokaiSwiggyRID: normalizeString(row.swiggy_id_btc),
    suchaliSwiggyRID: normalizeString(row.swiggy_id_suchali),
    blueTokaiZomatoRID: normalizeString(row.zomato_id_btc),
    suchaliZomatoRID: normalizeString(row.zomato_id_suchali),
    gotTeaSwiggyRID: inferredBrand === 'GOT_TEA' ? normalizeString(row.swiggy_id_btc) : null,
    gotTeaZomatoRID: inferredBrand === 'GOT_TEA' ? normalizeString(row.zomato_id_btc) : null,
    newPricingCategory: normalizeString(row.new_pricing_category),
    cafeOpeningHr: normalizeString(row.cafe_opening_hr),
    cluster: normalizeString(row.cluster),
    newPricingSubCategory: normalizeString(row.new_pricing_sub_category),
    platformType: normalizeString(row.platform_type),
    tradingArea: normalizeString(row.trading_area),
    sourceSystem: 'redshift',
    sourceUpdatedAt: serverTimestamp()
  };
}

async function loadRows() {
  const result = await redshiftPool.query(`
    select
      cafe_name, cafe_code, cafe_model, address, city, location, zone, launch_date,
      latitude, longitude, opening_time, closing_time, actual_closing_time,
      phone_number, cafe_mail_id, status, comment, cafe_launch_month,
      cafe_ownership, store_type, store_type_last_month, area_manager_name,
      area_manager_email, area_manager_phone, city_head_name, city_head_email,
      city_head_phone, branch_poc_name, cm_mail_id, swiggy_id_btc,
      swiggy_id_suchali, zomato_id_btc, zomato_id_suchali, type,
      new_pricing_category, cafe_opening_hr, cluster, new_pricing_sub_category,
      platform_type, trading_area
    from btc_sandbox.nso_portal
  `);

  return result.rows;
}

async function main() {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  await signInWithEmailAndPassword(auth, syncEmail, syncPassword);
  console.log(`[Sync] Signed in as ${syncEmail}`);

  await setDoc(
    doc(db, 'users', auth.currentUser.uid),
    {
      id: auth.currentUser.uid,
      email: syncEmail,
      role: 'SUPER_ADMIN',
      approved: true,
      registrationStatus: 'APPROVED',
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
  console.log('[Sync] Ensured Firestore super-admin profile exists for sync user');

  const rows = await loadRows();
  console.log(`[Sync] Loaded ${rows.length} rows from Redshift`);

  let batch = writeBatch(db);
  let batchCount = 0;
  let written = 0;

  for (const row of rows) {
    const mapped = mapRow(row);
    if (!mapped) continue;

    const docRef = doc(collection(db, 'stores'), mapped.cafeCode);
    batch.set(docRef, mapped, { merge: true });
    batchCount += 1;
    written += 1;

    if (batchCount === 400) {
      await batch.commit();
      batch = writeBatch(db);
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  console.log(`[Sync] Wrote ${written} store documents to Firestore`);
  await redshiftPool.end();
}

main().catch(async error => {
  console.error('[Sync] Failed:', error);
  await redshiftPool.end();
  process.exit(1);
});
