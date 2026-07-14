import { firebaseAdmin } from '../lib/firebase-admin';
import { logAudit } from '../lib/audit-logger';

export interface SMTPConfig {
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string;
}

export async function getSMTPConfig(): Promise<SMTPConfig> {
  let host = process.env.SMTP_HOST || 'smtp.ethereal.email';
  let port = parseInt(process.env.SMTP_PORT || '587', 10);
  let user = process.env.SMTP_USER || '';
  let pass = process.env.SMTP_PASS || '';

  try {
    const doc = await firebaseAdmin.firestore().collection('system').doc('smtp_config').get();
    if (doc.exists) {
      const parsed = doc.data() as any;
      host = parsed.smtpHost || host;
      port = parseInt(parsed.smtpPort || parsed.port || port, 10);
      user = parsed.smtpUser || user;
      pass = parsed.smtpPass || pass;
    }
  } catch (e) {
    console.error('Failed to fetch smtp_config from Firestore, falling back to env', e);
  }

  const secure = port === 465;

  return {
    smtpHost: host,
    smtpPort: port,
    smtpSecure: secure,
    smtpUser: user,
    smtpPass: pass
  };
}

export async function saveSMTPConfig(config: SMTPConfig): Promise<void> {
  const oldDoc = await firebaseAdmin.firestore().collection('system').doc('smtp_config').get();
  const oldData = oldDoc.exists ? oldDoc.data() : null;

  const updatedConfig = {
    ...config,
    smtpSecure: config.smtpPort === 465
  };
  await firebaseAdmin.firestore().collection('system').doc('smtp_config').set(updatedConfig);
  
  // Exclude smtpPass from audit logs for security
  const safeOldData = oldData ? { ...oldData, smtpPass: '***' } : null;
  const safeNewData = { ...updatedConfig, smtpPass: '***' };
  await logAudit('Settings', 'Update SMTP Config', safeOldData, safeNewData);
}
