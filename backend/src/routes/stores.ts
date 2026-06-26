// @ts-nocheck

import { Router } from 'express';
import { PrismaClient } from '../lib/prisma-mock';
import { authenticateToken, authorizeRoles } from './auth';
import multer from 'multer';
import csvParser from 'csv-parser';
import { createObjectCsvStringifier } from 'csv-writer';
import { Readable } from 'stream';
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import { getSMTPConfig } from '../utils/smtp';
import { getEmailRecipients } from '../utils/emailRecipients';
import { getThreadMessageId, saveThreadMessageId } from '../utils/emailThreads';
import * as XLSX from 'xlsx';
import { exec } from 'child_process';
import { hasRedshiftStoreConfig, syncStoresFromRedshift } from '../utils/redshiftStores';


const upload = multer({ storage: multer.memoryStorage() });

const STORE_CSV_HEADERS = [
  { id: 'cafeName', title: 'cafeName' },
  { id: 'cafeCode', title: 'cafeCode' },
  { id: 'cafeModel', title: 'cafeModel' },
  { id: 'cafeAddress', title: 'cafeAddress' },
  { id: 'city', title: 'city' },
  { id: 'state', title: 'state' },
  { id: 'pinCode', title: 'pinCode' },
  { id: 'zone', title: 'zone' },
  { id: 'cafeLocationGoogleLink', title: 'cafeLocationGoogleLink' },
  { id: 'latitude', title: 'latitude' },
  { id: 'latt', title: 'latt' },
  { id: 'long', title: 'long' },
  { id: 'cafeOpenTiming', title: 'cafeOpenTiming' },
  { id: 'cafeClosingTime', title: 'cafeClosingTime' },
  { id: 'actualClosingTime', title: 'actualClosingTime' },
  { id: 'gstNo', title: 'gstNo' },
  { id: 'fssaiNo', title: 'fssaiNo' },
  { id: 'cityHeadEmail', title: 'cityHeadEmail' },
  { id: 'cityHeadPhone', title: 'cityHeadPhone' },
  { id: 'platformType', title: 'platformType' },
  { id: 'tradingArea', title: 'tradingArea' },
  { id: 'launchStatus', title: 'launchStatus' },
  { id: 'launchDate', title: 'launchDate' },
  { id: 'fssaiLicense', title: 'fssaiLicense' },
  { id: 'gstCertificateLink', title: 'gstCertificateLink' },
  { id: 'cafePhoneNumber', title: 'cafePhoneNumber' },
  { id: 'cafeMailId', title: 'cafeMailId' },
  { id: 'cafeManagerName', title: 'cafeManagerName' },
  { id: 'cafeManagerMailId', title: 'cafeManagerMailId' },
  { id: 'cafeManagerContactNo', title: 'cafeManagerContactNo' },
  { id: 'areaManagerName', title: 'areaManagerName' },
  { id: 'areaManagerEmail', title: 'areaManagerEmail' },
  { id: 'areaManagerPhone', title: 'areaManagerPhone' },
  { id: 'cityHeadName', title: 'cityHeadName' },
  { id: 'blueTokaiSwiggyRID', title: 'blueTokaiSwiggyRID' },
  { id: 'blueTokaiZomatoRID', title: 'blueTokaiZomatoRID' },
  { id: 'suchaliSwiggyRID', title: 'suchaliSwiggyRID' },
  { id: 'suchaliZomatoRID', title: 'suchaliZomatoRID' },
  { id: 'gotTeaSwiggyRID', title: 'gotTeaSwiggyRID' },
  { id: 'gotTeaZomatoRID', title: 'gotTeaZomatoRID' },
  { id: 'newPricingCategory', title: 'newPricingCategory' },
  { id: 'newPricingSubCategory', title: 'newPricingSubCategory' },
  { id: 'cluster', title: 'cluster' },
  { id: 'cafeLaunchMonth', title: 'cafeLaunchMonth' },
  { id: 'cafeOpeningHr', title: 'cafeOpeningHr' },
  { id: 'smokingZone', title: 'smokingZone' },
  { id: 'parkingOption', title: 'parkingOption' },
  { id: 'wheelchairAccessibility', title: 'wheelchairAccessibility' },
  { id: 'menu', title: 'menu' },
];

const MANDATORY_FIELDS = [
  'cafeName', 'cafeCode', 'cafeModel', 'cafeAddress', 'city', 'state', 'pinCode', 'zone', 
  'cafeLocationGoogleLink', 'latitude', 'latt', 'long', 'cafeOpenTiming', 'cafeClosingTime', 
  'actualClosingTime', 'cityHeadEmail', 'cityHeadPhone', 'platformType', 
  'tradingArea', 'launchStatus', 'launchDate'
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

// POST /upload-file (Upload a compliance document)
router.post('/upload-file', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE'), uploadCompliance.single('file'), async (req: any, res) => {
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

  if (fileType === 'converter') {
    const previousUrl = req.query.previousUrl;
    if (previousUrl && typeof previousUrl === 'string' && previousUrl.startsWith('/uploads/')) {
      const filename = previousUrl.replace(/^\/uploads\//, '');
      const safeFilename = path.basename(filename);
      
      const inUse = await isFileInUse(safeFilename);
      if (!inUse) {
        const filePath = path.resolve(process.cwd(), 'uploads', safeFilename);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
            console.log(`Successfully deleted previous converter file: ${filePath}`);
          } catch (err) {
            console.error(`Failed to delete previous converter file: ${filePath}`, err);
          }
        }
      } else {
        console.log(`Preserved previous converter file (in use): ${safeFilename}`);
      }
    }
  }

  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ url: fileUrl });
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
  'SIS/Others'
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

  if (body.cafeModel && !CAFE_MODELS.includes(body.cafeModel)) {
    throw new Error(`Invalid Cafe Model: ${body.cafeModel}. Must be one of: ${CAFE_MODELS.join(', ')}`);
  }

  if (body.menu && !MENU_OPTIONS.includes(body.menu)) {
    throw new Error(`Invalid Menu: ${body.menu}. Must be one of: ${MENU_OPTIONS.join(', ')}`);
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

    if (!smtpConfig.smtpHost || !smtpConfig.smtpUser || smtpConfig.smtpHost === 'smtp.ethereal.email') {
      const testAccount = await nodemailer.createTestAccount();
      const testTransporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
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

    if (!smtpConfig.smtpHost || !smtpConfig.smtpUser || smtpConfig.smtpHost === 'smtp.ethereal.email') {
      const testAccount = await nodemailer.createTestAccount();
      const testTransporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
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

    validateStoreEmailsAndMonth(req.body);

    const status = req.body.status || 'INCOMPLETE_INFORMATION';

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

    if (status === 'PENDING_APPROVAL' || status === 'INCOMPLETE_INFORMATION') {
      // Trigger automatic launch notification email
      triggerUpcomingLaunchEmail(newStore);
    }

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
  
  const targetStatus = status === 'APPROVED' ? 'NSO_APPROVED' : status;

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
      const isApprover = requestUser?.permissions && requestUser.permissions.includes('APPROVER');
      if (!isSuperAdmin && !isApprover) {
        return res.status(403).json({ error: 'Access denied: Only users with Approver permission can change the status of a store in this stage.' });
      }
    }

    if (targetStatus === 'NSO_APPROVED') {
      const missingFields: string[] = [];
      for (const field of MANDATORY_FIELDS) {
        const value = (store as any)[field];
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
    }
    // Clear approvedBy on rejection
    if (targetStatus === 'REJECTED') {
      updateData.approvedBy = null;
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

    if (wasPendingApproval && isNowApproved) {
      triggerNsoApprovedEmail(updatedStore);
    }

    res.json(updatedStore);
  } catch (error) {
    console.error('Update store status error:', error);
    res.status(500).json({ error: 'Failed to update store status' });
  }
});

// Approve compliance details for a store
router.put('/:id/compliance-approve', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'FINANCE'), async (req, res) => {
  const { id } = req.params;
  const user = (req as any).user;
  if (user?.role === 'FINANCE' && (!user.permissions || !user.permissions.split(',').map((p: string) => p.trim()).includes('APPROVER'))) {
    return res.status(403).json({ error: 'Access denied: Finance profile requires Approver permission to approve compliance.' });
  }
  if (user?.role === 'SUPER_ADMIN' && (!user.permissions || !user.permissions.split(',').map((p: string) => p.trim()).includes('APPROVE_COMPLIANCE'))) {
    return res.status(403).json({ error: 'Access denied: Super Admin profile requires Approve Compliance permission.' });
  }
  try {
    const store = await prisma.store.findUnique({
      where: { id: id as string }
    });

    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    if (store.isLocked && user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Store is locked. Only Super Admin can approve compliance.' });
    }

    const complianceFields = [
      { key: 'fssaiNo', label: 'FSSAI Number' },
      { key: 'fssaiLicense', label: 'FSSAI Certificate Link' },
      { key: 'fssaiStartDate', label: 'FSSAI Start Date' },
      { key: 'fssaiExpiry', label: 'FSSAI Expiry Date' },
      { key: 'gstNo', label: 'GST Number' },
      { key: 'gstCertificateLink', label: 'GST Certificate Link' },
      { key: 'rentStartDate', label: 'Rent Agreement Start Date' },
      { key: 'rentExpiry', label: 'Rent Agreement Expiry Date' },
      { key: 'rentAgreementLink', label: 'Rent Agreement Certificate Link' }
    ];

    const missingFields: string[] = [];
    for (const field of complianceFields) {
      const val = (store as any)[field.key];
      if (val === null || val === undefined || String(val).trim() === '') {
        missingFields.push(field.label);
      }
    }

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: 'Compliance Validation Failed',
        message: 'These compliance details must be completed before compliance approval.',
        missingFields
      });
    }

    const updatedStore = await prisma.store.update({
      where: { id: id as string },
      data: { 
        status: 'COMPLIANCE_APPROVED',
        complianceApprovedBy: user?.name || null,
        complianceApprovedAt: new Date()
      }
    });

    await prisma.storeHistory.create({
      data: {
        storeId: updatedStore.id,
        action: 'Compliance Approved',
        newValue: `COMPLIANCE_APPROVED by ${user?.name || 'Unknown'}`
      }
    });

    res.json(updatedStore);
  } catch (error) {
    console.error('Compliance approval error:', error);
    res.status(500).json({ error: 'Failed to approve compliance' });
  }
});

// Update store details
router.put('/:id', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE'), async (req: any, res) => {
  const { id } = req.params;
  const user = req.user;
  try {
    validateStoreEmailsAndMonth(req.body);

    const currentStore = await prisma.store.findUnique({
      where: { id: id as string }
    });
    if (!currentStore) {
      return res.status(404).json({ error: 'Store not found' });
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
        if (currentStore.status !== 'COMPLIANCE_APPROVED') {
          return res.status(400).json({ error: 'Store must be Compliance Approved before going Live.' });
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

    if (updateData.status === 'APPROVED') {
      const approvalStatuses = ['NSO_APPROVED', 'COMPLIANCE_APPROVED', 'LIVE', 'APPROVED'];
      if (currentStore && approvalStatuses.includes(currentStore.status)) {
        updateData.status = currentStore.status;
      } else {
        updateData.status = 'NSO_APPROVED';
      }
    }

    if (updateData.status === 'ON_HOLD') {
      const remarks = updateData.remarks !== undefined ? updateData.remarks : currentStore.remarks;
      if (!remarks || String(remarks).trim() === '') {
        return res.status(400).json({
          error: 'Validation Failed',
          message: 'Remarks are mandatory when placing the cafe on hold.'
        });
      }
    }

    if (updateData.status === 'NSO_APPROVED') {
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
      if (user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Access denied: Only Super Admin can change the lock status of a store.' });
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
    if (targetStatus === 'LIVE') {
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
    if (targetStatus === 'CLOSED') {
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
    const isApprovedStatus = ['NSO_APPROVED', 'APPROVED', 'COMPLIANCE_APPROVED', 'LIVE'].includes(currentStore.status);

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

    // Capture approvedBy when transitioning to approved status, or clear it if transitioning out
    const approvalStatuses = ['APPROVED', 'NSO_APPROVED'];
    if (approvalStatuses.includes(updateData.status)) {
      if (!currentStore?.approvedBy || !approvalStatuses.includes(currentStore?.status)) {
        updateData.approvedBy = user?.name || user?.email || 'Unknown';
      }
    } else if (updateData.status && !approvalStatuses.includes(updateData.status)) {
      updateData.approvedBy = null;
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

    const isNowApproved = store.status === 'NSO_APPROVED' || store.status === 'APPROVED';
    if (wasPendingApproval && isNowApproved) {
      triggerNsoApprovedEmail(store);
    }


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


// Bulk Upload Stores
router.post('/bulk/upload', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'MANAGER'), upload.single('file'), async (req: any, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { action, brand } = req.body;
  
  if (!brand) {
    return res.status(400).json({ error: 'Please select a brand before uploading.' });
  }

  const user = req.user;
  const results: any[] = [];
  const errors: { message: string }[] = [];
  let headerValidated = false;

  const stream = Readable.from(req.file.buffer);

  stream
    .pipe(csvParser())
    .on('headers', (headers: string[]) => {
      // Validate headers exactly
      const expectedHeaders = STORE_CSV_HEADERS.map(h => h.id);
      if (headers.length !== expectedHeaders.length) {
         errors.push({ message: `Header mismatch: Expected ${expectedHeaders.length} columns, got ${headers.length} columns.` });
      } else {
        for (let i = 0; i < headers.length; i++) {
          if (headers[i] !== expectedHeaders[i]) {
            errors.push({ message: `Header mismatch at column ${i + 1}: Expected '${expectedHeaders[i]}', got '${headers[i]}'. Do not modify headers.` });
          }
        }
      }
      headerValidated = true;
    })
    .on('data', (data) => {
      if (errors.length > 0) return; // Skip processing data if headers are bad
      results.push(data);
    })
    .on('end', async () => {
      if (errors.length > 0) {
        return res.status(400).json({ errors });
      }

      if (results.length === 0) {
        return res.status(400).json({ error: 'The uploaded CSV file is empty.' });
      }

      // Validate Mandatory Fields, Email Domains, and Launch Month row by row
      for (let i = 0; i < results.length; i++) {
        const row = results[i];
        const missingFields = MANDATORY_FIELDS.filter(field => !row[field] || String(row[field]).trim() === '');
        if (missingFields.length > 0) {
          errors.push({ message: `Row ${i + 2}: Missing mandatory fields -> ${missingFields.join(', ')}` });
        }

        // Email domain checks
        const emailFields = ['cafeMailId', 'cafeManagerMailId', 'areaManagerEmail', 'cityHeadEmail'];
        for (const field of emailFields) {
          if (row[field]) {
            const emailVal = String(row[field]).toLowerCase().trim();
            if (!emailVal.endsWith('@bluetokaicoffee.com') && !emailVal.endsWith('@gottea.in')) {
              errors.push({ message: `Row ${i + 2}: ${field} must be a valid @bluetokaicoffee.com or @gottea.in email.` });
            }
          }
        }

        // Launch month format check
        if (row.cafeLaunchMonth && !/^[a-zA-Z]+\s+\d{4}$/.test(String(row.cafeLaunchMonth).trim())) {
          errors.push({ message: `Row ${i + 2}: cafeLaunchMonth (Launch Month & Year) must be in "Month Year" format (e.g. "June 2026").` });
        }

        // Cafe model check
        if (row.cafeModel && !CAFE_MODELS.includes(row.cafeModel)) {
          errors.push({ message: `Row ${i + 2}: cafeModel must be one of: ${CAFE_MODELS.join(', ')}` });
        }

        // Menu option check
        if (row.menu && !MENU_OPTIONS.includes(row.menu)) {
          errors.push({ message: `Row ${i + 2}: menu must be one of: ${MENU_OPTIONS.join(', ')}` });
        }

        // State check
        if (row.state && !INDIAN_STATES.includes(row.state)) {
          errors.push({ message: `Row ${i + 2}: state must be a valid Indian state.` });
        }
      }

      if (action === 'modify') {
        const isSuperAdmin = user.role === 'SUPER_ADMIN';
        const hasEditContacts = user.permissions && user.permissions.includes('EDIT_CONTACTS');

        for (let i = 0; i < results.length; i++) {
          const row = results[i];
          const cafeCode = row.cafeCode;
          if (!cafeCode) continue;

          const existing = await prisma.store.findUnique({ where: { cafeCode } });
          if (!existing) {
             errors.push({ message: `Row ${i + 2}: Store with cafeCode ${cafeCode} not found in database.` });
             continue;
          }

          // Compute contact fields modifications
          const modifiesContactDetails = CONTACT_FIELDS.some(key => {
            if (row[key] === undefined) return false;
            const dbVal = (existing as any)[key];
            const reqVal = row[key];
            const normDb = (dbVal === null || dbVal === undefined) ? '' : String(dbVal).trim();
            const normReq = (reqVal === null || reqVal === undefined) ? '' : String(reqVal).trim();
            return normDb !== normReq;
          });

          // Compute non-contact fields modifications
          const NOT_EDITABLE_FIELDS = [
            'cafeName', 'cafeCode', 'cafeModel', 'zone', 
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

          if (existing.isLocked) {
            if (!isSuperAdmin) {
              if (modifiesNonContactFields) {
                errors.push({ message: `Row ${i + 2}: Store with cafeCode ${cafeCode} is locked. Only contact details can be modified.` });
              }
              if (modifiesContactDetails && !hasEditContacts) {
                errors.push({ message: `Row ${i + 2}: Store with cafeCode ${cafeCode} is locked and you do not have permission to modify contact details.` });
              }
            }
          } else {
            if (!isSuperAdmin) {
              if (modifiesContactDetails && !hasEditContacts) {
                errors.push({ message: `Row ${i + 2}: You do not have permission to modify contact details for store with cafeCode ${cafeCode}.` });
              }
            }
          }
        }
      }

      if (action === 'create') {
        const isSuperAdmin = user.role === 'SUPER_ADMIN';
        const hasEditContacts = user.permissions && user.permissions.includes('EDIT_CONTACTS');

        if (!isSuperAdmin && !hasEditContacts) {
          for (let i = 0; i < results.length; i++) {
            const row = results[i];
            const sendsContactDetails = CONTACT_FIELDS.some(key => {
              const val = row[key];
              return val !== undefined && val !== null && String(val).trim() !== '';
            });

            if (sendsContactDetails) {
              errors.push({ message: `Row ${i + 2}: You do not have permission to provide contact details.` });
            }
          }
        }
      }

      if (errors.length > 0) {
        return res.status(400).json({ errors });
      }

      // Insert or Update logic
      try {
        let processedCount = 0;
        if (action === 'create') {
          for (const row of results) {
            // Convert numeric and date fields
            const data: any = { ...row };
            
            // Inject brand from request body
            data.brand = brand;

            if (data.lat) data.lat = parseFloat(data.lat);
            if (data.lng) data.lng = parseFloat(data.lng);
            if (data.latitude) data.latitude = parseFloat(data.latitude);
            if (data.latt) data.latt = parseFloat(data.latt);
            if (data.long) data.long = parseFloat(data.long);
            if (data.launchDate) data.launchDate = new Date(data.launchDate);
            
            data.enteredByEmail = user.email;
            data.status = 'PENDING_APPROVAL';

            // Clean up empty strings for relational IDs
            delete data.areaManagerId;
            delete data.cityHeadId;
            delete data.cafeManagerId;

            // Optional fields fallback to null if empty
            for (const key in data) {
               if (data[key] === '') data[key] = null;
            }

            await prisma.store.create({
              data: {
                 ...data,
                 cafeCode: data.cafeCode, // ensuring unique
                 cafeName: data.cafeName
              }
            });
            processedCount++;
          }
        } else if (action === 'modify') {
          for (const row of results) {
            const data: any = { ...row };
            if (data.lat) data.lat = parseFloat(data.lat);
            if (data.lng) data.lng = parseFloat(data.lng);
            if (data.latitude) data.latitude = parseFloat(data.latitude);
            if (data.latt) data.latt = parseFloat(data.latt);
            if (data.long) data.long = parseFloat(data.long);
            if (data.launchDate) data.launchDate = new Date(data.launchDate);

            // Cannot update unique cafeCode if it changes mapping, but we assume it's the key
            const cafeCode = data.cafeCode;
            delete data.id;
            delete data.createdAt;
            delete data.updatedAt;

            // Remove non-editable fields from update payload
            const NOT_EDITABLE_FIELDS = [
              'cafeName', 'cafeCode', 'cafeModel', 'zone', 
              'cafeLocationGoogleLink', 'latitude', 'latt', 'long', 'gstNo', 'fssaiNo', 
              'fssaiLicense', 'gstCertificateLink'
            ];
            NOT_EDITABLE_FIELDS.forEach(field => {
                delete data[field];
            });

            for (const key in data) {
               if (data[key] === '') data[key] = null;
            }

            // check if exists
            const existing = await prisma.store.findUnique({ where: { cafeCode } });
            if (existing) {
               data.brand = brand; // ensure brand is assigned/updated
               await prisma.store.update({
                 where: { cafeCode },
                 data: data
               });
               processedCount++;
            } else {
               errors.push({ message: `Row with cafeCode ${cafeCode} not found in database for update.` });
            }
          }
        }

        if (errors.length > 0) {
           // We might have partial updates here if we didn't use transaction, but user gets errors.
           return res.status(400).json({ errors, message: `Processed ${processedCount} stores with some errors.` });
        }

        res.json({ message: `Successfully ${action === 'create' ? 'created' : 'updated'} ${processedCount} stores in bulk.` });
      } catch (dbError: any) {
        console.error('DB Bulk Error:', dbError);
        res.status(500).json({ error: `Database error during bulk operation: ${dbError.message || dbError}` });
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
  html += `<table style="border-collapse: collapse; width: 100%; min-width: 700px; font-size: 13px; text-align: left;">`;

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

// POST /:id/send-swiggy-onboarding-email
router.post('/:id/send-swiggy-onboarding-email', authenticateToken, async (req: any, res) => {
  const storeId = req.params.id;
  const { brand: brandParam, to, cc, subject, body } = req.body;
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

    let attachments: any[] = [];
    let htmlBody = '';

    if (isZomato) {
      // Zomato Onboarding Flow
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

      attachments = [];

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
      // Swiggy Onboarding Flow
      const wsData = buildSwiggyTemplateData(store, brandParam || '');
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!cols'] = [
        { wch: 70 },
        { wch: 50 }
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Swiggy Template");
      const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      let restaurantName = "Blue_Tokai";
      if (normalizedBrand.includes("suchali")) {
        restaurantName = "Suchali_Artisan_Bakehouse";
      } else if (normalizedBrand.includes("got_tea") || normalizedBrand.includes("gottea")) {
        restaurantName = "Got_Tea";
      }

      attachments = [{
        filename: `Swiggy_${restaurantName}_Onboarding_Template_${store.cafeCode}.xlsx`,
        content: excelBuffer
      }];

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
      from: '"Analytics" <analytics@bluetokaicoffee.com>',
      to: to || '',
      cc: cc || '',
      subject: subject || (isZomato ? `Zomato Onboarding Request | ${store.cafeName}` : `Swiggy Onboarding Request | ${store.cafeName}`),
      text: body || '',
      html: htmlBody,
      attachments
    };

    let info;
    if (smtpConfig.smtpHost === 'smtp.ethereal.email') {
      const testAccount = await nodemailer.createTestAccount();
      const testTransporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
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

    // Update mailStatus to 'Sent' in database
    await prisma.store.update({
      where: { id: storeId },
      data: { mailStatus: 'Sent' }
    });

    res.json({ message: 'Onboarding email sent successfully.', info });
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

export default router;
