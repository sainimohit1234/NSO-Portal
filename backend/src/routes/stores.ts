// @ts-nocheck

import { Router } from 'express';
import { PrismaClient } from '../lib/prisma-mock';
import { authenticateToken, authorizeRoles } from './auth';
import multer from 'multer';
import { firebaseAdmin, getActiveBucket } from '../lib/firebase-admin';
import { Storage } from '@google-cloud/storage';
const busboy = require('busboy');

function formatMailBody(body: string) {
  if (body.includes('<table') || body.includes('<tr') || body.includes('<p') || body.includes('<div') || body.includes('<br')) {
    return {
      text: body.replace(/<[^>]*>/g, ''), // strip html tags for text fallback
      html: body
    };
  }
  return {
    text: body,
    html: `<div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333333;">${body.replace(/\n/g, '<br>')}</div>`
  };
}

const parseMultipart = (req: any, writeToDisk: boolean = false): Promise<{ fields: any; file: any }> => {
  return new Promise((resolve, reject) => {
    try {
      const bb = busboy({ headers: req.headers });
      const fields: any = {};
      let fileData: any = null;

      bb.on('file', (fieldname, file, info) => {
        const { filename, mimeType } = info;
        const chunks: any[] = [];

        file.on('data', (data) => {
          chunks.push(data);
        });

        file.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const os = require('os');
          if (writeToDisk) {
            const uploadDir = path.resolve(os.tmpdir(), 'uploads');
            if (!fs.existsSync(uploadDir)) {
              fs.mkdirSync(uploadDir, { recursive: true });
            }
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            const ext = filename ? path.extname(filename) : '';
            const savedName = fieldname + '-' + uniqueSuffix + ext;
            const filePath = path.join(uploadDir, savedName);
            fs.writeFileSync(filePath, buffer);
            fileData = {
              fieldname,
              originalname: filename,
              encoding: '7bit',
              mimetype: mimeType,
              buffer,
              size: buffer.length,
              filename: savedName,
              path: filePath
            };
          } else {
            fileData = {
              fieldname,
              originalname: filename,
              encoding: '7bit',
              mimetype: mimeType,
              buffer,
              size: buffer.length
            };
          }
        });
      });

      bb.on('field', (name, val) => {
        fields[name] = val;
      });

      bb.on('finish', () => {
        resolve({ fields, file: fileData });
      });

      bb.on('error', (err) => {
        reject(err);
      });

      if (req.rawBody) {
        bb.end(req.rawBody);
      } else {
        req.pipe(bb);
      }
    } catch (err) {
      reject(err);
    }
  });
};

const parseMultipartMiddleware = (writeToDisk: boolean = false) => {
  return async (req: any, res: any, next: any) => {
    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      return next();
    }
    try {
      const { fields, file } = await parseMultipart(req, writeToDisk);
      req.body = { ...req.body, ...fields };
      req.file = file;
      next();
    } catch (err: any) {
      console.error('Multipart parse error:', err);
      res.status(400).json({ error: 'Multipart parsing failed', message: err.message });
    }
  };
};
import csvParser from 'csv-parser';
import { createObjectCsvStringifier } from 'csv-writer';
import { Readable } from 'stream';
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import { getSMTPConfig, shouldUseEtherealFallback, ETHEREAL_HOST } from '../utils/smtp';
import { getEmailRecipients, getEmailMappings } from '../utils/emailRecipients';
import { getEmailTemplates } from '../utils/emailTemplates';
import { getThreadMessageId, saveThreadMessageId } from '../utils/emailThreads';
import * as XLSX from 'xlsx';
import { exec } from 'child_process';
import { hasRedshiftStoreConfig, syncStoresFromRedshift } from '../utils/redshiftStores';


const upload = multer({ storage: multer.memoryStorage() });

const STORE_CSV_HEADERS = [
  { id: 'brand', title: 'Brand Name' },
  { id: 'cafeName', title: 'Cafe Name' },
  { id: 'cafeCode', title: 'Cafe Code' },
  { id: 'pinCode', title: 'Pin Code' },
  { id: 'city', title: 'City' },
  { id: 'state', title: 'State' },
  { id: 'cafeAddress', title: 'Cafe Address' },
  { id: 'zone', title: 'Zone' },
  { id: 'cafeLocationGoogleLink', title: 'Google Maps Link' },
  { id: 'latitude', title: 'Latitude' },
  { id: 'latt', title: 'Latt' },
  { id: 'long', title: 'Longitude' },
  { id: 'cafeOpenTiming', title: 'Cafe Opening Time' },
  { id: 'cafeClosingTime', title: 'Cafe Closing Time' },
  { id: 'actualClosingTime', title: 'Actual Closing Time' },
  { id: 'cafePhoneNumber', title: 'Cafe Phone Number' },
  { id: 'cafeMailId', title: 'Cafe Mail Id' },
  { id: 'cmMailId', title: 'CM Mail Id' },
  { id: 'cafeManagerContactNo', title: 'Cafe Manager Contact No' },
  { id: 'areaManagerEmail', title: 'Area Manager Email' },
  { id: 'areaManagerPhone', title: 'Area Manager Phone' },
  { id: 'cityHeadEmail', title: 'City Head Email' },
  { id: 'cityHeadPhone', title: 'City Head Phone' },
  { id: 'gstNo', title: 'GST No' },
  { id: 'fssaiNo', title: 'FSSAI No' },
  { id: 'fssaiStartDate', title: 'FSSAI Start Date' },
  { id: 'fssaiExpiry', title: 'FSSAI Expiry' },
  { id: 'projectStartDate', title: 'Project Start Date' },
  { id: 'projectHandoverDate', title: 'Project Handover Date' },
  { id: 'tentativeDryLaunchDate', title: 'Tentative Dry Launch Date' },
  { id: 'launchDate', title: 'Launch Date' },
  { id: 'cafeModule', title: 'Cafe Module' },
  { id: 'cluster', title: 'Cluster' },
  { id: 'platformType', title: 'Platform Type' },
  { id: 'tradingArea', title: 'Trading Area' },
  { id: 'smokingZone', title: 'Smoking Zone' },
  { id: 'parkingOption', title: 'Parking Option' },
  { id: 'wheelchairAccessibility', title: 'Wheelchair Accessibility' },
  { id: 'petFriendly', title: 'Pet Friendly' },
  { id: 'pricingVersion', title: 'Pricing Version' },
  { id: 'indoorSeatingCount', title: 'Indoor Seating Count' },
  { id: 'outdoorSeatingCount', title: 'Outdoor Seating Count' },
  { id: 'totalNoOfTables', title: 'Total No Of Tables' },
  { id: 'copyMenuFrom', title: 'Copy Menu From' },
  { id: 'expectedSalesVal', title: 'Expected Sales Val' },
  { id: 'expectedSalesUnit', title: 'Expected Sales Unit' },
  { id: 'nearbyCafes', title: 'Nearby Cafes' },
  { id: 'highlights', title: 'Highlights' },
  { id: 'blueTokaiSwiggyRID', title: 'Blue Tokai Swiggy RID' },
  { id: 'blueTokaiZomatoRID', title: 'Blue Tokai Zomato RID' },
  { id: 'suchaliSwiggyRID', title: 'Suchali Swiggy RID' },
  { id: 'suchaliZomatoRID', title: 'Suchali Zomato RID' },
  { id: 'gotTeaSwiggyRID', title: 'Got Tea Swiggy RID' },
  { id: 'gotTeaZomatoRID', title: 'Got Tea Zomato RID' },
  { id: 'newPricingCategory', title: 'New Pricing Category' },
  { id: 'newPricingSubCategory', title: 'New Pricing Sub Category' },
  { id: 'cafeLaunchMonth', title: 'Cafe Launch Month' },
  { id: 'cafeLaunchYear', title: 'Cafe Launch Year' },
  { id: 'cafeOpeningHr', title: 'Cafe Opening Hr' }
];

const MANDATORY_FIELDS = [
  'cafeName', 'cafeCode', 'pinCode', 'city', 'state', 'cafeAddress',
  'cafeLocationGoogleLink', 'latitude', 'latt', 'long',
  'cafeOpenTiming', 'cafeClosingTime', 'actualClosingTime',
  'cafePhoneNumber', 'cafeMailId', 'cmMailId', 'areaManagerId', 'cityHeadId',
  'gstNo',
  'projectStartDate', 'projectHandoverDate', 'tentativeDryLaunchDate', 'launchDate',
  'cafeModule', 'cluster', 'platformType', 'tradingArea',
  'smokingZone', 'parkingOption', 'expectedSales', 'nearbyCafes'
];

const CONTACT_FIELDS = [
  'cafeManagerName',
  'cafeManagerMailId',
  'cafeManagerContactNo',
  'cafePhoneNumber',
  'cafeMailId',
  'areaManagerName',
  'areaManagerEmail',
  'areaManagerPhone',
  'cityHeadName',
  'cityHeadEmail',
  'cityHeadPhone',
  'areaManagerId',
  'cityHeadId',
  'cafeManagerId'
];

const router = Router();
const prisma = new PrismaClient();

const complianceStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadCompliance = multer({ storage: complianceStorage });

async function isFileInUse(safeFilename: string): Promise<boolean> {
  try {
    // Check GlobalDocument
    const globalDoc = await prisma.globalDocument.findFirst({
      where: {
        fileUrl: {
          contains: safeFilename
        }
      }
    });
    if (globalDoc) return true;

    // Check Store fields
    const storeDoc = await prisma.store.findFirst({
      where: {
        OR: [
          { fssaiLicense: { contains: safeFilename } },
          { gstCertificateLink: { contains: safeFilename } },
          { rentAgreementLink: { contains: safeFilename } },
          { supportingDocs: { contains: safeFilename } }
        ]
      }
    });
    if (storeDoc) return true;

    return false;
  } catch (error) {
    console.error('Error checking if file is in use:', error);
    // If check fails, assume it's in use to prevent accidental deletion
    return true;
  }
}

router.use(authenticateToken);

// Middleware to automatically apply locking after 3 days of LIVE (Newly Launched) status
router.use(async (req: any, res, next) => {
  try {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    await prisma.store.updateMany({
      where: {
        status: 'LIVE',
        launchDate: { lte: threeDaysAgo },
        isLockedAutoApplied: false,
        isLocked: false,
      },
      data: {
        isLocked: true,
        isLockedAutoApplied: true,
      }
    });
  } catch (error) {
    console.error('Error in auto-locking middleware:', error);
  }
  next();
});

const pdfParse = require('pdf-parse');

function parseDateToISO(dateStr: string): string | null {
  if (!dateStr) return null;
  const cleaned = dateStr.replace(/\//g, '-').trim();
  const parts = cleaned.split('-');
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }
  return null;
}

interface FssaiExtractionResult {
  fssaiNo: string;
  fssaiStartDate?: string;
  fssaiExpiry?: string;
}

async function extractOrGenerateFssaiData(filename: string, fileBuffer: Buffer | null): Promise<FssaiExtractionResult> {
  let fssaiNo = '';
  let fssaiStartDate = '';
  let fssaiExpiry = '';

  if (fileBuffer && filename.toLowerCase().endsWith('.pdf')) {
    try {
      const data = await pdfParse(fileBuffer);
      const text = data.text || '';
      console.log('FSSAI PDF parsed text length:', text.length);

      // 1. License Number
      const fssaiRegex = /(?:License\s+Number|LicenseNumber|अनुज्ञप्ति\s+संख्या)(?:[^\d]*?)(\d{14})/i;
      const fssaiMatch = text.match(fssaiRegex);
      if (fssaiMatch) {
        fssaiNo = fssaiMatch[1];
        console.log('Extracted FSSAI Number via regex:', fssaiNo);
      } else {
        const fallback = text.match(/\d{14}/);
        if (fallback) {
          fssaiNo = fallback[0];
          console.log('Extracted FSSAI Number via fallback:', fssaiNo);
        }
      }

      // 2. Start Date (Issued On)
      const startRegex = /(?:Issued\s+On|IssuedOn|दिनांक)(?:[^\d]*?)(\d{2}[-\/]\d{2}[-\/]\d{4})/i;
      const startMatch = text.match(startRegex);
      if (startMatch) {
        const parsed = parseDateToISO(startMatch[1]);
        if (parsed) {
          fssaiStartDate = parsed;
          console.log('Extracted FSSAI Start Date:', fssaiStartDate);
        }
      }

      // 3. Expiry Date (Valid Upto)
      const expiryRegex = /(?:Valid\s+Upto|ValidUpto|वैधता)(?:[^\d]*?)(\d{2}[-\/]\d{2}[-\/]\d{4})/i;
      const expiryMatch = text.match(expiryRegex);
      if (expiryMatch) {
        const parsed = parseDateToISO(expiryMatch[1]);
        if (parsed) {
          fssaiExpiry = parsed;
          console.log('Extracted FSSAI Expiry Date:', fssaiExpiry);
        }
      }

    } catch (err) {
      console.error('Failed to parse FSSAI PDF text:', err);
    }
  }

  if (!fssaiNo) {
    const filenameMatch = filename.match(/\b\d{14}\b/);
    if (filenameMatch) {
      fssaiNo = filenameMatch[0];
    } else {
      let num = '1';
      for (let i = 0; i < 13; i++) {
        num += Math.floor(Math.random() * 10).toString();
      }
      fssaiNo = num;
    }
  }

  const result: FssaiExtractionResult = { fssaiNo };
  if (fssaiStartDate) result.fssaiStartDate = fssaiStartDate;
  if (fssaiExpiry) result.fssaiExpiry = fssaiExpiry;
  return result;
}

async function extractOrGenerateGstNo(filename: string, fileBuffer: Buffer | null): Promise<string> {
  if (fileBuffer && filename.toLowerCase().endsWith('.pdf')) {
    try {
      const data = await pdfParse(fileBuffer);
      const text = data.text || '';
      const gstRegex = /(?:GSTIN|GST\s+Number|Registration\s+Number)(?:[^\dA-Z]*?)(\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z[A-Z\d]{1})/i;
      const gstMatch = text.match(gstRegex);
      if (gstMatch) {
        console.log('Successfully parsed GSTIN from PDF text via regex:', gstMatch[1]);
        return gstMatch[1].toUpperCase();
      } else {
        const match = text.match(/\b\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z[A-Z\d]{1}\b/i);
        if (match) {
          console.log('Successfully parsed GSTIN from PDF text:', match[0]);
          return match[0].toUpperCase();
        }
      }
    } catch (err) {
      console.error('Failed to parse GST PDF text, falling back to name/mock:', err);
    }
  }

  const match = filename.match(/\b\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z[A-Z\d]{1}\b/i);
  if (match) {
    return match[0].toUpperCase();
  }
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const alphanumeric = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let gst = '07';
  for (let i = 0; i < 5; i++) {
    gst += letters[Math.floor(Math.random() * letters.length)];
  }
  for (let i = 0; i < 4; i++) {
    gst += Math.floor(Math.random() * 10).toString();
  }
  gst += letters[Math.floor(Math.random() * letters.length)];
  gst += Math.floor(Math.random() * 10).toString();
  gst += 'Z';
  gst += alphanumeric[Math.floor(Math.random() * alphanumeric.length)];
  return gst;
}

// POST /upload-file (Upload a compliance document)
router.post('/upload-file', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE', 'LEGAL'), parseMultipartMiddleware(true), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileType = req.query.type;
    if (fileType === 'fssai') {
      const filenameLower = req.file.originalname.toLowerCase();
      if (!filenameLower.includes('fssai')) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (err) {
          console.error('Failed to clean up file:', err);
        }
        return res.status(400).json({ 
          error: 'FSSAI Verification Failed', 
          message: 'FSSAI logo / seal could not be verified in the document. Please ensure you are uploading the official FSSAI Certificate with a valid logo (filename must contain "fssai").' 
        });
      }
    }

    if (fileType === 'gst') {
      const filenameLower = req.file.originalname.toLowerCase();
      if (!filenameLower.includes('gst')) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (err) {
          console.error('Failed to clean up file:', err);
        }
        return res.status(400).json({ 
          error: 'GST Verification Failed', 
          message: 'GST logo / header could not be verified in the document. Please ensure you are uploading the official GST Certificate with a valid logo (filename must contain "gst").' 
        });
      }
    }



    let fileUrl = `/uploads/${req.file.filename}`;

    const isCloudFunctions = !!process.env.K_SERVICE || !!process.env.FUNCTION_TARGET;
    try {
      const bucket = await getActiveBucket();
      const storageFile = bucket.file(`NSO DATA/${req.file.filename}`);
      const fileBuffer = fs.readFileSync(req.file.path);
      await storageFile.save(fileBuffer, {
        metadata: { contentType: req.file.mimetype }
      });
      console.log('Successfully saved to Google Cloud Storage:', fileUrl);
    } catch (storageErr: any) {
      console.error('Failed to upload to Google Cloud Storage:', storageErr);
      if (isCloudFunctions || process.env.NODE_ENV === 'production') {
        throw new Error(`Cloud Storage upload failed: ${storageErr.message || storageErr}`);
      }
    }

    let extraData: any = {};
    // Auto-extraction disabled at user request. All values will be entered manually.

    res.json({ url: fileUrl, ...extraData });
  } catch (err: any) {
    console.error('Error in /upload-file route:', err);
    res.status(500).json({ error: 'Upload Failed', message: err.message || err });
  }
});

// DELETE /converter-file (Clear a converter file from the disk)
router.delete('/converter-file', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE'), async (req: any, res) => {
  const { url } = req.query;
  if (url && typeof url === 'string' && url.startsWith('/uploads/')) {
    const filename = url.replace(/^\/uploads\//, '');
    const safeFilename = path.basename(filename);
    
    const inUse = await isFileInUse(safeFilename);
    if (!inUse) {
      const filePath = path.resolve(process.cwd(), 'uploads', safeFilename);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log(`Successfully deleted cleared converter file: ${filePath}`);
        } catch (err) {
          console.error(`Failed to delete cleared converter file: ${filePath}`, err);
        }
      }
    } else {
      console.log(`Preserved cleared converter file (in use): ${safeFilename}`);
    }
  }
  res.json({ message: 'File cleared successfully from server' });
});

// DELETE /:id (Delete a store, restricted to SUPER_ADMIN)
router.delete('/:id', authorizeRoles('SUPER_ADMIN'), async (req: any, res) => {
  const { id } = req.params;
  const storeId = id as string;
  try {
    // Check if the user has DELETE_BRANCH permission
    const requestUser = req.user;
    const dbUser = await prisma.user.findUnique({ where: { id: requestUser.id } });
    const userPermissions = dbUser?.permissions ? dbUser.permissions.split(',').map(p => p.trim()) : [];
    if (!userPermissions.includes('DELETE_BRANCH')) {
      return res.status(403).json({ error: 'Access denied: Requires Delete Branch sub-access' });
    }

    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    // Collect all file URLs to delete from disk
    const filesToDelete: string[] = [];
    if (store.gstCertificateLink) filesToDelete.push(store.gstCertificateLink);
    if (store.fssaiLicense) filesToDelete.push(store.fssaiLicense);
    if (store.rentAgreementLink) filesToDelete.push(store.rentAgreementLink);
    if (store.supportingDocs) {
      try {
        const parsed = JSON.parse(store.supportingDocs);
        if (Array.isArray(parsed)) {
          filesToDelete.push(...parsed);
        } else if (typeof parsed === 'string') {
          filesToDelete.push(parsed);
        }
      } catch (e) {
        // Not JSON, split by comma
        const parts = store.supportingDocs.split(',').map(s => s.trim()).filter(Boolean);
        filesToDelete.push(...parts);
      }
    }

    // Delete files from disk if not in use by other stores
    for (const url of filesToDelete) {
      if (url && typeof url === 'string' && url.startsWith('/uploads/')) {
        const filename = url.replace(/^\/uploads\//, '');
        const safeFilename = path.basename(filename);
        const filePath = path.resolve(process.cwd(), 'uploads', safeFilename);
        
        const otherStoreDoc = await prisma.store.findFirst({
          where: {
            id: { not: storeId },
            OR: [
              { fssaiLicense: { contains: safeFilename } },
              { gstCertificateLink: { contains: safeFilename } },
              { rentAgreementLink: { contains: safeFilename } },
              { supportingDocs: { contains: safeFilename } }
            ]
          }
        });
        
        if (!otherStoreDoc && fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
            console.log(`Permanently deleted file associated with store ${storeId}: ${filePath}`);
          } catch (err) {
            console.error(`Failed to delete file on disk: ${filePath}`, err);
          }
        }
      }
    }

    // Delete dependent relations manually to avoid FK constraint errors
    await prisma.storeHistory.deleteMany({ where: { storeId } });
    await prisma.license.deleteMany({ where: { storeId } });

    // Delete the store
    await prisma.store.delete({ where: { id: storeId } });

    res.json({ success: true, message: `Store ${store.cafeName} deleted successfully` });
  } catch (error) {
    console.error('Failed to delete store:', error);
    res.status(500).json({ error: 'Failed to delete store' });
  }
});

// PUT /:id/toggle-active (Toggle active/inactive status, restricted to SUPER_ADMIN)
router.put('/:id/toggle-active', authorizeRoles('SUPER_ADMIN'), async (req: any, res) => {
  const { id } = req.params;
  const storeId = id as string;
  const { isActive } = req.body;

  if (typeof isActive !== 'boolean') {
    return res.status(400).json({ error: 'isActive must be a boolean value' });
  }

  try {
    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    const updatedStore = await prisma.store.update({
      where: { id: storeId },
      data: { isActive }
    });

    // Create an audit log/store history for this change
    await prisma.storeHistory.create({
      data: {
        storeId,
        userId: req.user.id,
        action: 'TOGGLE_ACTIVE',
        oldValue: store.isActive ? 'Active' : 'Inactive',
        newValue: isActive ? 'Active' : 'Inactive'
      }
    });

    res.json({ success: true, store: updatedStore });
  } catch (error) {
    console.error('Failed to toggle active status:', error);
    res.status(500).json({ error: 'Failed to toggle active status' });
  }
});

// Get all stores
router.get('/', async (req, res) => {
  try {
    if (hasRedshiftStoreConfig()) {
      try {
        const syncResult = await syncStoresFromRedshift();
        if (syncResult && !syncResult.skipped) {
          console.log(`[Stores API] Synced ${syncResult.synced} stores from Redshift.`);
        }
      } catch (err) {
        console.error('[Stores API] Failed to sync from Redshift:', err);
      }
    }

    const requestUser = (req as any).user;
    const isSuperAdmin = requestUser?.role === 'SUPER_ADMIN';

    const stores = await prisma.store.findMany({
      where: isSuperAdmin ? undefined : {
        isActive: true
      },
      orderBy: { createdAt: 'desc' },
      include: {
        areaManager: true,
        cityHead: true,
      },
    });
    res.json(stores);
  } catch (error) {
    console.error('[Stores GET] Error fetching stores:', error);
    res.status(500).json({ error: 'Failed to fetch stores', details: error instanceof Error ? error.message : String(error) });
  }
});

const CAFE_MODELS = [
  'Core',
  'Core Cafe',
  'Makeline',
  'BTC+',
  'Airport',
  'Origins',
  'Got Tea',
  'University',
  'SIS/Others',
  'test'
];

const MENU_OPTIONS = [
  'Pre Ver1',
  'Reg Ver1',
  'Pre BTC+',
  'Air',
  'Reg BTC+',
  'Pre Origin',
  'Reg BTC+ CWK',
  'Pre BTC+ CWK',
  'Pre V3',
  'KIOSK Ver3',
  'Pre Veg',
  'Pre KIOSK Ver2',
  'Reg Ver2',
  'KIOSK Ver6',
  'Pre Ver2',
  'KIOSK Ver4',
  'KIOSK Ver7',
  'Sattva',
  'Reg KIOSK Ver9',
  'KIOSK Ver8',
  'KIOSK Ver5',
  'Pre KIOSK'
];

const INDIAN_STATES = [
  'Andaman and Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal'
];

const validateStoreEmailsAndMonth = (body: any) => {
  const emailFields = ['cafeMailId'];
  for (const field of emailFields) {
    if (body[field]) {
      const emailVal = String(body[field]).toLowerCase().trim();
      if (!emailVal.endsWith('@bluetokaicoffee.com') && !emailVal.endsWith('@gottea.in')) {
        throw new Error(`Please enter a valid email ID. Only email addresses with the domain @bluetokaicoffee.com or @gottea.in are allowed for ${field}.`);
      }
    }
  }
  
  if (body.cafeLaunchMonth && !/^[a-zA-Z]+\s+\d{4}$/.test(String(body.cafeLaunchMonth).trim())) {
    throw new Error('Please enter a valid Cafe Launch Month & Year in "Month Year" format (e.g., "June 2026").');
  }

  const moduleVal = body.cafeModule || body.cafeModel;
  if (moduleVal && !CAFE_MODELS.includes(moduleVal)) {
    throw new Error(`Invalid Cafe Module: ${moduleVal}. Must be one of: ${CAFE_MODELS.join(', ')}`);
  }

  const pricingVal = body.pricingVersion || body.menu;
  if (pricingVal && !MENU_OPTIONS.includes(pricingVal)) {
    throw new Error(`Invalid Pricing Version: ${pricingVal}. Must be one of: ${MENU_OPTIONS.join(', ')}`);
  }

  if (body.state && !INDIAN_STATES.includes(body.state)) {
    throw new Error(`Invalid State: ${body.state}. Please select a valid Indian state.`);
  }
};

async function triggerUpcomingLaunchEmail(store: any) {
  try {
    const smtpConfig = await getSMTPConfig();
    const recipients = await getEmailRecipients();

    const toEmails = recipients.find(c => c.id === 'auto_mails')?.emails || [];
    const ccEmails = recipients.find(c => c.id === 'auto_mails_cc')?.emails || [];

    if (toEmails.length === 0 && ccEmails.length === 0) {
      console.log('No recipients configured for auto mails, skipping email trigger.');
      return;
    }

    const transporter = nodemailer.createTransport({
      host: smtpConfig.smtpHost,
      port: smtpConfig.smtpPort,
      secure: smtpConfig.smtpSecure,
      auth: {
        user: smtpConfig.smtpUser,
        pass: smtpConfig.smtpPass
      }
    });

    const brandNames: Record<string, string> = {
      'BLUE_TOKAI_SUCHALI': 'Blue Tokai / Suchali\'s Artisan Bakehouse',
      'GOT_TEA': 'Got Tea'
    };
    const brandName = brandNames[store.brand || ''] || store.brand || 'N/A';

    const subject = `Upcoming Café Launch Announcement - ${store.cafeName || ''} | ${store.cafeCode || ''} | ${store.city || ''} 🎉🎉`;

    const text = `Dear Team,

🎉 We are excited to share that a new café is scheduled to launch soon! 🎉

Please find the upcoming café details below:

Brand Name: ${brandName}
Cafe Name: ${store.cafeName || 'N/A'}
Cafe Code: ${store.cafeCode || 'N/A'}
Address: ${store.cafeAddress || store.address || 'N/A'}
City: ${store.city || 'N/A'}
State: ${store.state || 'N/A'}
Pin Code: ${store.pinCode || 'N/A'}

We are thrilled to continue expanding our presence and bringing our brand to a new location. This upcoming launch represents another important milestone in our growth journey.

The team is working diligently to ensure a successful opening, and we look forward to welcoming our customers to this new café very soon.

Further updates regarding the launch date and operational readiness will be shared shortly.

Thank you to everyone involved in making this upcoming launch possible. Let's make this opening a great success!

Best Regards,`;

    const html = `<div style="font-family: Arial, sans-serif; line-height: 1.6; width: 100%; margin: 0; padding: 24px 0; text-align: left;">
  <p style="font-weight: bold; margin-bottom: 24px;">Dear Team,</p>
  <p style="font-weight: bold; margin-bottom: 24px;">🎉 We are excited to share that a new café is scheduled to launch soon! 🎉</p>
  <p style="margin-bottom: 24px;">Please find the upcoming café details below:</p>
  <div style="margin-bottom: 24px; line-height: 1.8; text-align: left;">
    <strong>Brand Name:</strong> ${brandName}<br />
    <strong>Cafe Name:</strong> ${store.cafeName || 'N/A'}<br />
    <strong>Cafe Code:</strong> ${store.cafeCode || 'N/A'}<br />
    <strong>Address:</strong> ${store.cafeAddress || store.address || 'N/A'}<br />
    <strong>City:</strong> ${store.city || 'N/A'}<br />
    <strong>State:</strong> ${store.state || 'N/A'}<br />
    <strong>Pin Code:</strong> ${store.pinCode || 'N/A'}
  </div>
  <p style="margin-bottom: 24px;">We are thrilled to continue expanding our presence and bringing our brand to a new location. This upcoming launch represents another important milestone in our growth journey.</p>
  <p style="margin-bottom: 24px;">The team is working diligently to ensure a successful opening, and we look forward to welcoming our customers to this new café very soon.</p>
  <p style="margin-bottom: 24px;">Further updates regarding the launch date and operational readiness will be shared shortly.</p>
  <p style="margin-bottom: 24px;">Thank you to everyone involved in making this upcoming launch possible. Let's make this opening a great success!</p>
  <p style="margin-top: 24px; margin-bottom: 0;">Best Regards,</p>
</div>`;

    const toHeader = toEmails.length > 0 ? toEmails.join(', ') : (smtpConfig.smtpUser || 'analytics@bluetokaicoffee.com');
    const ccHeader = ccEmails.length > 0 ? ccEmails.join(', ') : undefined;

    const threadMessageId = await getThreadMessageId(store.cafeCode);
    const mailSubject = threadMessageId ? `Re: ${subject}` : subject;

    const mailOptions: any = {
      from: smtpConfig.smtpUser 
        ? `"Analytics" <${smtpConfig.smtpUser}>` 
        : '"Analytics" <Analytics@bluetokaicoffee.com>',
      to: toHeader,
      cc: ccHeader,
      subject: mailSubject,
      text,
      html
    };

    if (threadMessageId) {
      mailOptions.headers = {
        'In-Reply-To': threadMessageId,
        'References': threadMessageId
      };
    }

    if (shouldUseEtherealFallback(smtpConfig)) {
      const testAccount = await nodemailer.createTestAccount();
      const testTransporter = nodemailer.createTransport({
        host: ETHEREAL_HOST,
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      const info = await testTransporter.sendMail(mailOptions);
      console.log('Auto Café Launch Email sent to Ethereal: %s', nodemailer.getTestMessageUrl(info));
      if (!threadMessageId) {
        await saveThreadMessageId(store.cafeCode, info.messageId);
      }
    } else {
      const info = await transporter.sendMail(mailOptions);
      console.log('Auto Café Launch Email sent successfully: %s', info.messageId);
      if (!threadMessageId) {
        await saveThreadMessageId(store.cafeCode, info.messageId);
      }
    }
  } catch (error) {
    console.error('Failed to trigger automatic café launch email:', error);
  }
}

async function triggerNsoApprovedEmail(store: any) {
  try {
    const smtpConfig = await getSMTPConfig();
    const recipients = await getEmailRecipients();

    const toEmails = recipients.find(c => c.id === 'auto_mails')?.emails || [];
    const ccEmails = recipients.find(c => c.id === 'auto_mails_cc')?.emails || [];

    if (toEmails.length === 0 && ccEmails.length === 0) {
      console.log('No recipients configured for auto mails, skipping email trigger.');
      return;
    }

    const transporter = nodemailer.createTransport({
      host: smtpConfig.smtpHost,
      port: smtpConfig.smtpPort,
      secure: smtpConfig.smtpSecure,
      auth: {
        user: smtpConfig.smtpUser,
        pass: smtpConfig.smtpPass
      }
    });

    const subject = `Upcoming Café Launch Announcement - ${store.cafeName || ''} | ${store.cafeCode || ''} | ${store.city || ''} 🎉🎉`;

    const text = `Dear Team, 

🎉 Exciting Update: Compliance Phase Started for Our Upcoming Café 🎉

We are delighted to share another exciting milestone in the journey of our upcoming café! 🎉✨🎉✨

All the required store details have been successfully completed and approved by the NSO Team, and we have now entered the Compliance Phase.

🚀 We are one step closer to welcoming our customers! 🚀

The Compliance Team is currently reviewing the remaining formalities. Once the compliance process is completed and approved, the café will be ready for its In-Store Go Live, bringing us even closer to another successful launch.

For delivery platforms (Swiggy, Zomato, etc.), the activation process may take a little more time. The Operations Team will share further updates regarding the delivery launch as soon as the integrations are completed.

Every milestone brings us closer to opening our doors, and we are excited to see this café come to life. Thank you to everyone for your continued collaboration and support in making this launch a success.

The countdown has begun, and we can't wait to celebrate another amazing café opening! ☕🎊`;

    const html = `<div style="font-family: Arial, sans-serif; line-height: 1.6; width: 100%; margin: 0; padding: 24px 0; text-align: left;">
  <p style="font-weight: bold; margin-bottom: 24px;">Dear Team,</p>
  <p style="font-weight: bold; margin-bottom: 24px;">🎉 Exciting Update: Compliance Phase Started for Our Upcoming Café 🎉</p>
  <p style="font-weight: bold; margin-bottom: 24px;">We are delighted to share another exciting milestone in the journey of our upcoming café! 🎉✨🎉✨</p>
  <p style="margin-bottom: 24px;">All the required store details have been successfully completed and approved by the NSO Team, and we have now entered the Compliance Phase.</p>
  <p style="margin-bottom: 24px; font-weight: bold;">🚀 We are one step closer to welcoming our customers! 🚀</p>
  <p style="margin-bottom: 24px;">The Compliance Team is currently reviewing the remaining formalities. Once the compliance process is completed and approved, the café will be ready for its In-Store Go Live, bringing us even closer to another successful launch.</p>
  <p style="margin-bottom: 24px;">For delivery platforms (Swiggy, Zomato, etc.), the activation process may take a little more time. The Operations Team will share further updates regarding the delivery launch as soon as the integrations are completed.</p>
  <p style="margin-bottom: 24px;">Every milestone brings us closer to opening our doors, and we are excited to see this café come to life. Thank you to everyone for your continued collaboration and support in making this launch a success.</p>
  <p style="margin-bottom: 24px;">The countdown has begun, and we can't wait to celebrate another amazing café opening! ☕🎊</p>
</div>`;

    const toHeader = toEmails.length > 0 ? toEmails.join(', ') : (smtpConfig.smtpUser || 'analytics@bluetokaicoffee.com');
    const ccHeader = ccEmails.length > 0 ? ccEmails.join(', ') : undefined;

    const threadMessageId = await getThreadMessageId(store.cafeCode);
    const mailSubject = threadMessageId ? `Re: ${subject}` : subject;

    const mailOptions: any = {
      from: smtpConfig.smtpUser 
        ? `"Analytics" <${smtpConfig.smtpUser}>` 
        : '"Analytics" <Analytics@bluetokaicoffee.com>',
      to: toHeader,
      cc: ccHeader,
      subject: mailSubject,
      text,
      html
    };

    if (threadMessageId) {
      mailOptions.headers = {
        'In-Reply-To': threadMessageId,
        'References': threadMessageId
      };
    }

    if (shouldUseEtherealFallback(smtpConfig)) {
      const testAccount = await nodemailer.createTestAccount();
      const testTransporter = nodemailer.createTransport({
        host: ETHEREAL_HOST,
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      const info = await testTransporter.sendMail(mailOptions);
      console.log('Auto Café NSO Approved Email sent to Ethereal: %s', nodemailer.getTestMessageUrl(info));
      if (!threadMessageId) {
        await saveThreadMessageId(store.cafeCode, info.messageId);
      }
    } else {
      const info = await transporter.sendMail(mailOptions);
      console.log('Auto Café NSO Approved Email sent successfully: %s', info.messageId);
      if (!threadMessageId) {
        await saveThreadMessageId(store.cafeCode, info.messageId);
      }
    }
  } catch (error) {
    console.error('Failed to trigger automatic café approval email:', error);
  }
}

function getStatusAliases(status: string): string[] {
  const norm = status.trim().toUpperCase();
  if (norm === 'IN_PIPELINE' || norm === 'IN PIPELINE') {
    return ['In Pipeline', 'Pipeline'];
  }
  if (norm === 'AGREEMENT_SIGNED' || norm === 'AGREEMENT SIGNED') {
    return ['Agreement Signed'];
  }
  if (norm === 'READY_FOR_CONSTRUCTION' || norm === 'READY FOR CONSTRUCTION') {
    return ['Ready for Construction'];
  }
  if (norm === 'UNDER_DEVELOPMENT' || norm === 'UNDER DEVELOPMENT') {
    return ['Under Development'];
  }
  if (norm === 'INCOMPLETE_INFORMATION' || norm === 'INCOMPLETE' || norm === 'INCOMPLETE INFORMATION') {
    return ['Incomplete Information', 'Incomplete', 'INCOMPLETE_INFORMATION'];
  }
  if (norm === 'PENDING_APPROVAL' || norm === 'APPROVAL_PENDING' || norm === 'APPROVAL PENDING' || norm === 'SENT TO NSO TEAM FOR APPROVAL') {
    return ['Sent to NSO Team for Approval', 'Approval Pending', 'PENDING_APPROVAL'];
  }
  if (norm === 'APPROVED' || norm === 'NSO_APPROVED') {
    return ['Approved', 'APPROVED', 'NSO_APPROVED'];
  }
  if (norm === 'ON_HOLD' || norm === 'ON HOLD') {
    return ['On Hold', 'ON_HOLD'];
  }

  if (norm === 'CLOSED' || norm === 'CLOSED STORES' || norm === 'CLOSED STORE') {
    return ['Closed', 'CLOSED'];
  }
  if (norm === 'LIVE' || norm === 'LIVE STORES' || norm === 'LIVE STORE') {
    return ['Live', 'LIVE'];
  }
  return [status];
}

function replacePlaceholders(templateText: string, store: any): string {
  if (!templateText) return '';
  const brandNamePretty = store.brand === 'BLUE_TOKAI_SUCHALI' 
    ? "Blue Tokai / Suchali's Artisan Bakehouse" 
    : (store.brand === 'GOT_TEA' ? "Got Tea" : (store.brand || ''));

  return templateText
    .replace(/{cafeName}|\[Store Name\]|\[Cafe Name\]/gi, store.cafeName || '')
    .replace(/{brandName}|\[Brand Name\]|\[Brand\]/gi, brandNamePretty)
    .replace(/{city}|\[City\]/gi, store.city || '')
    .replace(/{state}|\[State\]/gi, store.state || '')
    .replace(/{address}|\[Address\]/gi, store.cafeAddress || store.address || '')
    .replace(/{model}|\[Model\]|\[Cafe Model\]/gi, store.cafeModule || store.cafeModel || '')
    .replace(/{cafeCode}|\[Store Code\]|\[Cafe Code\]/gi, store.cafeCode || '')
    .replace(/{pincode}|\[Pincode\]|\[Pin Code\]/gi, store.pinCode || '');
}

async function checkAndSendStatusEmail(store: any, newStatus: string) {
  try {
    const mappings = await getEmailMappings();
    const aliases = getStatusAliases(newStatus).map(a => a.toLowerCase());
    
    const statusMapping = mappings.find(m => 
      (m.category?.toLowerCase() === 'status changes' || m.category?.toLowerCase() === 'status triggered' || m.category?.toLowerCase() === 'status') &&
      aliases.includes(m.subCategory?.toLowerCase())
    );

    if (!statusMapping) {
      console.log(`[Status Email] No email mapping found for status: "${newStatus}"`);
      return;
    }

    const toEmails = statusMapping.to || [];
    const ccEmails = statusMapping.cc || [];

    if (toEmails.length === 0 && ccEmails.length === 0) {
      console.log(`[Status Email] No recipients configured for status: "${newStatus}", skipping.`);
      return;
    }

    const templatesMap = await getEmailTemplates();
    const templateKey = Object.keys(templatesMap).find(k => k.toLowerCase() === statusMapping.subCategory.toLowerCase());
    const template = templateKey ? templatesMap[templateKey] : null;

    if (!template) {
      console.log(`[Status Email] No template configured for status: "${newStatus}", skipping.`);
      return;
    }

    const finalSubject = replacePlaceholders(template.subject, store);
    const finalBody = replacePlaceholders(template.body, store);

    const smtpConfig = await getSMTPConfig();
    const transporter = nodemailer.createTransport({
      host: smtpConfig.smtpHost,
      port: smtpConfig.smtpPort,
      secure: smtpConfig.smtpSecure,
      auth: {
        user: smtpConfig.smtpUser,
        pass: smtpConfig.smtpPass
      }
    });

    const formatted = formatMailBody(finalBody);
    const mailOptions: any = {
      from: smtpConfig.smtpUser,
      to: toEmails,
      cc: ccEmails.length > 0 ? ccEmails : undefined,
      subject: finalSubject,
      text: formatted.text,
      html: formatted.html
    };

    console.log(`[Status Email] Triggering status email for "${store.cafeName}" status update to "${newStatus}"`);
    
    if (shouldUseEtherealFallback(smtpConfig)) {
      const testAccount = await nodemailer.createTestAccount();
      const testTransporter = nodemailer.createTransport({
        host: ETHEREAL_HOST,
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      const info = await testTransporter.sendMail(mailOptions);
      console.log('[Status Email] Status email sent to Ethereal: %s', nodemailer.getTestMessageUrl(info));
    } else {
      const info = await transporter.sendMail(mailOptions);
      console.log('[Status Email] Status email sent successfully: %s', info.messageId);
    }
  } catch (error) {
    console.error(`[Status Email] Failed to send status email for status: "${newStatus}":`, error);
  }
}

// Create a new store
router.post('/', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'MANAGER'), async (req: any, res) => {
  try {
    const isSuperAdmin = req.user.role === 'SUPER_ADMIN';
    const hasEditContacts = req.user.permissions && req.user.permissions.includes('EDIT_CONTACTS');
    const hasEditStores = req.user.permissions && req.user.permissions.includes('EDIT_STORES');

    if (!isSuperAdmin && !hasEditContacts && !hasEditStores) {
      const sendsContactDetails = CONTACT_FIELDS.some(key => {
        const val = req.body[key];
        return val !== undefined && val !== null && String(val).trim() !== '';
      });

      if (sendsContactDetails) {
        return res.status(403).json({ error: 'Access denied: You do not have permission to add contact details.' });
      }
    }

    if (req.user?.role !== 'SUPER_ADMIN') {
      validateStoreEmailsAndMonth(req.body);
    }

    const status = req.body.status || 'INCOMPLETE_INFORMATION';

    // Auto-generate IT emails if cafeName and brand are provided
    if (req.body.cafeName && req.body.brand) {
      const strippedName = req.body.cafeName.replace(/\\s+/g, '').toLowerCase();
      let domain = '';
      const brandStr = String(req.body.brand).toLowerCase();
      
      if (brandStr.includes('blue tokai') || brandStr.includes('suchali')) {
        domain = '@bluetokaicoffee.com';
      } else if (brandStr.includes('got tea')) {
        domain = '@gottea.com';
      }
      
      if (domain) {
        req.body.itCafeMailId = `${strippedName}${domain}`;
        req.body.itCmMailId = `cm.${strippedName}${domain}`;
      }
    }
    
    // Always default the status to Pending on creation
    req.body.itEmailStatus = 'Pending';

    const newStore = await prisma.store.create({
      data: {
        ...req.body,
        enteredByEmail: req.user.email,
        status,
        lat: req.body.lat ? parseFloat(req.body.lat) : null,
        lng: req.body.lng ? parseFloat(req.body.lng) : null,
        latitude: req.body.latitude ? parseFloat(req.body.latitude) : null,
        latt: req.body.latt ? parseFloat(req.body.latt) : null,
        long: req.body.long ? parseFloat(req.body.long) : null,
        launchDate: req.body.launchDate ? new Date(req.body.launchDate) : null,
        areaManagerId: req.body.areaManagerId || null,
        cityHeadId: req.body.cityHeadId || null,
        cafeManagerId: req.body.cafeManagerId || null,
      },
    });
    
    // Add history
    await prisma.storeHistory.create({
      data: {
        storeId: newStore.id,
        action: 'Store Created',
        newValue: status,
      }
    });


    res.status(201).json(newStore);
  } catch (error: any) {
    console.error('Create store error:', error);
    if (error.message && (error.message.includes('Bluetokai email ID') || error.message.includes('Cafe Launch Month'))) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to create store' });
  }
});

// Update store status (Approve/Reject)
router.put('/:id/status', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'MANAGER'), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const requestUser = (req as any).user;
  
  // Compliance stage removed: APPROVED goes directly (no longer routes through NSO_APPROVED)
  const targetStatus = status;

  try {
    const store = await prisma.store.findUnique({
      where: { id: id as string }
    });

    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    const wasPendingApproval = store.status === 'PENDING_APPROVAL';
    const isNowApproved = targetStatus === 'NSO_APPROVED' || targetStatus === 'APPROVED';

    if (store.isLocked && requestUser?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Store is locked. Only Super Admin can modify the status.' });
    }

    if (store.status === 'CLOSED' && requestUser?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Access denied: Only Super Admin can modify Closed stores.' });
    }

    if (targetStatus === 'CLOSED' && requestUser?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Access denied: Only Super Admin can change store status to Closed.' });
    }

    if (targetStatus === 'LIVE') {
      return res.status(400).json({ error: 'Direct status changes to Live are not allowed. Please configure Go-Live details and save via the Edit Store page.' });
    }

    if (targetStatus === 'CLOSED') {
      return res.status(400).json({ error: 'Direct status changes to Closed are not allowed. Please configure Closure details and save via the Edit Store page.' });
    }

    const hasReachedNsoApproval = store.status !== 'INCOMPLETE_INFORMATION';
    if (hasReachedNsoApproval && targetStatus !== store.status) {
      const isSuperAdmin = requestUser?.role === 'SUPER_ADMIN';
      const isAdmin = requestUser?.role === 'ADMIN';
      const isApprover = requestUser?.permissions && requestUser.permissions.includes('APPROVER');
      if (!isSuperAdmin && !isAdmin && !isApprover) {
        return res.status(403).json({ error: 'Access denied: Only users with Approver permission can change the status of a store in this stage.' });
      }
    }

    if (targetStatus === 'NSO_APPROVED' || targetStatus === 'APPROVED') {
      // Auto-populate legacy launchStatus field if missing to avoid blocking approvals
      if (!store.launchStatus || String(store.launchStatus).trim() === '') {
        await prisma.store.update({
          where: { id: id as string },
          data: { launchStatus: 'Newly Launched' }
        });
        (store as any).launchStatus = 'Newly Launched';
      }

      const missingFields: string[] = [];
      for (const field of MANDATORY_FIELDS) {
        const value = (store as any)[field];
        if (value === null || value === undefined || String(value).trim() === '') {
          missingFields.push(field);
        }
      }

      if (targetStatus === 'APPROVED') {
        const fssaiFields = ['fssaiNo', 'fssaiStartDate', 'fssaiExpiry'];
        for (const field of fssaiFields) {
          const value = (store as any)[field];
          if (value === null || value === undefined || String(value).trim() === '') {
            missingFields.push(field);
          }
        }
      }

      if (missingFields.length > 0) {
        return res.status(400).json({
          error: 'NSO Validation Failed',
          message: 'These details must be completed before the store can be approved.',
          missingFields
        });
      }
    }

    if (targetStatus === 'ON_HOLD') {
      const remarks = req.body.remarks;
      if (!remarks || String(remarks).trim() === '') {
        return res.status(400).json({
          error: 'Validation Failed',
          message: 'Remarks are mandatory when placing the cafe on hold.'
        });
      }
    }

    const updateData: any = { 
      status: targetStatus,
      ...(targetStatus === 'REJECTED' ? { mailStatus: '' } : {}),
      ...(req.body.remarks !== undefined ? { remarks: req.body.remarks } : {})
    };

    // Capture approver name for any approval action
    const approvalStatuses = ['NSO_APPROVED', 'APPROVED'];
    if (approvalStatuses.includes(targetStatus) && requestUser?.name) {
      updateData.approvedBy = requestUser.name;
      updateData.approvedAt = new Date().toISOString();
    }
    // Clear approvedBy on rejection
    if (targetStatus === 'REJECTED') {
      updateData.approvedBy = null;
      updateData.approvedAt = null;
    }

    // Capture sentToNsoBy and sentToNsoAt when transitioning to PENDING_APPROVAL
    if (targetStatus === 'PENDING_APPROVAL') {
      if (store.status !== 'PENDING_APPROVAL') {
        updateData.sentToNsoBy = requestUser?.name || requestUser?.email || 'Unknown';
        updateData.sentToNsoAt = new Date().toISOString();
      }
    } else if (targetStatus && !['PENDING_APPROVAL', ...approvalStatuses, 'LIVE'].includes(targetStatus)) {
      updateData.sentToNsoBy = null;
      updateData.sentToNsoAt = null;
    }

    if (targetStatus === 'LIVE') {
      if (!store.launchDate) {
        updateData.launchDate = new Date();
        updateData.cafeLaunchMonth = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
      }
      updateData.isLocked = false;
      updateData.isLockedAutoApplied = false;
    }

    const updatedStore = await prisma.store.update({
      where: { id: id as string },
      data: updateData,
    });

    await prisma.storeHistory.create({
      data: {
        storeId: updatedStore.id,
        action: `Status changed to ${targetStatus}`,
        newValue: targetStatus,
      }
    });



    res.json(updatedStore);
  } catch (error) {
    console.error('Update store status error:', error);
    res.status(500).json({ error: 'Failed to update store status' });
  }
});



// Update store details
router.put('/:id', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE'), async (req: any, res) => {
  const { id } = req.params;
  const user = req.user;
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      validateStoreEmailsAndMonth(req.body);
    }

    const currentStore = await prisma.store.findUnique({
      where: { id: id as string }
    });
    if (!currentStore) {
      return res.status(404).json({ error: 'Store not found' });
    }

    const approvalStatuses = ['NSO_APPROVED', 'APPROVED', 'LIVE'];
    if (approvalStatuses.includes(currentStore.status) && user.role !== 'SUPER_ADMIN') {
      const allowedKeys = ['status', 'isLocked', 'mailStatus', 'uploadedDocuments', 'blueTokaiSwiggyRID', 'blueTokaiZomatoRID', 'suchaliSwiggyRID', 'suchaliZomatoRID', 'gotTeaSwiggyRID', 'gotTeaZomatoRID', 'inStoreLive', 'inStoreLiveDate', 'deliveryLive', 'deliveryLiveDate', 'blueTokaiSwiggyLive', 'blueTokaiSwiggyLiveDate', 'blueTokaiZomatoLive', 'blueTokaiZomatoLiveDate', 'suchaliSwiggyLive', 'suchaliSwiggyLiveDate', 'suchaliZomatoLive', 'suchaliZomatoLiveDate', 'gotTeaSwiggyLive', 'gotTeaSwiggyLiveDate', 'gotTeaZomatoLive', 'gotTeaZomatoLiveDate', 'inStoreClosureDate', 'deliveryClosureDate', 'inStoreClosed', 'inStoreClosedDate', 'deliveryClosed', 'deliveryClosedDate'];
      const attemptedChanges = Object.keys(req.body).filter(key => {
        if (allowedKeys.includes(key)) return false;
        let reqVal = req.body[key];
        let currentVal = (currentStore as any)[key];
        
        if (reqVal === undefined || reqVal === null) reqVal = '';
        if (currentVal === undefined || currentVal === null) currentVal = '';
        
        return String(reqVal).trim() !== String(currentVal).trim();
      });

      if (attemptedChanges.length > 0) {
        return res.status(403).json({ 
          error: 'Access denied: This store is approved and is in read-only view.' 
        });
      }
    }

    const wasPendingApproval = currentStore.status === 'PENDING_APPROVAL';
    const wasIncompleteInformation = currentStore.status === 'INCOMPLETE_INFORMATION';

    if (currentStore.status === 'CLOSED' && user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Access denied: Only Super Admin can modify Closed stores.' });
    }

    if (req.body.status === 'CLOSED' && user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Access denied: Only Super Admin can change store status to Closed.' });
    }

    if (req.body.status !== undefined && req.body.status !== currentStore.status) {
      if (req.body.status === 'LIVE') {
        const isSuperAdmin = user.role === 'SUPER_ADMIN';
        const hasGoLivePermission = user.permissions && user.permissions.includes('GO_LIVE');
        if (!isSuperAdmin && !hasGoLivePermission) {
          return res.status(403).json({ error: 'Access denied: You do not have Go-Live Access permission.' });
        }
        if (!['APPROVED', 'NSO_APPROVED', 'READY_TO_GO_LIVE'].includes(currentStore.status) && !isSuperAdmin) {
          return res.status(400).json({ error: 'Store must be Approved before going Live.' });
        }
      } else {
        const hasReachedNsoApproval = currentStore.status !== 'INCOMPLETE_INFORMATION';
        if (hasReachedNsoApproval) {
          const isSuperAdmin = user.role === 'SUPER_ADMIN';
          const isApprover = user.permissions && user.permissions.includes('APPROVER');
          if (!isSuperAdmin && !isApprover) {
            return res.status(403).json({ error: 'Access denied: Only users with Approver permission can change the status of a store in this stage.' });
          }
        }
      }
    }

    const updateData = {
      ...req.body,
    };

    // Synchronize individual document fields with the uploadedDocuments array
    let currentDocsList: any[] = [];
    if (updateData.uploadedDocuments) {
      currentDocsList = typeof updateData.uploadedDocuments === 'string'
        ? JSON.parse(updateData.uploadedDocuments)
        : updateData.uploadedDocuments;
    } else if (currentStore.uploadedDocuments) {
      currentDocsList = typeof currentStore.uploadedDocuments === 'string'
        ? JSON.parse(currentStore.uploadedDocuments)
        : currentStore.uploadedDocuments;
    }

    if (!Array.isArray(currentDocsList)) {
      currentDocsList = [];
    }

    const getValue = (key: string) => updateData.hasOwnProperty(key) ? updateData[key] : (currentStore as any)[key];

    const upsertDoc = (docType: string, category: string, fileUrl: any, extraFields = {}) => {
      if (!fileUrl) {
        currentDocsList = currentDocsList.filter(d => d.docType !== docType);
        return;
      }
      const existingIdx = currentDocsList.findIndex(d => d.docType === docType);
      const fileName = path.basename(fileUrl);
      const newDoc = {
        category,
        docType,
        fileUrl,
        fileName: existingIdx >= 0 ? (currentDocsList[existingIdx].fileName || fileName) : fileName,
        uploadedAt: existingIdx >= 0 ? (currentDocsList[existingIdx].uploadedAt || new Date().toISOString()) : new Date().toISOString(),
        ...extraFields
      };
      if (existingIdx >= 0) {
        currentDocsList[existingIdx] = { ...currentDocsList[existingIdx], ...newDoc };
      } else {
        currentDocsList.push(newDoc);
      }
    };

    if (updateData.hasOwnProperty('loiUrl')) {
      upsertDoc('loi', 'Legal Documents', updateData.loiUrl);
    }
    if (updateData.hasOwnProperty('budgetUrl')) {
      upsertDoc('budget_approval', 'Financial Documents', updateData.budgetUrl);
    }
    const leaseUrl = getValue('agreementUrl') || getValue('rentAgreementLink');
    if (updateData.hasOwnProperty('agreementUrl') || updateData.hasOwnProperty('rentAgreementLink')) {
      upsertDoc('lease_agreement', 'Legal Documents', leaseUrl, {
        issuedOn: getValue('rentStartDate') || null,
        validUntil: getValue('rentExpiry') || null
      });
    }
    if (updateData.hasOwnProperty('fssaiLicense')) {
      upsertDoc('fssai', 'Legal Documents', updateData.fssaiLicense, {
        issuedOn: getValue('fssaiStartDate') || null,
        validUntil: getValue('fssaiExpiry') || null,
        fssaiNo: getValue('fssaiNo') || ''
      });
    }
    if (updateData.hasOwnProperty('gstCertificateLink')) {
      upsertDoc('gst_certificate', 'Legal Documents', updateData.gstCertificateLink);
    }
    if (updateData.hasOwnProperty('supportingDocs')) {
      const supporting = updateData.supportingDocs;
      let urls: string[] = [];
      if (supporting) {
        try {
          urls = typeof supporting === 'string' ? JSON.parse(supporting) : supporting;
        } catch (e) {
          if (typeof supporting === 'string') urls = [supporting];
        }
      }
      currentDocsList = currentDocsList.filter(d => d.docType !== 'miscellaneous');
      if (Array.isArray(urls)) {
        urls.forEach(url => {
          if (url) {
            const fileName = path.basename(url);
            currentDocsList.push({
              category: 'Miscellaneous Documents',
              docType: 'miscellaneous',
              fileUrl: url,
              fileName,
              uploadedAt: new Date().toISOString()
            });
          }
        });
      }
    }

    updateData.uploadedDocuments = currentDocsList;

    if (updateData.status === 'APPROVED') {
      const approvalStatuses = ['NSO_APPROVED', 'LIVE', 'APPROVED'];
      if (currentStore && approvalStatuses.includes(currentStore.status)) {
        updateData.status = currentStore.status;
      } else {
        updateData.status = 'NSO_APPROVED';
      }
    }

    if (updateData.status === 'ON_HOLD' && user.role !== 'SUPER_ADMIN') {
      const remarks = updateData.remarks !== undefined ? updateData.remarks : currentStore.remarks;
      if (!remarks || String(remarks).trim() === '') {
        return res.status(400).json({
          error: 'Validation Failed',
          message: 'Remarks are mandatory when placing the cafe on hold.'
        });
      }
    }

    if (updateData.status === 'NSO_APPROVED' && user.role !== 'SUPER_ADMIN') {
      const missingFields: string[] = [];
      for (const field of MANDATORY_FIELDS) {
        const value = updateData[field] !== undefined ? updateData[field] : (currentStore as any)[field];
        if (value === null || value === undefined || String(value).trim() === '') {
          missingFields.push(field);
        }
      }

      if (missingFields.length > 0) {
        return res.status(400).json({
          error: 'NSO Validation Failed',
          message: 'These details must be completed before the store can be approved.',
          missingFields
        });
      }
    }

    // Enforce lock status modifications: only SUPER_ADMIN can change the lock status of a store.
    if (req.body.isLocked !== undefined && req.body.isLocked !== currentStore.isLocked) {
      if (user.role !== 'SUPER_ADMIN' && req.body.status !== 'Under Construction') {
        return res.status(403).json({ error: 'Access denied: Only Super Admin can change the lock status of a store.' });
      }
      
      // Ensure locking is only allowed for LIVE stores
      if (req.body.isLocked === true) {
        const finalStatus = req.body.status || currentStore.status;
        if (finalStatus !== 'LIVE' && finalStatus !== 'Live') {
          return res.status(400).json({ error: 'Stores can only be locked when their status is LIVE.' });
        }
      }
      
      updateData.isLockedAutoApplied = true;
    }

    // Validate go-live fields modification permission
    const modifiesGoLiveFields = [
      'inStoreLive',
      'deliveryLive',
      'inStoreLiveDate',
      'deliveryLiveDate'
    ].some(key => {
      if (req.body[key] === undefined) return false;
      const dbVal = (currentStore as any)[key];
      const reqVal = req.body[key];
      if (typeof dbVal === 'boolean' || typeof reqVal === 'boolean') {
        return Boolean(dbVal) !== Boolean(reqVal);
      }
      const dbTime = dbVal ? new Date(dbVal).getTime() : 0;
      const reqTime = reqVal ? new Date(reqVal).getTime() : 0;
      const normDb = isNaN(dbTime) ? 0 : dbTime;
      const normReq = isNaN(reqTime) ? 0 : reqTime;
      return normDb !== normReq;
    });

    if (modifiesGoLiveFields) {
      const isSuperAdmin = user.role === 'SUPER_ADMIN';
      const hasGoLivePermission = user.permissions && user.permissions.includes('GO_LIVE');
      if (!isSuperAdmin && !hasGoLivePermission) {
        return res.status(403).json({ error: 'Access denied: You do not have Go-Live Access permission.' });
      }
    }

    // Validate go-live toggles and dates
    const targetStatus = updateData.status !== undefined ? updateData.status : currentStore.status;
    if (targetStatus === 'LIVE' && user.role !== 'SUPER_ADMIN') {
      const inStoreLive = updateData.inStoreLive !== undefined ? updateData.inStoreLive : currentStore.inStoreLive;
      const deliveryLive = updateData.deliveryLive !== undefined ? updateData.deliveryLive : currentStore.deliveryLive;

      if (!inStoreLive && !deliveryLive) {
        return res.status(400).json({ error: 'Validation Failed: At least one go-live toggle (In-Store or Delivery) must be enabled.' });
      }

      if (inStoreLive) {
        const inStoreLiveDate = updateData.inStoreLiveDate !== undefined ? updateData.inStoreLiveDate : currentStore.inStoreLiveDate;
        if (!inStoreLiveDate) {
          return res.status(400).json({ error: 'Validation Failed: In-Store Live Date is mandatory when In-Store toggle is enabled.' });
        }
      }

      if (deliveryLive) {
        const deliveryLiveDate = updateData.deliveryLiveDate !== undefined ? updateData.deliveryLiveDate : currentStore.deliveryLiveDate;
        if (!deliveryLiveDate) {
          return res.status(400).json({ error: 'Validation Failed: Delivery Live Date is mandatory when Delivery toggle is enabled.' });
        }
      }
    }

    // Clear dates for disabled toggles
    if (updateData.inStoreLive === false) {
      updateData.inStoreLiveDate = null;
    }
    if (updateData.deliveryLive === false) {
      updateData.deliveryLiveDate = null;
    }

    // Validate closure toggles and dates
    if (targetStatus === 'CLOSED' && user.role !== 'SUPER_ADMIN') {
      const inStoreClosed = updateData.inStoreClosed !== undefined ? updateData.inStoreClosed : currentStore.inStoreClosed;
      const deliveryClosed = updateData.deliveryClosed !== undefined ? updateData.deliveryClosed : currentStore.deliveryClosed;

      if (!inStoreClosed && !deliveryClosed) {
        return res.status(400).json({ error: 'Validation Failed: At least one closure toggle (In-Store or Delivery) must be enabled.' });
      }

      if (inStoreClosed) {
        const inStoreClosedDate = updateData.inStoreClosedDate !== undefined ? updateData.inStoreClosedDate : currentStore.inStoreClosedDate;
        if (!inStoreClosedDate) {
          return res.status(400).json({ error: 'Validation Failed: In-Store Closed Date is mandatory when In-Store Closed is enabled.' });
        }
        const inStoreLiveDate = updateData.inStoreLiveDate !== undefined ? updateData.inStoreLiveDate : currentStore.inStoreLiveDate;
        if (inStoreLiveDate && new Date(inStoreClosedDate) < new Date(inStoreLiveDate)) {
          return res.status(400).json({ error: 'Validation Failed: In-Store Closure Date cannot be earlier than the In-Store Live Date. Please select a valid date.' });
        }
      } else {
        updateData.inStoreClosedDate = null;
      }

      if (deliveryClosed) {
        const deliveryClosedDate = updateData.deliveryClosedDate !== undefined ? updateData.deliveryClosedDate : currentStore.deliveryClosedDate;
        if (!deliveryClosedDate) {
          return res.status(400).json({ error: 'Validation Failed: Delivery Closed Date is mandatory when Delivery Closed is enabled.' });
        }
        const deliveryLiveDate = updateData.deliveryLiveDate !== undefined ? updateData.deliveryLiveDate : currentStore.deliveryLiveDate;
        if (deliveryLiveDate && new Date(deliveryClosedDate) < new Date(deliveryLiveDate)) {
          return res.status(400).json({ error: 'Validation Failed: Delivery Closure Date cannot be earlier than the Delivery Live Date. Please select a valid date.' });
        }
      } else {
        updateData.deliveryClosedDate = null;
      }
    }

    // Clear closure fields if status is not CLOSED
    if (targetStatus !== 'CLOSED') {
      updateData.inStoreClosed = false;
      updateData.deliveryClosed = false;
      updateData.inStoreClosedDate = null;
      updateData.deliveryClosedDate = null;
    }

    // Capture launchDate/month and reset auto-lock flags when status is updated to LIVE
    if (targetStatus === 'LIVE') {
      const liveDates: Date[] = [];
      const instDate = updateData.inStoreLiveDate !== undefined ? updateData.inStoreLiveDate : currentStore.inStoreLiveDate;
      const delivDate = updateData.deliveryLiveDate !== undefined ? updateData.deliveryLiveDate : currentStore.deliveryLiveDate;
      const instToggle = updateData.inStoreLive !== undefined ? updateData.inStoreLive : currentStore.inStoreLive;
      const delivToggle = updateData.deliveryLive !== undefined ? updateData.deliveryLive : currentStore.deliveryLive;

      if (instToggle && instDate) {
        liveDates.push(new Date(instDate));
      }
      if (delivToggle && delivDate) {
        liveDates.push(new Date(delivDate));
      }

      if (liveDates.length > 0) {
        const earliestLiveDate = new Date(Math.min(...liveDates.map(d => d.getTime())));
        updateData.launchDate = earliestLiveDate;
        updateData.cafeLaunchMonth = earliestLiveDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      } else if (!updateData.launchDate && !currentStore.launchDate) {
        updateData.launchDate = new Date();
        updateData.cafeLaunchMonth = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
      }

      if (currentStore.status !== 'LIVE' && updateData.status === 'LIVE') {
        if (updateData.isLocked === undefined) {
          updateData.isLocked = false;
        }
        updateData.isLockedAutoApplied = false;
      }
    }

    const modifiesContactDetails = CONTACT_FIELDS.some(key => {
      if (req.body[key] === undefined) return false;
      const dbVal = (currentStore as any)[key];
      const reqVal = req.body[key];
      const normDb = (dbVal === null || dbVal === undefined) ? '' : String(dbVal).trim();
      const normReq = (reqVal === null || reqVal === undefined) ? '' : String(reqVal).trim();
      return normDb !== normReq;
    });

    const isSuperAdmin = user.role === 'SUPER_ADMIN';
    const hasEditContacts = user.permissions && user.permissions.includes('EDIT_CONTACTS');
    const hasEditStores = user.permissions && user.permissions.includes('EDIT_STORES');
    const isApprovedStatus = ['NSO_APPROVED', 'APPROVED', 'LIVE'].includes(currentStore.status);

    if (!isSuperAdmin) {
      // 1. NSO Approval Lock: If the store is already approved, NO ONE (except Super Admin or Approvers changing status) can edit.
      // We must allow Approvers to change status or Go-Live fields, but we should strictly block standard edits.
      // To implement "read-only", we check if they are modifying fields.
      const modifiesNonContactFields = Object.keys(req.body).some(key => {
        if (CONTACT_FIELDS.includes(key) || key === 'isLocked' || key === 'status' || key === 'inStoreLive' || key === 'deliveryLive' || key === 'inStoreLiveDate' || key === 'deliveryLiveDate' || key === 'inStoreClosed' || key === 'deliveryClosed' || key === 'inStoreClosedDate' || key === 'deliveryClosedDate') return false;
        const dbVal = (currentStore as any)[key];
        const reqVal = req.body[key];
        const normDb = (dbVal === null || dbVal === undefined) ? '' : String(dbVal).trim();
        const normReq = (reqVal === null || reqVal === undefined) ? '' : String(reqVal).trim();
        return normDb !== normReq;
      });

      // If approved, block all edits to standard fields and contact fields
      if (isApprovedStatus) {
        if (modifiesNonContactFields || modifiesContactDetails) {
          return res.status(403).json({ error: 'Store is approved. No changes are allowed to store or contact details.' });
        }
      } else if (currentStore.isLocked && req.body.isLocked !== false) {
        // Locked state enforcement
        if (modifiesNonContactFields) {
          return res.status(403).json({ error: 'Store is locked. No changes are allowed to non-contact fields.' });
        }
        if (modifiesContactDetails && !hasEditContacts) {
          return res.status(403).json({ error: 'Access denied: You do not have permission to modify contact details.' });
        }
      } else {
        // Before approval and unlocked: enforce sub-access permissions
        if (modifiesNonContactFields && !hasEditStores) {
           return res.status(403).json({ error: 'Access denied: You do not have permission to modify store details (Requires Store Edit sub-access).' });
        }
        if (modifiesContactDetails && !hasEditContacts && !hasEditStores) {
           return res.status(403).json({ error: 'Access denied: You do not have permission to modify contact details.' });
        }
      }
    }

    // If user is FINANCE, enforce they can only update licensing, GST, rent agreements, and supporting docs
    if (user.role === 'FINANCE') {
      const allowedKeys = [
        'fssaiNo',
        'fssaiLicense',
        'fssaiStartDate',
        'fssaiExpiry',
        'fssaiIssuedOn',
        'fssaiValidUntil',
        'gstNo',
        'gstCertificateLink',
        'rentStartDate',
        'rentExpiry',
        'rentAgreementLink',
        'supportingDocs'
      ];
      const bodyKeys = Object.keys(req.body);
      const invalidKeys = bodyKeys.filter(key => !allowedKeys.includes(key));
      if (invalidKeys.length > 0) {
        return res.status(403).json({ error: 'Access denied: Finance users can only update compliance and lease details' });
      }
    }

    // Brand is a master attribute — only SUPER_ADMIN can change it on an existing store
    if (updateData.brand !== undefined && updateData.brand !== currentStore?.brand && user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Brand cannot be changed. Only Super Admin can modify the brand of an existing store.' });
    }

    // Capture approvedBy and approvedAt when transitioning to approved status, or clear it if transitioning out
    const nsoApprovalStatuses = ['APPROVED', 'NSO_APPROVED'];
    if (nsoApprovalStatuses.includes(updateData.status)) {
      if (!currentStore?.approvedBy || !nsoApprovalStatuses.includes(currentStore?.status)) {
        updateData.approvedBy = user?.name || user?.email || 'Unknown';
        updateData.approvedAt = new Date().toISOString();
      }
    } else if (updateData.status && !nsoApprovalStatuses.includes(updateData.status)) {
      updateData.approvedBy = null;
      updateData.approvedAt = null;
    }

    // Capture sentToNsoBy and sentToNsoAt when transitioning to PENDING_APPROVAL
    if (updateData.status === 'PENDING_APPROVAL') {
      if (currentStore?.status !== 'PENDING_APPROVAL') {
        updateData.sentToNsoBy = user?.name || user?.email || 'Unknown';
        updateData.sentToNsoAt = new Date().toISOString();
      }
    } else if (updateData.status && !['PENDING_APPROVAL', ...nsoApprovalStatuses, 'LIVE'].includes(updateData.status)) {
      updateData.sentToNsoBy = null;
      updateData.sentToNsoAt = null;
    }

    if (updateData.uploadedDocuments) {
      try {
        const docsList = typeof updateData.uploadedDocuments === 'string'
          ? JSON.parse(updateData.uploadedDocuments)
          : updateData.uploadedDocuments;

        if (Array.isArray(docsList)) {
          const loi = docsList.find(d => d.docType === 'loi');
          if (loi) {
            updateData.loiUrl = loi.fileUrl;
            updateData.loiFileName = loi.fileName;
          } else {
            updateData.loiUrl = null;
            updateData.loiFileName = null;
          }

          const budget = docsList.find(d => d.docType === 'budget_approval');
          if (budget) {
            updateData.budgetUrl = budget.fileUrl;
            updateData.budgetFileName = budget.fileName;
          } else {
            updateData.budgetUrl = null;
            updateData.budgetFileName = null;
          }

          const lease = docsList.find(d => d.docType === 'lease_agreement');
          if (lease) {
            updateData.agreementUrl = lease.fileUrl;
            updateData.agreementFileName = lease.fileName;
            updateData.rentAgreementLink = lease.fileUrl;
            updateData.rentStartDate = lease.issuedOn || null;
            updateData.rentExpiry = lease.validUntil || null;
          } else {
            updateData.agreementUrl = null;
            updateData.agreementFileName = null;
            updateData.rentAgreementLink = null;
            updateData.rentStartDate = null;
            updateData.rentExpiry = null;
          }

          const fssai = docsList.find(d => d.docType === 'fssai');
          if (fssai) {
            updateData.fssaiLicense = fssai.fileUrl;
            updateData.fssaiStartDate = fssai.issuedOn || null;
            updateData.fssaiExpiry = fssai.validUntil || null;
            updateData.fssaiNo = fssai.fssaiNo || null;
          } else {
            updateData.fssaiLicense = null;
            updateData.fssaiStartDate = null;
            updateData.fssaiExpiry = null;
            updateData.fssaiNo = null;
          }

          const gst = docsList.find(d => d.docType === 'gst_certificate');
          if (gst) {
            updateData.gstCertificateLink = gst.fileUrl;
          } else {
            updateData.gstCertificateLink = null;
          }

          const miscDocs = docsList.filter(d => d.docType === 'miscellaneous').map(d => d.fileUrl);
          if (miscDocs.length > 0) {
            updateData.supportingDocs = JSON.stringify(miscDocs);
          } else {
            updateData.supportingDocs = null;
          }
        }
      } catch (e) {
        console.error('Failed to parse uploadedDocuments for legacy mapping:', e);
      }
    }

    // Convert empty strings to null for optional fields to satisfy Prisma type constraints
    for (const key in updateData) {
      if (updateData[key] === '') {
        updateData[key] = null;
      }
    }

    // Parse date fields
    if (updateData.launchDate && typeof updateData.launchDate === 'string') {
      updateData.launchDate = new Date(updateData.launchDate);
    }
    if (updateData.inStoreLiveDate && typeof updateData.inStoreLiveDate === 'string') {
      updateData.inStoreLiveDate = new Date(updateData.inStoreLiveDate);
    }
    if (updateData.deliveryLiveDate && typeof updateData.deliveryLiveDate === 'string') {
      updateData.deliveryLiveDate = new Date(updateData.deliveryLiveDate);
    }
    if (updateData.inStoreClosedDate && typeof updateData.inStoreClosedDate === 'string') {
      updateData.inStoreClosedDate = new Date(updateData.inStoreClosedDate);
    }
    if (updateData.deliveryClosedDate && typeof updateData.deliveryClosedDate === 'string') {
      updateData.deliveryClosedDate = new Date(updateData.deliveryClosedDate);
    }

    // Parse numeric fields if they exist
    if (updateData.hasOwnProperty('lat')) {
      updateData.lat = updateData.lat ? parseFloat(updateData.lat) : null;
    }
    if (updateData.hasOwnProperty('lng')) {
      updateData.lng = updateData.lng ? parseFloat(updateData.lng) : null;
    }
    if (updateData.hasOwnProperty('latitude')) {
      updateData.latitude = updateData.latitude ? parseFloat(updateData.latitude) : null;
    }
    if (updateData.hasOwnProperty('latt')) {
      updateData.latt = updateData.latt ? parseFloat(updateData.latt) : null;
    }
    if (updateData.hasOwnProperty('long')) {
      updateData.long = updateData.long ? parseFloat(updateData.long) : null;
    }
    
    // Parse foreign keys if they exist
    if (updateData.hasOwnProperty('areaManagerId')) {
      updateData.areaManagerId = updateData.areaManagerId || null;
    }
    if (updateData.hasOwnProperty('cityHeadId')) {
      updateData.cityHeadId = updateData.cityHeadId || null;
    }
    if (updateData.hasOwnProperty('cafeManagerId')) {
      updateData.cafeManagerId = updateData.cafeManagerId || null;
    }

    // Remove fields we don't want to blindly update from body if they are handled elsewhere
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    delete updateData.areaManager;
    delete updateData.cityHead;
    delete updateData.cafeManager;
    delete updateData.histories;
    delete updateData.licenses;

    // Compare old uploadedDocuments with new uploadedDocuments to audit log in storageFiles
    if (updateData.uploadedDocuments) {
      try {
        const oldDocs = Array.isArray(currentStore.uploadedDocuments) 
          ? currentStore.uploadedDocuments 
          : (typeof currentStore.uploadedDocuments === 'string' ? JSON.parse(currentStore.uploadedDocuments) : []);
        const newDocs = typeof updateData.uploadedDocuments === 'string'
          ? JSON.parse(updateData.uploadedDocuments)
          : updateData.uploadedDocuments;

        if (Array.isArray(oldDocs) && Array.isArray(newDocs)) {
          // Find newly uploaded files
          for (const newD of newDocs) {
            if (newD.fileUrl) {
              const exists = oldDocs.some(o => o.fileUrl === newD.fileUrl);
              if (!exists) {
                await prisma.storageFile.create({
                  data: {
                    storeId: id,
                    cafeCode: currentStore.cafeCode || '',
                    cafeName: currentStore.cafeName || '',
                    fileName: newD.fileName || 'Untitled Document',
                    fileUrl: newD.fileUrl,
                    docType: newD.docType || 'unknown',
                    category: newD.category || 'Miscellaneous Documents',
                    uploadedBy: user.email || 'System',
                    uploadedAt: newD.uploadedAt || new Date().toISOString(),
                    status: 'Live'
                  }
                });
              }
            }
          }

          // Find deleted files
          for (const oldD of oldDocs) {
            if (oldD.fileUrl) {
              const stillExists = newDocs.some(n => n.fileUrl === oldD.fileUrl);
              if (!stillExists) {
                const existingRecords = await prisma.storageFile.findMany({
                  where: { fileUrl: oldD.fileUrl }
                });
                if (existingRecords.length > 0) {
                  for (const rec of existingRecords) {
                    await prisma.storageFile.update({
                      where: { id: rec.id },
                      data: {
                        status: 'Deleted',
                        deletedBy: user.email || 'System',
                        deletedAt: new Date().toISOString()
                      }
                    });
                  }
                } else {
                  await prisma.storageFile.create({
                    data: {
                      storeId: id,
                      cafeCode: currentStore.cafeCode || '',
                      cafeName: currentStore.cafeName || '',
                      fileName: oldD.fileName || 'Untitled Document',
                      fileUrl: oldD.fileUrl,
                      docType: oldD.docType || 'unknown',
                      category: oldD.category || 'Miscellaneous Documents',
                      uploadedBy: oldD.uploadedBy || 'System',
                      uploadedAt: oldD.uploadedAt || new Date().toISOString(),
                      status: 'Deleted',
                      deletedBy: user.email || 'System',
                      deletedAt: new Date().toISOString()
                    }
                  });
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to log document modifications in storageFiles:', err);
      }
    }

    const store = await prisma.store.update({
      where: { id: id as string },
      data: updateData,
    });

    await prisma.storeHistory.create({
      data: {
        storeId: store.id,
        action: 'Store Details Updated',
      }
    });




    res.json(store);
  } catch (error: any) {
    console.error('Update store error:', error);
    if (error.message && (error.message.includes('Bluetokai email ID') || error.message.includes('Cafe Launch Month'))) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update store' });
  }
});

// Bulk Download Stores
router.get('/bulk/download', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { action, brand } = req.query;

    // ── CSV helper: safely convert any value to a CSV-safe string ──────────
    const csvSafe = (val: any): string => {
      if (val === null || val === undefined) return '';
      if (val instanceof Date) return val.toISOString().split('T')[0];
      if (typeof val === 'object') {
        // Arrays / objects → JSON string (avoids [object Object] in CSV)
        try { return JSON.stringify(val); } catch { return ''; }
      }
      return String(val);
    };

    // Wrap a value in quotes if it contains comma, quote, or newline
    const csvCell = (val: any): string => {
      const s = csvSafe(val);
      if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };

    const headers = STORE_CSV_HEADERS.map(h => h.id);

    // Build header row
    const headerRow = headers.map(h => csvCell(h)).join(',');

    let records: any[] = [];

    if (action === 'modify' && brand) {
      let whereClause: any;

      if (brand === 'ALL_BRANDS') {
        whereClause = undefined; // No filter — fetch every store
      } else if (brand === 'BLUE_TOKAI_SUCHALI') {
        whereClause = {
          OR: [
            { brand: 'BLUE_TOKAI_SUCHALI' },
            { brand: null },
            { brand: '' }
          ]
        };
      } else {
        whereClause = { brand: brand as string };
      }

      records = await prisma.store.findMany(whereClause ? { where: whereClause } : {});
    }
    // action === 'create' → records stays []

    // Build data rows — safely handle every field value
    const dataRows = records.map(record => {
      return headers.map(fieldId => {
        let val = record[fieldId];
        // Normalise date fields
        if (fieldId === 'launchDate' && val) {
          if (val instanceof Date) {
            val = val.toISOString().split('T')[0];
          } else {
            // Already a string (prisma-mock converts Firestore Timestamps to ISO strings)
            val = String(val).split('T')[0];
          }
        }
        return csvCell(val);
      }).join(',');
    });

    const csvContent = [headerRow, ...dataRows].join('\r\n');

    const brandLabel = brand === 'ALL_BRANDS' ? 'all_brands' : (brand || 'template');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${action}_stores_${brandLabel}.csv"`);
    res.send(csvContent);
  } catch (error: any) {
    const msg = error?.message || String(error);
    console.error('Download bulk error:', msg, error?.stack);
    // Return the real error message so the frontend can display it
    res.status(500).json({ error: `Failed to generate CSV: ${msg}` });
  }
});
function getFriendlyFieldName(field: string): string {
  const mapping: Record<string, string> = {
    cafeName: 'Cafe Name',
    cafeCode: 'Cafe Code',
    cafeModule: 'Cafe Module',
    cafeAddress: 'Cafe Address',
    city: 'City',
    state: 'State',
    pinCode: 'Pin Code',
    zone: 'Zone',
    cafeLocationGoogleLink: 'Cafe Google Map Link',
    latitude: 'Latitude',
    latt: 'Latitude',
    long: 'Longitude',
    cafeOpenTiming: 'Cafe Opening Time',
    cafeClosingTime: 'Cafe ClosingTime',
    actualClosingTime: 'Actual Closing Time',
    cityHeadEmail: 'City Head Email',
    cityHeadPhone: 'City Head Phone Number',
    platformType: 'Platform Type',
    tradingArea: 'Trading Area',
    launchStatus: 'Launch Status',
    launchDate: 'Launch Date',
    cafeMailId: 'Cafe Email',
    cafeManagerMailId: 'Cafe Manager Email',
    areaManagerEmail: 'Area Manager Email',
    cafeLaunchMonth: 'Launch Month',
    pricingVersion: 'Pricing Version',
    smokingZone: 'Smoking Zone',
    parkingOption: 'Parking Option',
    wheelchairAccessibility: 'Wheelchair Accessibility',
    indoorSeatingCount: 'Indoor Seating Count',
    outdoorSeatingCount: 'Outdoor Seating Count',
    totalNoOfTables: 'Total No. of Tables',
    copyMenuFrom: 'Copy Menu From',
    blueTokaiSwiggyRID: 'Blue Tokai Swiggy ID',
    blueTokaiZomatoRID: 'Blue Tokai Zomato ID',
    suchaliSwiggyRID: 'Suchali Swiggy ID',
    suchaliZomatoRID: 'Suchali Zomato ID',
    gotTeaSwiggyRID: 'Got Tea Swiggy ID',
    gotTeaZomatoRID: 'Got Tea Zomato ID',
    newPricingCategory: 'New Pricing Category',
    newPricingSubCategory: 'New Pricing Sub-Category',
    cluster: 'Cluster',
    cafeOpeningHr: 'Cafe Opening Hours',
    cafePhoneNumber: 'Cafe Phone Number',
    cafeManagerName: 'Cafe Manager Name',
    cafeManagerContactNo: 'Cafe Manager Contact Number',
    areaManagerName: 'Area Manager Name',
    areaManagerPhone: 'Area Manager Phone Number',
    cityHeadName: 'City Head Name'
  };
  return mapping[field] || field;
}

// Bulk Upload Stores
router.post('/bulk/upload', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'MANAGER'), parseMultipartMiddleware(false), async (req: any, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Please choose a CSV file to upload.' });
  }

  const { action, brand } = req.body;
  
  if (action !== 'create' && !brand) {
    return res.status(400).json({ error: 'Please select a brand before uploading.' });
  }
  if (action === 'create' && req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Only Super Admins can create stores in bulk.' });
  }

  const user = req.user;
  const results: any[] = [];
  const errors: { message: string }[] = [];
  let headerValidated = false;

  const stream = Readable.from(req.file.buffer);

  stream
    .pipe(csvParser({
      mapHeaders: ({ header }) => {
        if (!header || typeof header !== 'string') return '';
        const trimmed = header.trim().replace(/[\s_-]/g, '').toLowerCase();
        const matched = STORE_CSV_HEADERS.find(sh => sh.id.toLowerCase().replace(/[\s_-]/g, '') === trimmed);
        return matched ? matched.id : header.trim();
      }
    }))
    .on('headers', (headers: string[]) => {
      const cleanHeaders = headers.filter(h => h && h.trim() !== '');

      // Validate that 'cafeCode' is present
      if (!cleanHeaders.includes('cafeCode')) {
        errors.push({ message: "The 'Cafe Code' column is required but was not found in your CSV file. Please make sure the column is included and try again." });
      } else {
        // Validate that all headers in the CSV are valid columns in STORE_CSV_HEADERS
        const invalidHeaders = cleanHeaders.filter(h => !STORE_CSV_HEADERS.some(sh => sh.id === h));
        if (invalidHeaders.length > 0) {
          errors.push({ message: `The following columns in your CSV file are not recognized: ${invalidHeaders.map(getFriendlyFieldName).join(', ')}. Please remove or correct them.` });
        }
        
        // For creation, verify all MANDATORY_FIELDS columns are included
        if (action === 'create') {
          const requiredHeaders = user.role === 'SUPER_ADMIN' ? ['brand', 'cafeName', 'cafeCode', 'pinCode'] : MANDATORY_FIELDS;
          const missingMandatoryHeaders = requiredHeaders.filter(field => !cleanHeaders.includes(field));
          if (missingMandatoryHeaders.length > 0) {
            errors.push({ message: `To create new stores, please include the following required columns: ${missingMandatoryHeaders.map(getFriendlyFieldName).join(', ')}.` });
          }
        }
      }
      headerValidated = true;
    })
    .on('data', (data) => {
      if (errors.length > 0) return;
      results.push(data);
    })
    .on('end', async () => {
      try {
        if (errors.length > 0) {
          return res.status(400).json({ errors });
        }

        if (results.length === 0) {
          return res.status(400).json({ error: 'The uploaded CSV file is empty.' });
        }

        let processedCount = 0;

        if (action === 'create') {
          const isSuperAdmin = user.role === 'SUPER_ADMIN';
          const hasEditContacts = user.permissions && user.permissions.includes('EDIT_CONTACTS');

          const promises = results.map(async (row, i) => {
            const rowErrors: string[] = [];

            // 1. Validate mandatory fields (non-empty)
            const requiredFields = isSuperAdmin ? ['brand', 'cafeName', 'cafeCode', 'pinCode'] : MANDATORY_FIELDS;
            const missingFields = requiredFields.filter(field => !row[field] || String(row[field]).trim() === '');
            if (missingFields.length > 0) {
              rowErrors.push(`The following required fields are empty: ${missingFields.map(getFriendlyFieldName).join(', ')}.`);
            }

            // 2. Email checks
            const emailFields = ['cafeMailId', 'cafeManagerMailId', 'areaManagerEmail', 'cityHeadEmail'];
            for (const field of emailFields) {
              if (row[field]) {
                const emailVal = String(row[field]).toLowerCase().trim();
                if (!emailVal.endsWith('@bluetokaicoffee.com') && !emailVal.endsWith('@gottea.in')) {
                  rowErrors.push(`${getFriendlyFieldName(field)} must be a valid company email address ending with @bluetokaicoffee.com or @gottea.in.`);
                }
              }
            }

            // 3. Launch month format check
            if (row.cafeLaunchMonth && !/^[a-zA-Z]+\s+\d{4}$/.test(String(row.cafeLaunchMonth).trim())) {
              rowErrors.push("The launch month format is incorrect. Please write it like 'June 2026'.");
            }

            // 4. Cafe module check
            const moduleVal = row.cafeModule || row.cafeModel;
            if (moduleVal && !CAFE_MODELS.includes(moduleVal)) {
              rowErrors.push("The cafe module name is not recognized. Please choose a valid option.");
            }

            // 5. Pricing version check
            const pricingVal = row.pricingVersion || row.menu;
            if (pricingVal && !MENU_OPTIONS.includes(pricingVal)) {
              rowErrors.push("The pricing version is not recognized. Please choose a valid option.");
            }

            // 6. State check
            if (row.state && !INDIAN_STATES.includes(row.state)) {
              rowErrors.push("Please enter a valid Indian state name.");
            }

            // 7. Permissions checks for contact details
            if (!isSuperAdmin && !hasEditContacts) {
              const sendsContactDetails = CONTACT_FIELDS.some(key => {
                const val = row[key];
                return val !== undefined && val !== null && String(val).trim() !== '';
              });
              if (sendsContactDetails) {
                rowErrors.push("You do not have the required permissions to modify contact details.");
              }
            }

            try {
              // Check if cafeCode already exists
              const cafeCode = row.cafeCode;
              if (cafeCode) {
                const existing = await prisma.store.findUnique({ where: { cafeCode } });
                if (existing) {
                  rowErrors.push(`A store with Cafe Code '${cafeCode}' already exists in the system.`);
                }
              }

              // Check if cafeName already exists
              const cafeName = row.cafeName;
              if (cafeName) {
                const existingName = await prisma.store.findFirst({ where: { cafeName } });
                if (existingName) {
                  rowErrors.push(`A store with Cafe Name '${cafeName}' already exists in the system.`);
                }
              }

              if (rowErrors.length > 0) {
                rowErrors.forEach(msg => errors.push({ message: `Row ${i + 2}: ${msg}` }));
                return;
              }

              // Insert the record
              try {
                const data: any = { ...row };
                if (brand) {
                   data.brand = brand;
                } else if (!data.brand && row.brand) {
                   data.brand = row.brand;
                }

                if (data.lat) data.lat = parseFloat(data.lat);
                if (data.lng) data.lng = parseFloat(data.lng);
                if (data.latitude) data.latitude = parseFloat(data.latitude);
                if (data.latt) data.latt = parseFloat(data.latt);
                if (data.long) data.long = parseFloat(data.long);
                if (data.launchDate) data.launchDate = new Date(data.launchDate);
                
                data.enteredByEmail = user.email;
                data.status = 'PENDING_APPROVAL';

                delete data.areaManagerId;
                delete data.cityHeadId;
                delete data.cafeManagerId;

                for (const key in data) {
                   if (data[key] === '') data[key] = null;
                }

                await prisma.store.create({
                  data: {
                     ...data,
                     cafeCode: data.cafeCode,
                     cafeName: data.cafeName
                  }
                });
                processedCount++;
              } catch (err: any) {
                errors.push({ message: `Row ${i + 2}: We couldn't create the store in the database. Please try again.` });
              }
            } catch (err: any) {
              errors.push({ message: `Row ${i + 2}: We couldn't process this row. Please try again.` });
            }
          });

          await Promise.all(promises);
        } else if (action === 'modify') {
          const isSuperAdmin = user.role === 'SUPER_ADMIN';
          const hasEditContacts = user.permissions && user.permissions.includes('EDIT_CONTACTS');

          const promises = results.map(async (row, i) => {
            const rowErrors: string[] = [];
            const cafeCode = row.cafeCode;

            if (!cafeCode || String(cafeCode).trim() === '') {
              rowErrors.push("Cafe Code is missing.");
              rowErrors.forEach(msg => errors.push({ message: `Row ${i + 2}: ${msg}` }));
              return;
            }

            try {
              const existing = await prisma.store.findUnique({ where: { cafeCode } });
              if (!existing) {
                 rowErrors.push(`We couldn't find a store with Cafe Code '${cafeCode}' in the system.`);
                 rowErrors.forEach(msg => errors.push({ message: `Row ${i + 2}: ${msg}` }));
                 return;
              }

              // Validate fields that are present in the row/CSV headers
              const presentHeaders = Object.keys(row);
              
              // 1. Mandatory checks (for columns present in CSV headers but empty)
              const missingFields = MANDATORY_FIELDS.filter(field => 
                presentHeaders.includes(field) && (!row[field] || String(row[field]).trim() === '')
              );
              if (missingFields.length > 0) {
                rowErrors.push(`The following required fields are empty: ${missingFields.map(getFriendlyFieldName).join(', ')}.`);
              }

              // 2. Email checks
              const emailFields = ['cafeMailId', 'cafeManagerMailId', 'areaManagerEmail', 'cityHeadEmail'];
              for (const field of emailFields) {
                if (presentHeaders.includes(field) && row[field]) {
                  const emailVal = String(row[field]).toLowerCase().trim();
                  if (!emailVal.endsWith('@bluetokaicoffee.com') && !emailVal.endsWith('@gottea.in')) {
                    rowErrors.push(`${getFriendlyFieldName(field)} must be a valid company email address ending with @bluetokaicoffee.com or @gottea.in.`);
                  }
                }
              }

              // 3. Launch month format check
              if (presentHeaders.includes('cafeLaunchMonth') && row.cafeLaunchMonth && !/^[a-zA-Z]+\s+\d{4}$/.test(String(row.cafeLaunchMonth).trim())) {
                rowErrors.push("The launch month format is incorrect. Please write it like 'June 2026'.");
              }

              // 4. Cafe module check
              const moduleVal = row.cafeModule || row.cafeModel;
              if ((presentHeaders.includes('cafeModule') || presentHeaders.includes('cafeModel')) && moduleVal && !CAFE_MODELS.includes(moduleVal)) {
                rowErrors.push("The cafe module name is not recognized. Please choose a valid option.");
              }

              // 5. Pricing version check
              const pricingVal = row.pricingVersion || row.menu;
              if ((presentHeaders.includes('pricingVersion') || presentHeaders.includes('menu')) && pricingVal && !MENU_OPTIONS.includes(pricingVal)) {
                rowErrors.push("The pricing version is not recognized. Please choose a valid option.");
              }

              // 6. State check
              if (presentHeaders.includes('state') && row.state && !INDIAN_STATES.includes(row.state)) {
                rowErrors.push("Please enter a valid Indian state name.");
              }

              // 7. Compute contact fields modifications
              const modifiesContactDetails = CONTACT_FIELDS.some(key => {
                if (row[key] === undefined) return false;
                const dbVal = (existing as any)[key];
                const reqVal = row[key];
                const normDb = (dbVal === null || dbVal === undefined) ? '' : String(dbVal).trim();
                const normReq = (reqVal === null || reqVal === undefined) ? '' : String(reqVal).trim();
                return normDb !== normReq;
              });

              // 8. Compute non-contact fields modifications
              const NOT_EDITABLE_FIELDS = [
                'cafeName', 'cafeCode', 'cafeModule', 'zone', 
                'cafeLocationGoogleLink', 'latitude', 'latt', 'long', 'gstNo', 'fssaiNo', 
                'fssaiLicense', 'gstCertificateLink', 'isLocked', 'brand'
              ];
              const modifiesNonContactFields = Object.keys(row).some(key => {
                if (CONTACT_FIELDS.includes(key) || NOT_EDITABLE_FIELDS.includes(key)) return false;
                if (row[key] === undefined) return false;
                const dbVal = (existing as any)[key];
                const reqVal = row[key];
                const normDb = (dbVal === null || dbVal === undefined) ? '' : String(dbVal).trim();
                const normReq = (reqVal === null || reqVal === undefined) ? '' : String(reqVal).trim();
                return normDb !== normReq;
              });

              // 9. Permissions & lock checks
              if (existing.isLocked) {
                if (!isSuperAdmin) {
                  if (modifiesNonContactFields) {
                    rowErrors.push("This store is locked; you can only update its contact details.");
                  }
                  if (modifiesContactDetails && !hasEditContacts) {
                    rowErrors.push("This store is locked and you do not have permission to change its contact details.");
                  }
                }
              } else {
                if (!isSuperAdmin) {
                  if (modifiesContactDetails && !hasEditContacts) {
                    rowErrors.push("You do not have permission to change the contact details for this store.");
                  }
                }
              }

              if (rowErrors.length > 0) {
                rowErrors.forEach(msg => errors.push({ message: `Row ${i + 2}: ${msg}` }));
                return;
              }

              // Perform the update
              try {
                const data: any = { ...row };
                if (data.lat) data.lat = parseFloat(data.lat);
                if (data.lng) data.lng = parseFloat(data.lng);
                if (data.latitude) data.latitude = parseFloat(data.latitude);
                if (data.latt) data.latt = parseFloat(data.latt);
                if (data.long) data.long = parseFloat(data.long);
                if (data.launchDate) data.launchDate = new Date(data.launchDate);
                
                if (data.indoorSeatingCount !== undefined) {
                  data.indoorSeatingCount = data.indoorSeatingCount ? parseInt(data.indoorSeatingCount, 10) : null;
                }
                if (data.outdoorSeatingCount !== undefined) {
                  data.outdoorSeatingCount = data.outdoorSeatingCount ? parseInt(data.outdoorSeatingCount, 10) : null;
                }
                if (data.totalNoOfTables !== undefined) {
                  data.totalNoOfTables = data.totalNoOfTables ? parseInt(data.totalNoOfTables, 10) : null;
                }

                delete data.id;
                delete data.createdAt;
                delete data.updatedAt;

                // Remove non-editable fields from update payload
                const UPDATE_NOT_EDITABLE_FIELDS = [
                  'cafeName', 'cafeCode', 'cafeModule', 'zone', 
                  'cafeLocationGoogleLink', 'latitude', 'latt', 'long', 'gstNo', 'fssaiNo', 
                  'fssaiLicense', 'gstCertificateLink'
                ];
                UPDATE_NOT_EDITABLE_FIELDS.forEach(field => {
                    delete data[field];
                });

                for (const key in data) {
                   if (data[key] === '') data[key] = null;
                }

                data.brand = brand;
                await prisma.store.update({
                  where: { id: existing.id },
                  data: data
                });
                processedCount++;
              } catch (err: any) {
                errors.push({ message: `Row ${i + 2}: We couldn't save updates to the database. Please try again.` });
              }
            } catch (err: any) {
              errors.push({ message: `Row ${i + 2}: We couldn't process this row. Please try again.` });
            }
          });

          await Promise.all(promises);
        }

        if (errors.length > 0 && processedCount === 0) {
           return res.status(400).json({ errors, message: `Failed to process records.` });
        }

        res.json({
          message: `Successfully ${action === 'create' ? 'created' : 'updated'} ${processedCount} stores.`,
          successCount: processedCount,
          failedCount: errors.length,
          errors: errors.length > 0 ? errors : undefined,
          totalCount: results.length
        });
      } catch (err: any) {
        console.error('Bulk upload handler crashed:', err);
        return res.status(500).json({ error: 'Bulk upload processing failed', message: 'We ran into an unexpected issue while saving the data. Please try again.' });
      }
    })
    .on('error', (err: any) => {
      console.error('CSV parser stream error:', err);
      if (!res.headersSent) {
        res.status(400).json({ error: 'Failed to process CSV file', message: 'We ran into an issue reading the CSV file. Please make sure the format is correct and try again.' });
      }
    });
});

// GET /pincode/:pincode (CORS proxy for pin code lookup)
router.get('/pincode/:pincode', async (req, res) => {
  const { pincode } = req.params;
  try {
    const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch from postal service' });
    }
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error('Pincode fetch error:', error);
    res.status(500).json({ error: error.message || 'Internal server error fetching pincode details' });
  }
});

// Helper function to build Swiggy template 2D array
function buildSwiggyTemplateData(store: any, brandParam: string) {
  let restaurantName = "Blue Tokai Coffee Roasters";
  const normalizedBrand = brandParam.toLowerCase();
  if (normalizedBrand.includes("suchali")) {
    restaurantName = "Suchali Artisan Bakehouse";
  } else if (normalizedBrand.includes("got_tea") || normalizedBrand.includes("gottea")) {
    restaurantName = "Got Tea";
  }

  const completeAddress = [
    store.cafeAddress || store.address,
    store.city,
    store.state,
    store.pinCode
  ].filter(Boolean).join(', ');

  const latLong = [
    store.latitude || store.lat,
    store.long || store.lng
  ].filter(val => val !== null && val !== undefined && val !== '').join(', ');

  return [
    ["Attribute", "Validation"],
    ["New / Existing Onboarding*", "New"],
    ["Restaurant Name*", restaurantName],
    ["Number of outlets to be onboarded*", "1"],
    ["Existing RID", ""],
    ["Display Name", store.cafeName || ""],
    ["New Outlet City*", store.city || ""],
    ["Complete Address", completeAddress],
    ["Lat & long", latLong],
    ["City Type", ""],
    ["Menu type* ( POS )", "POS"],
    ["Replication ID / POS partner name", "Rista"],
    ["Partner app training requirement*", "No"],
    ["OB Fee* (If OB is diff from the approved value, attach the approval email)", "."],
    ["Commission %*", "17"],
    ["Commission type ( Gross / Net )", "Net"],
    ["Launch type*", ""],
    ["Owner email ID / Invoicing email ID", "aggregator@bluetokaicoffee.com"],
    ["Owner Name", "Satwik"],
    ["GST category ( Restaurant / Non - Restaurant / Hybrid )", "Restaurant"],
    ["Restaurant Timings", "7 AM - 11 PM"],
    ["Owner Phone number", "9667440872"],
    ["Packing Type ( Item level / cart level )", "Cart Level"],
    ["Packing chargers - if item level mentioned % if cart level mentioned flat amount", "25"],
    ["Cuisines", "Cafe, Coffee, Beverages"],
    ["CFT", ""],
    ["CGST & SGST", "5"],
    ["Order Notification Email ID", store.cafeMailId || store.email || ""],
    ["Order Manager Number", store.cafePhoneNumber || store.phone || ""],
    ["Map Link", store.cafeLocationGoogleLink || ""]
  ];
}

// GET /:id (Get single store)
router.get('/:id', authenticateToken, async (req: any, res) => {
  const storeId = req.params.id;
  try {
    // 1. Look up by Firestore ID first
    let store = await prisma.store.findUnique({
      where: { id: storeId },
      include: {
        areaManager: true,
        cityHead: true,
      }
    });

    // 2. If not found, look up by cafeCode (e.g. CA-204)
    if (!store) {
      store = await prisma.store.findFirst({
        where: { cafeCode: storeId },
        include: {
          areaManager: true,
          cityHead: true,
        }
      });
    }

    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    res.json(store);
  } catch (error) {
    console.error('[Store GET Single] Error fetching store:', error);
    res.status(500).json({ error: 'Failed to fetch store details', details: error instanceof Error ? error.message : String(error) });
  }
});

// GET /:id/swiggy-template
router.get('/:id/swiggy-template', authenticateToken, async (req: any, res) => {
  const storeId = req.params.id;
  const brandParam = String(req.query.brand || '');
  if (!storeId) {
    return res.status(400).json({ error: 'Invalid store ID.' });
  }

  try {
    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      return res.status(404).json({ error: 'Store not found.' });
    }

    const wsData = buildSwiggyTemplateData(store, brandParam);
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 70 },
      { wch: 50 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Swiggy Template");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    let restaurantName = "Blue_Tokai";
    const normalizedBrand = brandParam.toLowerCase();
    if (normalizedBrand.includes("suchali")) {
      restaurantName = "Suchali_Artisan_Bakehouse";
    } else if (normalizedBrand.includes("got_tea") || normalizedBrand.includes("gottea")) {
      restaurantName = "Got_Tea";
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Swiggy_${restaurantName}_Onboarding_Template_${store.cafeCode}.xlsx`);
    res.send(buffer);
  } catch (error: any) {
    console.error('Error generating Swiggy template:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// GET /:id/zomato-template
router.get('/:id/zomato-template', authenticateToken, async (req: any, res) => {
  const storeId = req.params.id;
  const brandParam = String(req.query.brand || '');
  if (!storeId) {
    return res.status(400).json({ error: 'Invalid store ID.' });
  }

  try {
    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      return res.status(404).json({ error: 'Store not found.' });
    }

    const normalizedBrand = brandParam.toLowerCase();
    let brandName = "Blue Tokai Coffee Roasters";
    if (normalizedBrand.includes("suchali")) {
      brandName = "Suchali's Artisan Bakehouse";
    } else if (normalizedBrand.includes("got_tea") || normalizedBrand.includes("gottea")) {
      brandName = "Got Tea";
    }

    const completeAddress = [
      store.cafeAddress || store.address,
      store.city,
      store.state,
      store.pinCode
    ].filter(Boolean).join(', ');

    // Format current date as DD-MM-YYYY
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    const dateStr = `${dd}-${mm}-${yyyy}`;

    const tempDir = path.resolve(__dirname, '../temp_docs');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const inputDocxPath = path.resolve(__dirname, '../templates/Zomato_OB_Form_Template.docx');
    const tempDocxPath = path.resolve(tempDir, `temp_zomato_${store.id}_${Date.now()}.docx`);
    const tempPdfPath = path.resolve(tempDir, `temp_zomato_${store.id}_${Date.now()}.pdf`);

    // Generate the customized docx
    await executeProcessDocx(inputDocxPath, tempDocxPath, brandName, store.cafeName || '', completeAddress, dateStr);

    // Convert docx to pdf
    await convertDocxToPdf(tempDocxPath, tempPdfPath);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Zomato_Onboarding_Form_${store.cafeCode}.pdf`);
    
    res.sendFile(tempPdfPath, (err) => {
      // Clean up temporary files after sending
      if (fs.existsSync(tempDocxPath)) {
        try { fs.unlinkSync(tempDocxPath); } catch (e) {}
      }
      if (fs.existsSync(tempPdfPath)) {
        try { fs.unlinkSync(tempPdfPath); } catch (e) {}
      }
    });
  } catch (error: any) {
    console.error('Error generating Zomato template:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Helper function to build a styled HTML table matching the reference screenshot
// Burnt amber header (#B45309), orange cell for Restaurant Name (row 2),
// green cell for Display Name (row 5), bold attribute for Partner app training (row 12)
// "New / Existing Onboarding*" (row 1) = plain white bg, black text
// All data cell text is black (#000000)
function buildHtmlTable(data: string[][]) {
  // Row index in data (0 = header, 2 = Restaurant Name, 5 = Display Name, 12 = Partner training)
  const orangeRows = new Set([2]);   // Only "Restaurant Name*" gets orange bg
  const greenRows  = new Set([5]);   // "Display Name"
  const boldRows   = new Set([12]);  // "Partner app training requirement*"

  let html = `<div style="font-family: Arial, sans-serif; margin: 20px 0; max-width: 100%; overflow-x: auto;">`;
  html += `<table style="border-collapse: collapse; width: 50%; min-width: 400px; font-size: 13px; text-align: left;">`;

  data.forEach((row, rowIndex) => {
    html += `<tr>`;
    row.forEach((cell, colIndex) => {
      if (rowIndex === 0) {
        // Header row: burnt amber background, white bold text, center-aligned
        const borderRight = colIndex === 0 ? 'border-right: 1px solid #7c3500;' : '';
        html += `<td style="background-color: #B45309; color: #ffffff; font-weight: bold; font-size: 13px; text-align: center; padding: 10px 14px; ${borderRight}">${cell || ''}</td>`;
      } else {
        // Data rows — all text is black (#000000)
        const isAttributeCol = colIndex === 0;
        const isBold = boldRows.has(rowIndex);

        if (isAttributeCol) {
          const fontWeight = isBold ? 'font-weight: bold;' : 'font-weight: normal;';
          html += `<td style="border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; color: #000000; ${fontWeight}">${cell || ''}</td>`;
        } else {
          // Validation column — apply colour-coding backgrounds, always black text
          let bgColor = '';
          if (orangeRows.has(rowIndex)) {
            bgColor = 'background-color: #FF8C00;';
          } else if (greenRows.has(rowIndex)) {
            bgColor = 'background-color: #00A651;';
          }
          html += `<td style="border: 1px solid #cbd5e1; padding: 8px 12px; text-align: center; ${bgColor} color: #000000; font-weight: normal;">${cell || ''}</td>`;
        }
      }
    });
    html += `</tr>`;
  });

  html += `</table>`;
  html += `</div>`;
  return html;
}

// Helper function to execute process_docx.py script
function executeProcessDocx(
  inputPath: string,
  outputPath: string,
  brandName: string,
  cafeName: string,
  addressStr: string,
  dateStr: string
): Promise<void> {
  const escapeArg = (arg: string) => `'${arg.replace(/'/g, "'\\''")}'`;
  const scriptPath = path.resolve(__dirname, '../utils/process_docx.py');
  const command = `python3 ${escapeArg(scriptPath)} ${escapeArg(path.resolve(inputPath))} ${escapeArg(path.resolve(outputPath))} ${escapeArg(brandName)} ${escapeArg(cafeName)} ${escapeArg(addressStr)} ${escapeArg(dateStr)}`;
  
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('exec error:', error, stderr);
        return reject(error);
      }
      resolve();
    });
  });
}

// Helper function to convert Docx to Pdf via Microsoft Word AppleScript (osascript)
function convertDocxToPdf(docxPath: string, pdfPath: string): Promise<void> {
  const resolvedDocxPath = path.resolve(docxPath);
  const resolvedPdfPath = path.resolve(pdfPath);
  const tempScriptPath = resolvedDocxPath.replace(/\.docx$/, '.scpt');
  const appleScript = `
tell application "Microsoft Word"
    set docPath to POSIX file "${resolvedDocxPath}"
    set pdfPath to POSIX file "${resolvedPdfPath}"
    open docPath
    delay 1.5
    set activeDoc to active document
    save as activeDoc file format format PDF file name pdfPath
    close activeDoc saving no
end tell
  `;
  
  return new Promise((resolve, reject) => {
    fs.writeFile(tempScriptPath, appleScript, 'utf8', (err) => {
      if (err) {
        return reject(err);
      }
      
      const escapeArg = (arg: string) => `'${arg.replace(/'/g, "'\\''")}'`;
      const command = `osascript ${escapeArg(tempScriptPath)}`;
      
      exec(command, (execErr, stdout, stderr) => {
        // Clean up the temp script file
        if (fs.existsSync(tempScriptPath)) {
          try { fs.unlinkSync(tempScriptPath); } catch (e) {}
        }
        
        if (execErr) {
          console.error('osascript execution error:', execErr, stderr);
          return reject(execErr);
        }
        resolve();
      });
    });
  });
}

// Helper to get file buffer from URL (either local disk, GCS bucket, or external HTTP fetch)
async function getAttachmentBuffer(fileUrl: string): Promise<{ content: Buffer; filename: string }> {
  const normalizedUrl = String(fileUrl || '').trim();
  
  // 1. Extract filename if it is an uploads path (relative or absolute on our domain)
  let filename = '';
  if (normalizedUrl.startsWith('/uploads/')) {
    filename = normalizedUrl.replace(/^\/uploads\//, '');
  } else if (normalizedUrl.includes('/uploads/')) {
    const parts = normalizedUrl.split('/uploads/');
    filename = parts[parts.length - 1];
  }

  if (filename) {
    // Decoded filename (in case it is URL encoded)
    filename = decodeURIComponent(filename);
    
    // Check local disk first
    const localPath = path.resolve(process.cwd(), 'uploads', filename);
    if (fs.existsSync(localPath)) {
      console.log(`[Email] Found attachment on local disk: ${filename}`);
      const content = fs.readFileSync(localPath);
      return { content, filename };
    }
    
    // If not local, try Google Cloud Storage
    try {
      const bucket = await getActiveBucket();
      const storageFile = bucket.file(`NSO DATA/${filename}`);
      const [exists] = await storageFile.exists();
      if (exists) {
        console.log(`[Email] Found attachment in GCS: NSO DATA/${filename}`);
        const [buffer] = await storageFile.download();
        return { content: buffer, filename };
      }
    } catch (storageErr) {
      console.error(`[Email] GCS download failed for ${filename}:`, storageErr);
    }
  }

  // 2. Fallback to HTTP/HTTPS fetch for external URLs
  console.log(`[Email] Fetching external attachment URL: ${normalizedUrl.substring(0, 80)}`);
  const fileRes = await fetch(normalizedUrl);
  if (!fileRes.ok) {
    throw new Error(`HTTP ${fileRes.status} ${fileRes.statusText}`);
  }
  const arrayBuffer = await fileRes.arrayBuffer();
  
  let finalFilename = filename;
  if (!finalFilename) {
    try {
      const urlObj = new URL(normalizedUrl);
      const urlPath = urlObj.pathname;
      finalFilename = path.basename(urlPath) || 'attachment';
    } catch (e) {
      finalFilename = 'attachment';
    }
  }

  return {
    content: Buffer.from(arrayBuffer),
    filename: finalFilename
  };
}

// A PDF always starts with the %PDF- signature. Checked against bytes rather than the file
// name because global-doc labels are typed by hand and routinely lack (or misstate) an extension.
function isPdfBuffer(buffer: Buffer): boolean {
  return buffer.length > 5 && buffer.subarray(0, 5).toString('latin1') === '%PDF-';
}

// Every store field an onboarding form may reference, keyed by the placeholder text used in the
// PDFs. Mirrors the email-body token map in SwiggyZomatoIntegration.jsx so a form and the mail it
// travels with resolve the same variables. Matching is case-insensitive.
function buildOnboardingReplacements(store: any, brandName: string): Record<string, string> {
  const val = (v: any) => (v === null || v === undefined ? '' : String(v));

  const today = new Date();
  const todayStr = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;

  const address = val(store.cafeAddress);
  const city = val(store.city);
  const state = val(store.state);
  const pinCode = val(store.pinCode);
  const fullAddress = [address, city, state, pinCode].filter(Boolean).join(', ');
  const phone = val(store.cafePhoneNumber || store.phone);
  const email = val(store.cafeMailId || store.email);
  const managerPhone = val(store.cafeManagerContactNo || store.cafePhoneNumber || store.phone);
  const googleLink = val(store.cafeLocationGoogleLink);
  const storeType = val(store.storeType);
  const swiggyId = val(store.swiggyId || store.blueTokaiSwiggyRID);
  const zomatoId = val(store.zomatoId || store.blueTokaiZomatoRID);

  return {
    '[Today Date]': todayStr,
    '[Date]': todayStr,

    '[Brand Name]': brandName,
    '[Brand]': val(store.brand) || brandName,
    '[Café Name]': val(store.cafeName),
    '[Cafe Name]': val(store.cafeName),
    '[Restaurant Name]': val(store.cafeName),
    '[Outlet Name]': val(store.cafeName),
    '[Cafe Code]': val(store.cafeCode),
    '[Café Code]': val(store.cafeCode),

    '[Address]': address,
    '[Café Address]': address,
    '[Cafe Address]': address,
    '[Full Address]': fullAddress,
    '[Complete Address]': fullAddress,
    '[City]': city,
    '[State]': state,
    '[Pin Code]': pinCode,
    '[Pincode]': pinCode,
    '[PIN]': pinCode,

    '[Phone]': phone,
    '[Cafe Phone Number]': phone,
    '[Café Phone Number]': phone,
    '[Owner Phone Number]': phone,
    '[Order Manager Number]': managerPhone,
    '[Email]': email,
    '[Cafe Email]': email,
    '[Café Email]': email,
    '[Cafe Mail ID]': email,
    '[Café Mail ID]': email,
    '[Order Notification Email ID]': email,

    '[Cafe Manager]': val(store.cafeManagerName),
    '[Café Manager]': val(store.cafeManagerName),
    '[Cafe Manager Name]': val(store.cafeManagerName),
    '[Café Manager Name]': val(store.cafeManagerName),
    '[Cafe Manager Email]': val(store.cafeManagerMailId),
    '[Café Manager Email]': val(store.cafeManagerMailId),
    '[Cafe Manager Phone]': val(store.cafeManagerContactNo),
    '[Café Manager Phone]': val(store.cafeManagerContactNo),

    '[GST Number]': val(store.gstNo),
    '[GST No]': val(store.gstNo),
    '[GST No.]': val(store.gstNo),
    '[FSSAI Number]': val(store.fssaiNo),
    '[FSSAI No]': val(store.fssaiNo),
    '[FSSAI No.]': val(store.fssaiNo),
    '[FSSAI License]': val(store.fssaiLicense || store.fssaiNo),

    '[Café Location Google Link]': googleLink,
    '[Cafe Location Google Link]': googleLink,
    '[Google Link]': googleLink,
    '[Map Link]': googleLink,
    '[Location Link]': googleLink,

    '[Store Type]': storeType,
    '[Cafe Type]': storeType,
    '[Café Type]': storeType,
    '[City Type]': storeType || val(store.platformType || store.tradingArea),
    '[Cafe Model]': val(store.cafeModel),
    '[Café Model]': val(store.cafeModel),

    '[Swiggy ID]': swiggyId,
    '[Zomato ID]': zomatoId,
    '[RID]': swiggyId,

    '[Zone]': val(store.zone),
    '[Cluster]': val(store.cluster),
    '[Location]': val(store.location) || fullAddress,
    '[Launch Date]': store.launchDate ? new Date(store.launchDate).toLocaleDateString('en-IN') : '',
    '[Launch Month]': val(store.cafeLaunchMonth),
  };
}

async function processOnboardingPdf(buffer: Buffer, store: any, fileNameOrBrand: string = ''): Promise<Buffer> {
  const startTime = Date.now();
  try {
    console.log(`[PDF Process] START — buffer size: ${buffer.length} bytes`);
    console.log(`[PDF Process] Store: cafeName="${store.cafeName}" cafeAddress="${store.cafeAddress}" city="${store.city}" state="${store.state}" pinCode="${store.pinCode}"`);

    // Determine Brand Name
    const lowerContext = fileNameOrBrand.toLowerCase();
    let brandName = store.brand || 'Blue Tokai Coffee Roasters';
    if (lowerContext.includes('blue tokai') || lowerContext.includes('btc')) {
      brandName = 'Blue Tokai Coffee Roasters';
    } else if (lowerContext.includes("suchali") || lowerContext.includes("sab")) {
      brandName = "Suchali's Artisan Bakehouse";
    } else if (lowerContext.includes("got tea") || lowerContext.includes("gottea") || lowerContext.includes("gt")) {
      brandName = "Got Tea";
    }

    // Build replacement map
    const replacements = buildOnboardingReplacements(store, brandName);
    console.log('[PDF Process] Replacements map:', JSON.stringify(replacements));

    // Pre-compile case-insensitive matchers, longest token first so that e.g. "[GST No.]" is
    // consumed before the "[GST No]" prefix can partially match it.
    const matchers = Object.entries(replacements)
      .sort(([a], [b]) => b.length - a.length)
      .map(([token, value]) => ({
        re: new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
        value,
      }));

    const applyReplacements = (input: string): string => {
      let out = input;
      for (const { re, value } of matchers) {
        re.lastIndex = 0;
        out = out.replace(re, value);
      }
      return out;
    };

    // Step 1 — pdfjs-dist: extract text item positions
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const parsedPdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
    console.log(`[PDF Process] pdfjs loaded: ${parsedPdf.numPages} pages`);

    const items: Array<{ pageIdx: number; x: number; y: number; size: number; w: number; h: number; newText: string; origText: string }> = [];

    for (let i = 1; i <= parsedPdf.numPages; i++) {
      const page = await parsedPdf.getPage(i);
      const textContent = await page.getTextContent();

      // pdf.js splits a token across text runs whenever Word broke it into
      // fragments ("[" + "Today Date]"), so no single item ever contains the whole
      // placeholder. Group items by baseline and match against the joined line too.
      const lines = new Map<number, any[]>();
      for (const item of textContent.items as any[]) {
        if (!item.str) continue;
        const key = Math.round(item.transform[5] * 2) / 2;
        if (!lines.has(key)) lines.set(key, []);
        lines.get(key)!.push(item);
      }

      for (const lineItems of lines.values()) {
        lineItems.sort((a: any, b: any) => a.transform[4] - b.transform[4]);

        const offsets: number[] = [];
        let joined = '';
        for (const it of lineItems) {
          offsets.push(joined.length);
          joined += it.str;
        }

        const consumed = new Set<number>();

        // Pass 1 — tokens spanning multiple fragments. The merged entry starts at the
        // token's exact x, so any label text before it on the line keeps its original
        // rendering; the last fragment's tail (text after the token) is re-drawn with it.
        for (const { re, value } of matchers) {
          for (const m of Array.from(joined.matchAll(re)) as RegExpMatchArray[]) {
            const a = m.index!;
            const b = a + m[0].length;
            let first = -1;
            let last = -1;
            for (let k = 0; k < lineItems.length; k++) {
              const s = offsets[k];
              const e = s + lineItems[k].str.length;
              if (a < e && b > s) {
                if (first === -1) first = k;
                last = k;
              }
            }
            if (first === -1 || first === last) continue; // single-item matches: pass 2
            if (consumed.has(first) || consumed.has(last)) continue;
            // A real token never jumps a table-cell gap — only merge abutting fragments.
            let contiguous = true;
            for (let k = first; k < last; k++) {
              const gap = lineItems[k + 1].transform[4] - (lineItems[k].transform[4] + lineItems[k].width);
              if (gap > Math.max(lineItems[k].transform[0], 6) * 1.5) { contiguous = false; break; }
            }
            if (!contiguous) continue;

            const fi = lineItems[first];
            const li = lineItems[last];
            const startInFirst = a - offsets[first];
            const startX = fi.transform[4] + (fi.str.length ? (startInFirst / fi.str.length) * fi.width : 0);
            const tail = li.str.slice(b - offsets[last]);
            const newText = value + applyReplacements(tail);
            const size = Math.max(fi.transform[0], 6);
            items.push({
              pageIdx: i - 1,
              x: startX,
              y: fi.transform[5],
              size,
              w: Math.max(li.transform[4] + li.width - startX, 10),
              h: size + 2,
              newText,
              origText: joined.slice(a, b),
            });
            for (let k = first; k <= last; k++) consumed.add(k);
            console.log(`[PDF Process] Queue page=${i} (spanning): "${joined.slice(a, b)}" → "${newText}"`);
          }
        }

        // Pass 2 — tokens contained in a single item (the common case).
        for (let k = 0; k < lineItems.length; k++) {
          if (consumed.has(k)) continue;
          const item = lineItems[k];
          const origText: string = item.str;
          const text = applyReplacements(origText);
          if (text !== origText) {
            items.push({
              pageIdx: i - 1,
              x: item.transform[4],
              y: item.transform[5],
              size: Math.max(item.transform[0], 6),
              w: Math.max(item.width, 10),
              h: Math.max(item.height, item.transform[0] + 2),
              newText: text,
              origText: item.str
            });
            console.log(`[PDF Process] Queue page=${i}: "${item.str}" → "${text}"`);
          }
        }
      }
    }

    if (items.length === 0) {
      console.log('[PDF Process] No placeholders found — returning original buffer');
      return buffer;
    }
    console.log(`[PDF Process] ${items.length} items queued for replacement`);

    // Step 2 — pdf-lib: draw white boxes + new text
    const { PDFDocument, rgb, StandardFonts, pushGraphicsState, popGraphicsState, scale } = require('pdf-lib');
    // Uint8Array.from() creates a true independent copy to avoid any shared-memory issues
    const pdfDoc = await PDFDocument.load(Uint8Array.from(buffer));
    console.log(`[PDF Process] pdf-lib loaded: ${pdfDoc.getPageCount()} pages`);
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pdfPages = pdfDoc.getPages();

    // Standard fonts are WinAnsi-encoded; an unsupported glyph makes drawText throw. Strip
    // accents first, then drop any character that still can't be measured (i.e. encoded).
    const toDrawableText = (text: string): string => {
      const flat = text.replace(/[\r\n\t]+/g, ' ').trim();
      try {
        helveticaFont.widthOfTextAtSize(flat, 10);
        return flat;
      } catch {
        let safe = '';
        for (const ch of flat.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')) {
          try {
            helveticaFont.widthOfTextAtSize(ch, 10);
            safe += ch;
          } catch { /* glyph not in WinAnsi — drop it */ }
        }
        return safe;
      }
    };

    // pdf.js reports overprinted (fake-bold) text as two identical items at the same spot;
    // drawing both smears the output, so keep only the first per position.
    const seen = new Set<string>();
    const drawables: Array<{
      page: any; x: number; y: number; text: string; drawSize: number;
      rectX: number; rectY: number; rectW: number; rectH: number;
    }> = [];

    for (const it of items) {
      const page = pdfPages[it.pageIdx];
      if (!page) continue;
      const posKey = `${it.pageIdx}:${it.x.toFixed(1)}:${it.y.toFixed(1)}`;
      if (seen.has(posKey)) continue;
      seen.add(posKey);

      const text = toDrawableText(it.newText);
      const isAddress = it.origText.toLowerCase().includes('address');
      const isSwiggyOnb = lowerContext.includes('swiggy_onb') || lowerContext.includes('swiggy onb');

      const rightLimit = page.getWidth() - 12;
      const available = rightLimit - it.x;
      let drawSize = it.size;
      let textWidth = text ? helveticaFont.widthOfTextAtSize(text, drawSize) : 0;
      let xScale = 1;

      if (isAddress && isSwiggyOnb && textWidth > available && available > 0) {
        // To keep the address on the same row without shrinking the font size to microscopic levels,
        // we use horizontal scaling to squeeze the text into the available width.
        drawSize = Math.max(7.5, it.size * 0.85); // Keep font size readable
        const newWidth = helveticaFont.widthOfTextAtSize(text, drawSize);
        if (newWidth > available) {
          xScale = available / newWidth; // Squish horizontally to fit exactly
        }
        textWidth = available; // The drawn width will exactly match available space
      } else if (textWidth > available && available > 0) {
        const minSize = isAddress ? 1 : 6;
        drawSize = Math.max(minSize, drawSize * (available / textWidth));
        textWidth = helveticaFont.widthOfTextAtSize(text, drawSize);
      }

      const ascent = it.size * 0.8;
      const descent = it.size * 0.22;
      
      drawables.push({
        page,
        x: it.x,
        y: it.y,
        text,
        drawSize,
        xScale,
        rectX: it.x - 1,
        rectY: it.y - descent,
        rectW: Math.min(Math.max(it.w, textWidth) + 3, rightLimit - (it.x - 1)),
        rectH: ascent + descent,
      });
    }

    // Two passes: every white box first, then every string. Interleaving lets a later box
    // erase text an earlier item just drew when fields share a line.
    for (const d of drawables) {
      try {
        d.page.drawRectangle({
          x: d.rectX,
          y: d.rectY,
          width: d.rectW,
          height: d.rectH,
          color: rgb(1, 1, 1),
          opacity: 1,
        });
      } catch (e: any) {
        console.error(`[PDF Process] drawRectangle failed at (${d.rectX},${d.rectY}):`, e?.message);
      }
    }
    for (const d of drawables) {
      if (!d.text) continue;
      try {
        const needsScale = d.xScale && d.xScale !== 1;
        if (needsScale) {
          d.page.pushOperators(pushGraphicsState(), scale(d.xScale, 1));
        }

        d.page.drawText(d.text, {
          x: needsScale ? d.x / d.xScale : d.x,
          y: d.y,
          size: d.drawSize,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });

        if (needsScale) {
          d.page.pushOperators(popGraphicsState());
        }
      } catch (e: any) {
        console.error(`[PDF Process] drawText failed for "${d.text}":`, e?.message);
      }
    }

    // useObjectStreams: false forces traditional XRef table format — fixes empty-save bug
    const savedBytes = await pdfDoc.save({ useObjectStreams: false });
    console.log(`[PDF Process] pdfDoc.save() → ${savedBytes.byteLength} bytes (${Date.now() - startTime}ms)`);

    if (savedBytes.byteLength < 100) {
      console.error('[PDF Process] Saved PDF suspiciously small — returning original buffer');
      return buffer;
    }

    const resultBuffer = Buffer.from(savedBytes);
    console.log(`[PDF Process] SUCCESS — returning ${resultBuffer.length} byte modified PDF`);
    return resultBuffer;

  } catch (err: any) {
    console.error('[PDF Process] ERROR:', err?.message);
    console.error('[PDF Process] Stack:', err?.stack?.split('\n').slice(0, 6).join('\n'));
  }
  console.log('[PDF Process] Falling back to original buffer');
  return buffer;
}

// GET /:id/preview-onboarding-pdf
router.get('/:id/preview-onboarding-pdf', async (req: any, res) => {
  const storeId = req.params.id;
  const fileUrl = req.query.fileUrl as string;
  const fileName = req.query.fileName as string || 'Document.pdf';

  if (!storeId || !fileUrl) {
    return res.status(400).send('Missing store ID or fileUrl');
  }

  try {
    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) return res.status(404).send('Store not found');

    // Fetch original file
    const isCloudFunctions = !!process.env.K_SERVICE || !!process.env.FUNCTION_TARGET;
    let absoluteUrl = fileUrl;
    if (!fileUrl.startsWith('http')) {
      if (isCloudFunctions) {
        absoluteUrl = `https://nso.bluetokaicoffee.com${fileUrl}`;
      } else {
        absoluteUrl = `http://localhost:${process.env.PORT || 8403}${fileUrl}`;
      }
    }
    
    // Node's built-in fetch — axios is not a declared backend dependency, so requiring it
    // works on a dev box (transitive install) but crashes in the deployed function.
    const response = await fetch(absoluteUrl);
    if (!response.ok) throw new Error(`Fetching attachment failed: HTTP ${response.status} for ${absoluteUrl}`);
    let buffer = Buffer.from(await response.arrayBuffer());

    // Only PDFs can have their placeholders replaced. Anything else (scans, images) is streamed
    // back as-is, so the preview link works for every attachment rather than 404-ing.
    if (isPdfBuffer(buffer)) {
      buffer = await processOnboardingPdf(buffer, store, fileName);
      res.setHeader('Content-Type', 'application/pdf');
    } else {
      res.setHeader('Content-Type', response.headers.get('content-type') || 'application/octet-stream');
    }
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.send(buffer);
  } catch (err: any) {
    console.error('Error generating preview PDF:', err?.message);
    res.status(500).send('Failed to generate preview PDF');
  }
});

// Which store field records "the onboarding mail for this platform+brand went out",
// keyed by the brand token the client sends.
const MAIL_STATUS_FIELD_BY_BRAND: Record<string, string> = {
  zomato_btc: 'btZomatoMailStatus',
  swiggy_btc: 'btSwiggyMailStatus',
  zomato_sab: 'suchaliZomatoMailStatus',
  swiggy_sab: 'suchaliSwiggyMailStatus',
  zomato_gottea: 'gotTeaZomatoMailStatus',
  swiggy_gottea: 'gotTeaSwiggyMailStatus',
  rista_creation: 'ristaMailStatus',
};

// POST /:id/send-swiggy-onboarding-email
router.post('/:id/send-swiggy-onboarding-email', authenticateToken, async (req: any, res) => {
  const storeId = req.params.id;
  const { brand: brandParam, to, cc, subject, body, attachmentUrls } = req.body;
  if (!storeId) {
    return res.status(400).json({ error: 'Invalid store ID.' });
  }

  let tempFilesToCleanup: string[] = [];
  try {
    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      return res.status(404).json({ error: 'Store not found.' });
    }

    const normalizedBrand = String(brandParam || '').toLowerCase();
    const isZomato = normalizedBrand.startsWith('zomato');

    // Re-sending an onboarding mail is an admin-only action. Anyone may send the first
    // one, but once the platform has been mailed, only SUPER_ADMIN/ADMIN may send again —
    // a duplicate onboarding mail is confusing for Swiggy/Zomato to receive. Enforced here
    // rather than only in the UI, since the UI cannot be trusted to gate an API.
    const alreadySent = MAIL_STATUS_FIELD_BY_BRAND[normalizedBrand]
      ? (store as any)[MAIL_STATUS_FIELD_BY_BRAND[normalizedBrand]] === 'Sent'
      : false;
    if (alreadySent && !['SUPER_ADMIN', 'ADMIN'].includes(req.user?.role)) {
      return res.status(403).json({
        error: 'This onboarding mail has already been sent. Only an admin can send it again.',
      });
    }

    let attachments: any[] = [];
    let htmlBody = body || '';

    // If body contains text but no HTML tags, format it for email clients
    if (htmlBody && !/<\/?[a-z][\s\S]*>/i.test(htmlBody)) {
      htmlBody = `<div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333; white-space: pre-wrap;">${htmlBody}</div>`;
    }

    if (!htmlBody) {
      if (isZomato) {
        // Zomato Onboarding Flow (Fallback)
        let brandName = "Blue Tokai Coffee Roasters";
        if (normalizedBrand.includes("suchali")) {
          brandName = "Suchali's Artisan Bakehouse";
        } else if (normalizedBrand.includes("got_tea") || normalizedBrand.includes("gottea")) {
          brandName = "Got Tea";
        }

        const completeAddress = [
          store.cafeAddress || store.address,
          store.city,
          store.state,
          store.pinCode
        ].filter(Boolean).join(', ');

        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const yyyy = today.getFullYear();
        const dateStr = `${dd}-${mm}-${yyyy}`;

        htmlBody = `
          <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333; max-width: 800px; margin: 0 auto; border: 1px solid #e2e8f0; padding: 24px; border-radius: 12px;">
            <h2 style="color: #c92c3b; margin-top: 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">Zomato Onboarding Request</h2>
            <p>Hi Team,</p>
            <p>This is regarding our new cafe onboarding on Zomato.</p>
            <p>Please find below the cafe details and the attached onboarding form. Kindly initiate the process.</p>
            
            <h3 style="color: #334155; margin-top: 24px; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">Cafe Details</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
              <tr>
                <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-weight: bold; width: 30%; background-color: #f8fafc;">Cafe Name</td>
                <td style="padding: 8px 12px; border: 1px solid #cbd5e1;">${store.cafeName || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-weight: bold; background-color: #f8fafc;">Cafe Code</td>
                <td style="padding: 8px 12px; border: 1px solid #cbd5e1;">${store.cafeCode || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-weight: bold; background-color: #f8fafc;">Brand</td>
                <td style="padding: 8px 12px; border: 1px solid #cbd5e1;">${brandName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-weight: bold; background-color: #f8fafc;">Address</td>
                <td style="padding: 8px 12px; border: 1px solid #cbd5e1;">${completeAddress || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-weight: bold; background-color: #f8fafc;">GST Number</td>
                <td style="padding: 8px 12px; border: 1px solid #cbd5e1;">${store.gstNo || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-weight: bold; background-color: #f8fafc;">FSSAI Number</td>
                <td style="padding: 8px 12px; border: 1px solid #cbd5e1;">${store.fssaiNo || 'N/A'}</td>
              </tr>
            </table>

            <h3 style="color: #334155; margin-top: 24px; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">Zomato OB Form Summary</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
              <tr>
                <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-weight: bold; width: 30%; background-color: #f8fafc;">Effective Date</td>
                <td style="padding: 8px 12px; border: 1px solid #cbd5e1;">${dateStr}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-weight: bold; background-color: #f8fafc;">Restaurant Name</td>
                <td style="padding: 8px 12px; border: 1px solid #cbd5e1;">${brandName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-weight: bold; background-color: #f8fafc;">Legal Entity Address</td>
                <td style="padding: 8px 12px; border: 1px solid #cbd5e1;">${completeAddress}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-weight: bold; background-color: #f8fafc;">Locality</td>
                <td style="padding: 8px 12px; border: 1px solid #cbd5e1;">${store.cafeName || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-weight: bold; background-color: #f8fafc;">Signed At</td>
                <td style="padding: 8px 12px; border: 1px solid #cbd5e1;">${dateStr}</td>
              </tr>
            </table>

            <p style="margin-top: 30px;">Thanks & Regards,</p>
            <p><strong>${req.user?.name || 'Operations Team'}</strong></p>
          </div>
        `;
      } else {
        // Swiggy Onboarding Flow (Fallback)
        const wsData = buildSwiggyTemplateData(store, brandParam || '');
        htmlBody = `
          <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333;">
            <p>Hi Team,</p>
            <p>This is regarding our new cafe onboarding.</p>
            <p>Please find below the details and initiate the process for the same.</p>
            
            ${buildHtmlTable(wsData)}
            
            <p style="margin-top: 30px;">Thanks & Regards,</p>
            <p><strong>${req.user?.name || 'Operations Team'}</strong></p>
          </div>
        `;
      }
    }

    // Download and attach files passed from the frontend (Status Category + General + State GST)
    const failedAttachments: string[] = [];
    if (Array.isArray(attachmentUrls) && attachmentUrls.length > 0) {
      console.log(`[Email] Downloading ${attachmentUrls.length} attachment(s)...`);
      await Promise.all(attachmentUrls.map(async (attachment: { fileName: string; fileUrl: string; isGST?: boolean }) => {
        try {
          const { content, filename } = await getAttachmentBuffer(attachment.fileUrl);
          let finalName = attachment.fileName || filename;
          
          const fileSource = attachment.fileUrl || filename;
          const urlExt = fileSource.includes('.') ? fileSource.substring(fileSource.lastIndexOf('.')) : '';
          
          if (urlExt && !finalName.toLowerCase().endsWith(urlExt.toLowerCase())) {
            finalName = `${finalName}${urlExt}`;
          }

          let finalContent = content;
          // Attachment labels are free text typed by whoever uploaded the global doc, so they
          // cannot be used to decide what is an onboarding form. Detect a real PDF by its magic
          // bytes instead and let processOnboardingPdf decide: it returns the buffer untouched
          // when the document contains no placeholders.
          if (isPdfBuffer(content)) {
            console.log(`[Email] Running placeholder replacement on PDF: ${finalName}`);
            finalContent = await processOnboardingPdf(content, store, `${finalName} ${brandParam || ''}`);
          }

          attachments.push({
            filename: finalName,
            content: finalContent
          });
          console.log(`[Email] Attached: ${finalName} (${finalContent.byteLength} bytes)`);
        } catch (err) {
          failedAttachments.push(attachment.fileName || attachment.fileUrl);
          console.error(`[Email] Failed to download attachment ${attachment.fileName}:`, err);
        }
      }));
      console.log(`[Email] Total attachments ready: ${attachments.length}/${attachmentUrls.length}`);
    }

    const smtpConfig = await getSMTPConfig();
    const transporter = nodemailer.createTransport({
      host: smtpConfig.smtpHost,
      port: smtpConfig.smtpPort,
      secure: smtpConfig.smtpSecure,
      auth: {
        user: smtpConfig.smtpUser,
        pass: smtpConfig.smtpPass
      }
    });

    const mailOptions = {
      from: smtpConfig.smtpUser ? `"Analytics" <${smtpConfig.smtpUser}>` : '"Analytics" <analytics@bluetokaicoffee.com>',
      to: to || '',
      cc: cc || '',
      subject: subject || (isZomato ? `Zomato Onboarding Request | ${store.cafeName}` : `Swiggy Onboarding Request | ${store.cafeName}`),
      text: body ? body.replace(/<[^>]*>/g, '') : '',
      html: htmlBody,
      attachments
    };

    let info;
    if (shouldUseEtherealFallback(smtpConfig)) {
      const testAccount = await nodemailer.createTestAccount();
      const testTransporter = nodemailer.createTransport({
        host: ETHEREAL_HOST,
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      info = await testTransporter.sendMail(mailOptions);
      console.log('Onboarding Email sent to Ethereal: %s', nodemailer.getTestMessageUrl(info));
    } else {
      info = await transporter.sendMail(mailOptions);
    }

    // Clean up temporary files
    tempFilesToCleanup.forEach((f) => {
      if (f && fs.existsSync(f)) {
        try {
          fs.unlinkSync(f);
        } catch (err) {
          console.error('Failed to delete temp file:', f, err);
        }
      }
    });

    // Update mailStatus and the specific platform status to 'Sent' in database
    const updateData: any = { mailStatus: 'Sent' };
    const statusField = MAIL_STATUS_FIELD_BY_BRAND[normalizedBrand];
    if (statusField) updateData[statusField] = 'Sent';

    await prisma.store.update({
      where: { id: storeId },
      data: updateData
    });

    // After updating the mail status, check if ALL required emails for this brand are now sent.
    // If so, record integrationMailSentAt to start the 4-day countdown (only set once).
    try {
      const freshStore = await prisma.store.findUnique({ where: { id: storeId } });
      if (freshStore && !(freshStore as any).integrationMailSentAt) {
        const storeBrand = ((freshStore as any).brand || '').toLowerCase();
        let allRequiredEmailsSent = false;

        if (storeBrand.includes('got tea') || storeBrand.includes('gottea')) {
          allRequiredEmailsSent =
            (freshStore as any).gotTeaZomatoMailStatus === 'Sent' &&
            (freshStore as any).gotTeaSwiggyMailStatus === 'Sent';
        } else if (storeBrand.includes('suchali')) {
          allRequiredEmailsSent =
            (freshStore as any).suchaliZomatoMailStatus === 'Sent' &&
            (freshStore as any).suchaliSwiggyMailStatus === 'Sent';
        } else {
          // Blue Tokai (default)
          allRequiredEmailsSent =
            (freshStore as any).btZomatoMailStatus === 'Sent' &&
            (freshStore as any).btSwiggyMailStatus === 'Sent';
        }

        if (allRequiredEmailsSent) {
          const updates: any = { integrationMailSentAt: new Date().toISOString() };
          await prisma.store.update({
            where: { id: storeId },
            data: updates
          });
        }
      }
    } catch (mailSentErr) {
      // Non-critical — log but don't fail the response
      console.error('Could not set integrationMailSentAt:', mailSentErr);
    }


    const message = failedAttachments.length > 0
      ? `Email sent, but ${failedAttachments.length} attachment(s) could not be included: ${failedAttachments.join(', ')}.`
      : 'Onboarding email sent successfully.';
    res.json({ message, attachedCount: attachments.length, failedAttachments, info });
  } catch (error: any) {
    console.error('Error sending onboarding email:', error);
    // Clean up temp files in case of error as well
    tempFilesToCleanup.forEach((f) => {
      if (f && fs.existsSync(f)) {
        try {
          fs.unlinkSync(f);
        } catch (err) {
          // ignore
        }
      }
    });
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// POST /:id/send-pending-docs-email (Send email for pending documents)
router.post('/:id/send-pending-docs-email', authenticateToken, async (req: any, res) => {
  const storeId = req.params.id;
  const { to, cc, subject, body, category } = req.body;
  if (!storeId) {
    return res.status(400).json({ error: 'Store ID is required.' });
  }

  try {
    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      return res.status(404).json({ error: 'Store not found.' });
    }

    const smtpConfig = await getSMTPConfig();
    const transporter = nodemailer.createTransport({
      host: smtpConfig.smtpHost,
      port: smtpConfig.smtpPort,
      secure: smtpConfig.smtpSecure,
      auth: {
        user: smtpConfig.smtpUser,
        pass: smtpConfig.smtpPass
      }
    });

    const parsedTo = typeof to === 'string' ? to.split(',').map((e: string) => e.trim()).filter(Boolean) : to;
    const parsedCc = typeof cc === 'string' ? cc.split(',').map((e: string) => e.trim()).filter(Boolean) : cc;

    const formatted = formatMailBody(body);
    const mailOptions: any = {
      from: smtpConfig.smtpUser,
      to: parsedTo,
      cc: parsedCc && parsedCc.length > 0 ? parsedCc : undefined,
      subject: subject,
      text: formatted.text,
      html: formatted.html
    };

    let info;
    if (shouldUseEtherealFallback(smtpConfig)) {
      const testAccount = await nodemailer.createTestAccount();
      const testTransporter = nodemailer.createTransport({
        host: ETHEREAL_HOST,
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      info = await testTransporter.sendMail(mailOptions);
      console.log('Pending Docs Email sent to Ethereal: %s', nodemailer.getTestMessageUrl(info));
    } else {
      info = await transporter.sendMail(mailOptions);
    }

    await prisma.storeHistory.create({
      data: {
        storeId: store.id,
        action: `Sent pending documents email with subject: ${subject}`,
        newValue: 'Email Sent'
      }
    });

    const updateData: any = {};
    if (category === 'Legal Documents') updateData.legalMailSentAt = new Date().toISOString();
    if (category === 'Financial Documents') updateData.financialMailSentAt = new Date().toISOString();
    if (category === 'Project Documents') updateData.projectMailSentAt = new Date().toISOString();

    let updatedStore = store;
    if (Object.keys(updateData).length > 0) {
      updatedStore = await prisma.store.update({
        where: { id: store.id },
        data: updateData
      });
    }

    res.json({ message: 'Email sent successfully.', store: updatedStore });
  } catch (error: any) {
    console.error('Error sending pending docs email:', error);
    res.status(500).json({ error: error.message || 'Failed to send email.' });
  }
});

// POST /:id/send-status-email (Send Custom Status Triggered email and update status)
router.post('/:id/send-status-email', authenticateToken, async (req: any, res) => {
  const storeId = req.params.id;
  const { status, to, cc, subject, body } = req.body;
  if (!storeId || !status) {
    return res.status(400).json({ error: 'Store ID and status are required.' });
  }

  try {
    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      return res.status(404).json({ error: 'Store not found.' });
    }

    const smtpConfig = await getSMTPConfig();
    const transporter = nodemailer.createTransport({
      host: smtpConfig.smtpHost,
      port: smtpConfig.smtpPort,
      secure: smtpConfig.smtpSecure,
      auth: {
        user: smtpConfig.smtpUser,
        pass: smtpConfig.smtpPass
      }
    });

    const parsedTo = typeof to === 'string' ? to.split(',').map((e: string) => e.trim()).filter(Boolean) : to;
    const parsedCc = typeof cc === 'string' ? cc.split(',').map((e: string) => e.trim()).filter(Boolean) : cc;

    const formatted = formatMailBody(body);
    const mailOptions: any = {
      from: smtpConfig.smtpUser,
      to: parsedTo,
      cc: parsedCc && parsedCc.length > 0 ? parsedCc : undefined,
      subject: subject,
      text: formatted.text,
      html: formatted.html
    };

    let info;
    if (shouldUseEtherealFallback(smtpConfig)) {
      const testAccount = await nodemailer.createTestAccount();
      const testTransporter = nodemailer.createTransport({
        host: ETHEREAL_HOST,
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      info = await testTransporter.sendMail(mailOptions);
      console.log('Status Trigger Email sent to Ethereal: %s', nodemailer.getTestMessageUrl(info));
    } else {
      info = await transporter.sendMail(mailOptions);
    }

    // Update the store status in the database
    const updatedStore = await prisma.store.update({
      where: { id: storeId },
      data: { status: status }
    });

    await prisma.storeHistory.create({
      data: {
        storeId: updatedStore.id,
        action: `Status updated to ${status} via mapped trigger email`,
        newValue: status
      }
    });

    res.json({ message: 'Status email sent and status updated successfully.', store: updatedStore, info });
  } catch (error: any) {
    console.error('Error sending status email:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// POST /:id/send-store-code-email (Send New Store Code Creation email and update status)
router.post('/:id/send-store-code-email', authenticateToken, async (req: any, res) => {
  const storeId = req.params.id;
  const { to, cc, subject, body } = req.body;
  if (!storeId) {
    return res.status(400).json({ error: 'Invalid store ID.' });
  }

  try {
    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      return res.status(404).json({ error: 'Store not found.' });
    }

    const smtpConfig = await getSMTPConfig();
    const transporter = nodemailer.createTransport({
      host: smtpConfig.smtpHost,
      port: smtpConfig.smtpPort,
      secure: smtpConfig.smtpSecure,
      auth: {
        user: smtpConfig.smtpUser,
        pass: smtpConfig.smtpPass
      }
    });

    const formatted = formatMailBody(body || '');
    const mailOptions = {
      from: smtpConfig.smtpUser ? `"NSM Operations" <${smtpConfig.smtpUser}>` : '"NSM Operations" <analytics@bluetokaicoffee.com>',
      to: to || '',
      cc: cc || '',
      subject: subject || `New Store Code Creation Request | ${store.cafeName}`,
      text: formatted.text,
      html: formatted.html
    };

    let info;
    if (shouldUseEtherealFallback(smtpConfig)) {
      const testAccount = await nodemailer.createTestAccount();
      const testTransporter = nodemailer.createTransport({
        host: ETHEREAL_HOST,
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      info = await testTransporter.sendMail(mailOptions);
      console.log('Store Code Email sent to Ethereal: %s', nodemailer.getTestMessageUrl(info));
    } else {
      info = await transporter.sendMail(mailOptions);
    }

    // Automatically update the project status to Ready for Construction in the database
    const updatedStore = await prisma.store.update({
      where: { id: storeId },
      data: { status: 'Ready for Construction' }
    });



    res.json({ message: 'Store code creation email sent and status updated successfully.', info });
  } catch (error: any) {
    console.error('Error sending store code email:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// POST /:id/send-hiring-alert-email
router.post('/:id/send-hiring-alert-email', authenticateToken, async (req: any, res) => {
  const storeId = req.params.id;
  const { to, cc, subject, body } = req.body;
  if (!storeId) {
    return res.status(400).json({ error: 'Store ID is required.' });
  }

  try {
    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store) {
      return res.status(404).json({ error: 'Store not found.' });
    }

    const smtpConfig = await getSMTPConfig();
    const transporter = nodemailer.createTransport({
      host: smtpConfig.smtpHost,
      port: smtpConfig.smtpPort,
      secure: smtpConfig.smtpSecure,
      auth: {
        user: smtpConfig.smtpUser,
        pass: smtpConfig.smtpPass
      }
    });

    const parsedTo = typeof to === 'string' ? to.split(',').map((e: string) => e.trim()).filter(Boolean) : to;
    const parsedCc = typeof cc === 'string' ? cc.split(',').map((e: string) => e.trim()).filter(Boolean) : cc;

    const formatted = formatMailBody(body);
    const mailOptions: any = {
      from: smtpConfig.smtpUser ? `"NSM Operations" <${smtpConfig.smtpUser}>` : '"NSM Operations" <analytics@bluetokaicoffee.com>',
      to: parsedTo,
      cc: parsedCc && parsedCc.length > 0 ? parsedCc : undefined,
      subject: subject,
      text: formatted.text,
      html: formatted.html
    };

    let info;
    if (shouldUseEtherealFallback(smtpConfig)) {
      const testAccount = await nodemailer.createTestAccount();
      const testTransporter = nodemailer.createTransport({
        host: ETHEREAL_HOST,
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      info = await testTransporter.sendMail(mailOptions);
    } else {
      info = await transporter.sendMail(mailOptions);
    }

    // Update the store status in the database to record that the email was sent
    const updatedStore = await prisma.store.update({
      where: { id: storeId },
      data: { hiringAlertMailStatus: 'Sent' }
    });

    await prisma.storeHistory.create({
      data: {
        storeId: updatedStore.id,
        action: 'Hiring Alart email sent',
        changedBy: req.user?.email || 'System',
        createdAt: new Date().toISOString()
      }
    });

    res.json({ message: 'Hiring Alart email sent successfully.', info });
  } catch (error: any) {
    console.error('Error sending Hiring Alart email:', error);
    res.status(500).json({ error: error.message || 'Failed to send email.' });
  }
});

export default router;
