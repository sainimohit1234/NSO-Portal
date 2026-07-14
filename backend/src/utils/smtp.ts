import { firebaseAdmin } from '../lib/firebase-admin';
import { logAudit } from '../lib/audit-logger';

export interface SMTPConfig {
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string;
}

export const ETHEREAL_HOST = 'smtp.ethereal.email';

export class SmtpNotConfiguredError extends Error {
  constructor(host: string) {
    super(
      `SMTP is not configured (resolved host: "${host || 'none'}"). Refusing to fall back to the ` +
      `Ethereal test inbox in production, which would report the mail as sent while delivering it ` +
      `nowhere. Set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS (backend/.env is uploaded as the ` +
      `function's environment on deploy) or populate the system/smtp_config document in Firestore.`
    );
    this.name = 'SmtpNotConfiguredError';
  }
}

// K_SERVICE / FUNCTION_TARGET are set by Cloud Functions & Cloud Run, and by nothing on a dev box.
function isProductionRuntime(): boolean {
  return !!process.env.K_SERVICE || !!process.env.FUNCTION_TARGET;
}

/**
 * Ethereal is a throwaway SMTP catcher: mail "sends" successfully into an inbox nobody reads.
 * That is useful locally, but in production it silently swallows real mail — a deploy that drops
 * SMTP_HOST turns every email into a success message and no delivery. So locally we allow the
 * fallback, and in production we fail loudly instead.
 *
 * Throws SmtpNotConfiguredError when running in production without usable SMTP credentials.
 */
export function shouldUseEtherealFallback(config: SMTPConfig): boolean {
  const unusable = !config.smtpHost || !config.smtpUser || config.smtpHost === ETHEREAL_HOST;
  if (!unusable) return false;
  if (isProductionRuntime()) throw new SmtpNotConfiguredError(config.smtpHost);
  return true;
}

export async function getSMTPConfig(): Promise<SMTPConfig> {
  let host = process.env.SMTP_HOST || ETHEREAL_HOST;
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
