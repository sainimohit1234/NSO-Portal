import { Router } from 'express';
import nodemailer from 'nodemailer';
import { authenticateToken, authorizeRoles } from './auth';
import { getSMTPConfig, saveSMTPConfig, SMTPConfig } from '../utils/smtp';
import { getEmailRecipients, saveEmailRecipients, EmailCategory, getEmailMappings, saveEmailMappings, EmailMapping } from '../utils/emailRecipients';
import { getEmailTemplates, saveEmailTemplates } from '../utils/emailTemplates';
import { getThemes, saveThemes } from '../utils/themes';

const router = Router();


import { firebaseAdmin } from '../lib/firebase-admin';
import { PDFDocument } from 'pdf-lib';


// Temporary debug: inspect PDF text items to diagnose placeholder replacement
router.get('/debug-pdf-items', async (req: any, res) => {
  try {
    const db = firebaseAdmin.firestore();
    const snapshot = await db.collection('globalDocuments').get();
    const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
    const targetDoc = docs.find(d => String(d.fileName || '').includes('SAB Onb Zomato'));
    if (!targetDoc) return res.json({ error: 'SAB Onb Zomato not found' });

    let filename = '';
    const normalizedUrl = targetDoc.fileUrl || '';
    if (normalizedUrl.startsWith('/uploads/')) filename = normalizedUrl.replace(/^\/uploads\//, '');
    else if (normalizedUrl.includes('/uploads/')) filename = normalizedUrl.split('/uploads/').pop() || '';
    filename = decodeURIComponent(filename);

    const bucket = firebaseAdmin.storage().bucket();
    const file = bucket.file(`NSO DATA/${filename}`);
    const [exists] = await file.exists();
    if (!exists) return res.json({ error: 'GCS file not found', filename });

    const [buffer] = await file.download();
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
    const pdfDoc = await loadingTask.promise;

    const allItems: any[] = [];
    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const textContent = await page.getTextContent();
      for (const item of textContent.items as any[]) {
        allItems.push({ page: i, str: item.str, x: Math.round(item.transform[4]), y: Math.round(item.transform[5]), size: Math.round(item.transform[0]) });
      }
    }
    // Return items that may relate to placeholders (bracket chars or nearby text)
    const bracketItems = allItems.filter(it => it.str.includes('[') || it.str.includes(']') || it.str.includes('Date') || it.str.includes('Address') || it.str.includes('City') || it.str.includes('State') || it.str.includes('Pin') || it.str.includes('Effective') || it.str.includes('Caf'));
    res.json({ total: allItems.length, bracketItems, firstPage: allItems.filter(it => it.page === 1).slice(0, 80) });
  } catch (err: any) {
    res.json({ error: err.message || String(err) });
  }
});


router.use(authenticateToken);

// Get SMTP configuration
router.get('/smtp', authorizeRoles('SUPER_ADMIN'), async (req, res) => {
  try {
    const config = await getSMTPConfig();
    res.json(config);
  } catch (error) {
    console.error('Error fetching SMTP config:', error);
    res.status(500).json({ error: 'Failed to fetch SMTP configuration' });
  }
});

// Update SMTP configuration
router.put('/smtp', authorizeRoles('SUPER_ADMIN'), async (req, res) => {
  try {
    const { smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass } = req.body;
    if (!smtpHost || !smtpUser) {
      return res.status(400).json({ error: 'Host and User are required fields' });
    }

    const port = parseInt(smtpPort, 10);
    const config: SMTPConfig = {
      smtpHost,
      smtpPort: port,
      smtpSecure: port === 465,
      smtpUser,
      smtpPass: smtpPass || ''
    };

    await saveSMTPConfig(config);
    res.json({ message: 'SMTP configuration saved successfully', config });
  } catch (error) {
    console.error('Error saving SMTP config:', error);
    res.status(500).json({ error: 'Failed to save SMTP configuration' });
  }
});

// Test SMTP connection (sends test email to the requesting user)
router.post('/smtp/test', authorizeRoles('SUPER_ADMIN'), async (req, res) => {
  try {
    const { smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass } = req.body;
    if (!smtpHost || !smtpUser) {
      return res.status(400).json({ error: 'Host and User are required to test connection' });
    }

    const currentUser = (req as any).user;
    const testRecipient = currentUser?.email || smtpUser;

    const port = parseInt(smtpPort, 10);
    const isSecure = port === 465;

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: port,
      secure: isSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass || ''
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Verify the transporter connection
    await transporter.verify();

    // Send a test mail
    const mailOptions = {
      from: `"NSO Portal Test" <${smtpUser}>`,
      to: testRecipient,
      subject: 'NSO Portal - SMTP Test Connection Successful',
      text: `Hello,\n\nThis is a test email from your NSO Portal Admin Dashboard.\n\nYour SMTP configuration is correct and working successfully!\n\nDetails:\nHost: ${smtpHost}\nPort: ${smtpPort}\nUser: ${smtpUser}\n\nRegards,\nNSM Store Operations Portal`,
      html: `<div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #10b981; border-radius: 12px; max-width: 500px; margin: auto;">
        <h2 style="color: #10b981; text-align: center; margin-top: 0;">SMTP Test Connection Successful</h2>
        <p>Hello,</p>
        <p>This is a test email confirming that your NSO Portal SMTP server configuration is correct and fully operational!</p>
        <div style="background-color: #f0fdf4; padding: 15px; border-radius: 8px; border: 1px solid #bbf7d0; font-size: 14px; margin: 20px 0; color: #166534;">
          <strong>Server Details:</strong><br/>
          • Host: <code>${smtpHost}</code><br/>
          • Port: <code>${smtpPort}</code><br/>
          • User: <code>${smtpUser}</code>
        </div>
        <p style="font-size: 13px; color: #475569;">You can now safely save this configuration.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-bottom: 0;">Store Operations Portal &copy; 2026</p>
      </div>`
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: `SMTP verification successful. A test email has been sent to ${testRecipient}.` });
  } catch (error: any) {
    console.error('SMTP test error:', error);
    res.status(500).json({ error: error.message || 'SMTP Connection Test failed. Please check credentials and server settings.' });
  }
});

// Get email recipient configuration
router.get('/email-recipients', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE'), async (req, res) => {
  try {
    const config = await getEmailRecipients();
    res.json(config);
  } catch (error) {
    console.error('Error fetching email recipients:', error);
    res.status(500).json({ error: 'Failed to fetch email recipient configurations' });
  }
});

// Update email recipient configuration
router.put('/email-recipients', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE'), async (req, res) => {
  try {
    const currentUser = (req as any).user;
    const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
    const hasEmailDirectoryPerm = currentUser?.permissions?.split(',').includes('EMAIL_DIRECTORY');
    if (!isSuperAdmin && !hasEmailDirectoryPerm) {
      return res.status(403).json({ error: 'Access Denied: Email Directory sub-access required.' });
    }

    const config = req.body;
    if (!Array.isArray(config)) {
      return res.status(400).json({ error: 'Configuration must be an array of categories' });
    }
    await saveEmailRecipients(config);
    res.json({ message: 'Email recipient configuration saved successfully', config });
  } catch (error) {
    console.error('Error saving email recipients:', error);
    res.status(500).json({ error: 'Failed to save email recipient configurations' });
  }
});

// Get email mappings configuration
router.get('/email-mappings', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE'), async (req, res) => {
  try {
    const config = await getEmailMappings();
    res.json(config);
  } catch (error) {
    console.error('Error fetching email mappings:', error);
    res.status(500).json({ error: 'Failed to fetch email recipient mappings' });
  }
});

// Update email mappings configuration
router.put('/email-mappings', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE'), async (req, res) => {
  try {
    const currentUser = (req as any).user;
    const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
    const hasEmailDirectoryPerm = currentUser?.permissions?.split(',').includes('EMAIL_DIRECTORY');
    if (!isSuperAdmin && !hasEmailDirectoryPerm) {
      return res.status(403).json({ error: 'Access Denied: Email Directory sub-access required.' });
    }

    const config = req.body;
    if (!Array.isArray(config)) {
      return res.status(400).json({ error: 'Configuration must be an array of mappings' });
    }
    await saveEmailMappings(config);
    res.json({ message: 'Email recipient mappings saved successfully', config });
  } catch (error) {
    console.error('Error saving email mappings:', error);
    res.status(500).json({ error: 'Failed to save email recipient mappings' });
  }
});

// Get email templates configuration
router.get('/email-templates', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE'), async (req, res) => {
  try {
    const config = await getEmailTemplates();
    res.json(config);
  } catch (error) {
    console.error('Error fetching email templates:', error);
    res.status(500).json({ error: 'Failed to fetch email templates' });
  }
});

// Update email templates configuration
router.put('/email-templates', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE'), async (req, res) => {
  try {
    const currentUser = (req as any).user;
    const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
    const hasEmailDirectoryPerm = currentUser?.permissions?.split(',').includes('EMAIL_DIRECTORY');
    if (!isSuperAdmin && !hasEmailDirectoryPerm) {
      return res.status(403).json({ error: 'Access Denied: Email Directory sub-access required.' });
    }

    const config = req.body;
    await saveEmailTemplates(config);
    res.json({ message: 'Email templates saved successfully', config });
  } catch (error) {
    console.error('Error saving email templates:', error);
    res.status(500).json({ error: 'Failed to save email templates' });
  }
});

// Get themes
router.get('/themes', async (req, res) => {
  try {
    const config = await getThemes();
    res.json(config);
  } catch (error) {
    console.error('Error fetching themes:', error);
    res.status(500).json({ error: 'Failed to fetch themes' });
  }
});

// Update themes
router.put('/themes', authorizeRoles('SUPER_ADMIN'), async (req, res) => {
  try {
    const urls = req.body.urls;
    if (!Array.isArray(urls)) {
      return res.status(400).json({ error: 'Payload must contain a urls array' });
    }
    await saveThemes(urls);
    res.json({ message: 'Themes saved successfully', urls });
  } catch (error) {
    console.error('Error saving themes:', error);
    res.status(500).json({ error: 'Failed to save themes' });
  }
});

// Get Audit Logs
router.get('/audit-logs', authorizeRoles('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { firebaseAdmin } = await import('../lib/firebase-admin');
    const db = firebaseAdmin.firestore();
    const snapshot = await db.collection('auditLogs')
      .orderBy('timestamp', 'desc')
      .limit(2000)
      .get();
      
    const logs = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));

    const groupedLogs: Record<string, any> = {};

    for (const log of logs) {
      if (log.activities) {
        // It's a new grouped log
        if (!groupedLogs[log.id]) {
          groupedLogs[log.id] = log;
        } else {
          groupedLogs[log.id].activities.push(...log.activities);
        }
      } else {
        // Legacy log
        const dateStr = log.timestamp ? log.timestamp.split('T')[0] : 'UnknownDate';
        const userId = log.userId || 'unknown';
        const groupId = `audit_${userId}_${dateStr}`;
        
        let actionStr = log.activity;
        if (!actionStr) continue; // skip if literally empty activity

        let hasChanges = false;
        try {
          const oldVal = JSON.parse(log.oldValue || '{}');
          const newVal = JSON.parse(log.newValue || '{}');
          const allKeys = Array.from(new Set([...Object.keys(oldVal), ...Object.keys(newVal)]));
          for (const key of allKeys) {
            if (['id', 'createdAt', 'updatedAt', 'lastActiveAt', 'lastLoginAt'].includes(key)) continue;
            if (JSON.stringify(oldVal[key]) !== JSON.stringify(newVal[key])) {
              hasChanges = true;
              break;
            }
          }
        } catch(e) {
          hasChanges = !!log.oldValue || !!log.newValue; 
        }

        const actLower = actionStr.toLowerCase();
        if (actLower.includes('delete') || actLower.includes('create') || actLower.includes('remove')) {
          hasChanges = true;
        }

        if (!hasChanges) continue; // Skip legacy logs with no actual changes

        if (log.module === 'store') {
          try {
            const newVal = JSON.parse(log.newValue || '{}');
            if (newVal.cafeName) actionStr += ` (${newVal.cafeName})`;
          } catch(e) {}
        }
        
        const activity = {
          time: log.timestamp ? new Date(log.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '',
          timestamp: log.timestamp || '',
          module: log.module,
          action: actionStr
        };

        if (!groupedLogs[groupId]) {
          groupedLogs[groupId] = {
            id: groupId,
            userId: log.userId,
            userName: log.userName || log.userEmail || 'Unknown User',
            userEmail: log.userEmail || '',
            date: dateStr,
            timestamp: dateStr,
            activities: [activity]
          };
        } else {
          groupedLogs[groupId].activities.push(activity);
        }
      }
    }

    const finalLogs = Object.values(groupedLogs).filter((group: any) => group.activities && group.activities.length > 0).map((group: any) => {
      group.activities.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      return group;
    });

    finalLogs.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json(finalLogs);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

export default router;
