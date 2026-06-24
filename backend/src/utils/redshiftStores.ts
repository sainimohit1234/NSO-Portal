import { PrismaClient } from '../lib/prisma-mock';
const { Pool } = require('pg');

type Store = any;

type RedshiftStoreRow = {
  cafe_name?: string | null;
  cafe_code?: string | null;
  cafe_model?: string | null;
  address?: string | null;
  city?: string | null;
  location?: string | null;
  zone?: string | null;
  launch_date?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  opening_time?: string | null;
  closing_time?: string | null;
  actual_closing_time?: string | null;
  phone_number?: string | null;
  cafe_mail_id?: string | null;
  status?: string | null;
  comment?: string | null;
  cafe_launch_month?: string | null;
  cafe_ownership?: string | null;
  store_type?: string | null;
  store_type_last_month?: string | null;
  area_manager_name?: string | null;
  area_manager_email?: string | null;
  area_manager_phone?: string | null;
  city_head_name?: string | null;
  city_head_email?: string | null;
  city_head_phone?: string | null;
  branch_poc_name?: string | null;
  cm_mail_id?: string | null;
  swiggy_id_btc?: string | null;
  swiggy_id_suchali?: string | null;
  zomato_id_btc?: string | null;
  zomato_id_suchali?: string | null;
  type?: string | null;
  new_pricing_category?: string | null;
  cafe_opening_hr?: string | null;
  cluster?: string | null;
  new_pricing_sub_category?: string | null;
  platform_type?: string | null;
  trading_area?: string | null;
};

const redshiftConfig = {
  host: process.env.REDSHIFT_HOST,
  port: process.env.REDSHIFT_PORT ? Number(process.env.REDSHIFT_PORT) : 5439,
  database: process.env.REDSHIFT_DB_NAME,
  user: process.env.REDSHIFT_USER,
  password: process.env.REDSHIFT_PASSWORD,
  ssl: {
    rejectUnauthorized: false
  }
};

const sourceQuery = `
  select
    cafe_name,
    cafe_code,
    cafe_model,
    address,
    city,
    location,
    zone,
    launch_date,
    latitude,
    longitude,
    opening_time,
    closing_time,
    actual_closing_time,
    phone_number,
    cafe_mail_id,
    status,
    comment,
    cafe_launch_month,
    cafe_ownership,
    store_type,
    store_type_last_month,
    area_manager_name,
    area_manager_email,
    area_manager_phone,
    city_head_name,
    city_head_email,
    city_head_phone,
    branch_poc_name,
    cm_mail_id,
    swiggy_id_btc,
    swiggy_id_suchali,
    zomato_id_btc,
    zomato_id_suchali,
    type,
    new_pricing_category,
    cafe_opening_hr,
    cluster,
    new_pricing_sub_category,
    platform_type,
    trading_area
  from btc_sandbox.nso_portal
`;

let pool: any = null;
let lastSyncAt = 0;
const syncIntervalMs = Number(process.env.REDSHIFT_SYNC_INTERVAL_MS || 300000);

function getPool() {
  if (!pool) {
    pool = new Pool(redshiftConfig);
  }

  return pool;
}

function isConfigured() {
  return Boolean(
    redshiftConfig.host &&
      redshiftConfig.database &&
      redshiftConfig.user &&
      redshiftConfig.password
  );
}

function normalizeString(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  if (!normalized || normalized === '0' || normalized === '-') {
    return null;
  }

  return normalized;
}

function normalizeOptionalEmail(value: unknown) {
  const normalized = normalizeString(value)?.toLowerCase() || null;
  return normalized?.includes('@') ? normalized : null;
}

function normalizeNumber(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function normalizeDateString(value: unknown) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().split('T')[0];
}

function normalizeDate(value: unknown) {
  const normalized = normalizeDateString(value);
  if (!normalized) {
    return null;
  }

  return new Date(`${normalized}T00:00:00.000Z`);
}

function normalizeTimeString(value: unknown) {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, 8);
}

function inferBrand(row: RedshiftStoreRow) {
  const cafeMail = normalizeOptionalEmail(row.cafe_mail_id) || '';
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

function mapSourceStatusToAppStatus(row: RedshiftStoreRow, currentStatus?: string | null) {
  const sourceStatus = normalizeString(row.status)?.toUpperCase() || '';
  const preservedWorkflowStatuses = [
    'PENDING_APPROVAL',
    'NSO_APPROVED',
    'APPROVED',
    'COMPLIANCE_APPROVED',
    'ON_HOLD',
    'INCOMPLETE_INFORMATION'
  ];

  if (currentStatus && preservedWorkflowStatuses.includes(currentStatus)) {
    return currentStatus;
  }

  if (sourceStatus === 'CLOSED') {
    return 'CLOSED';
  }

  if (sourceStatus === 'UPCOMING') {
    return 'UPCOMING';
  }

  const launchDate = normalizeDateString(row.launch_date);
  if (launchDate) {
    const today = new Date().toISOString().split('T')[0] || '';
    if (launchDate > today) {
      return 'UPCOMING';
    }
  }

  return 'LIVE';
}

function mapRowToStoreData(row: RedshiftStoreRow, existingStore?: Store | null) {
  const launchDate = normalizeDate(row.launch_date);
  const cafeCode = normalizeString(row.cafe_code);
  const cafeName = normalizeString(row.cafe_name);

  if (!cafeCode || !cafeName) {
    return null;
  }

  const latitude = normalizeNumber(row.latitude);
  const longitude = normalizeNumber(row.longitude);
  const cafeMailId = normalizeOptionalEmail(row.cafe_mail_id);
  const cmMailId = normalizeOptionalEmail(row.cm_mail_id);
  const platformType = normalizeString(row.platform_type);
  const storeType = normalizeString(row.store_type);
  const inferredBrand = inferBrand(row);

  return {
    cafeCode,
    cafeName,
    brand: inferredBrand,
    status: mapSourceStatusToAppStatus(row, existingStore?.status),
    isActive: mapSourceStatusToAppStatus(row, existingStore?.status) !== 'CLOSED',
    cafeModel: normalizeString(row.cafe_model),
    cafeAddress: normalizeString(row.address),
    address: normalizeString(row.address),
    city: normalizeString(row.city),
    state: existingStore?.state || null,
    zone: normalizeString(row.zone),
    location: normalizeString(row.location),
    cafeLocationGoogleLink: existingStore?.cafeLocationGoogleLink || null,
    latitude,
    lat: latitude,
    latt: latitude,
    lng: longitude,
    long: longitude,
    openingTime: normalizeTimeString(row.opening_time),
    closingTime: normalizeTimeString(row.closing_time),
    cafeOpenTiming: normalizeTimeString(row.opening_time),
    cafeClosingTime: normalizeTimeString(row.closing_time),
    actualClosingTime: normalizeTimeString(row.actual_closing_time),
    phone: normalizeString(row.phone_number),
    cafePhoneNumber: normalizeString(row.phone_number),
    email: cafeMailId,
    cafeMailId,
    cmMailId,
    ownership: normalizeString(row.cafe_ownership),
    storeType,
    launchDate,
    launchStatus: normalizeString(row.comment),
    remarks: existingStore?.remarks || normalizeString(row.comment),
    cafeLaunchMonth: normalizeString(row.cafe_launch_month),
    areaManagerName: normalizeString(row.area_manager_name),
    areaManagerEmail: normalizeOptionalEmail(row.area_manager_email),
    areaManagerPhone: normalizeString(row.area_manager_phone),
    cityHeadName: normalizeString(row.city_head_name),
    cityHeadEmail: normalizeOptionalEmail(row.city_head_email),
    cityHeadPhone: normalizeString(row.city_head_phone),
    cafeManagerName: normalizeString(row.branch_poc_name),
    cafeManagerMailId: cmMailId,
    cafeManagerContactNo: normalizeString(row.phone_number),
    blueTokaiSwiggyRID: normalizeString(row.swiggy_id_btc),
    suchaliSwiggyRID: normalizeString(row.swiggy_id_suchali),
    blueTokaiZomatoRID: normalizeString(row.zomato_id_btc),
    suchaliZomatoRID: normalizeString(row.zomato_id_suchali),
    gotTeaSwiggyRID: inferredBrand === 'GOT_TEA' ? normalizeString(row.swiggy_id_btc) : existingStore?.gotTeaSwiggyRID || null,
    gotTeaZomatoRID: inferredBrand === 'GOT_TEA' ? normalizeString(row.zomato_id_btc) : existingStore?.gotTeaZomatoRID || null,
    newPricingCategory: normalizeString(row.new_pricing_category),
    cafeOpeningHr: normalizeString(row.cafe_opening_hr),
    cluster: normalizeString(row.cluster),
    newPricingSubCategory: normalizeString(row.new_pricing_sub_category),
    platformType,
    tradingArea: normalizeString(row.trading_area),
    menu: existingStore?.menu || null,
    mailStatus: existingStore?.mailStatus || 'Pending for S/Z',
    isMailLocked: existingStore?.isMailLocked ?? false
  };
}

export async function fetchRedshiftStores() {
  if (!isConfigured()) {
    return [];
  }

  const result = await getPool().query(sourceQuery);
  return result.rows;
}

export async function upsertStore(prisma: any, record: any, forceUpdate = false) {
  if (!isConfigured()) {
    return { synced: 0, skipped: true };
  }

  if (!forceUpdate && Date.now() - lastSyncAt < syncIntervalMs) {
    return { synced: 0, skipped: true };
  }

  const rows = await fetchRedshiftStores();
  let synced = 0;

  for (const row of rows) {
    const cafeCode = normalizeString(row.cafe_code);
    const cafeName = normalizeString(row.cafe_name);

    if (!cafeCode || !cafeName) {
      continue;
    }

    const existingStore = await prisma.store.findUnique({
      where: { cafeCode }
    });

    const mappedData = mapRowToStoreData(row, existingStore);
    if (!mappedData) {
      continue;
    }

    await prisma.store.upsert({
      where: { cafeCode },
      create: mappedData,
      update: mappedData
    });

    synced += 1;
  }

  lastSyncAt = Date.now();
  return { synced, skipped: false };
}

export function hasRedshiftStoreConfig() {
  return isConfigured();
}
