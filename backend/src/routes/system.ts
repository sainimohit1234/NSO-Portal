import { Router } from 'express';
import nodemailer from 'nodemailer';
import { authenticateToken, authorizeRoles } from './auth';
import { getSMTPConfig, saveSMTPConfig, SMTPConfig } from '../utils/smtp';
import { getEmailRecipients, saveEmailRecipients, EmailCategory, getEmailMappings, saveEmailMappings, EmailMapping } from '../utils/emailRecipients';
import { getEmailTemplates, saveEmailTemplates } from '../utils/emailTemplates';

const router = Router();

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

export default router;
