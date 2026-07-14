import { firebaseAdmin } from '../lib/firebase-admin';
import { logAudit } from '../lib/audit-logger';

interface EmailTemplate {
  subject: string;
  body: string;
}

interface EmailTemplatesMap {
  [subCategory: string]: EmailTemplate;
}

export async function getEmailTemplates(): Promise<EmailTemplatesMap> {
  let config: EmailTemplatesMap = {};
  try {
    const doc = await firebaseAdmin.firestore().collection('system').doc('email_templates').get();
    if (doc.exists) {
      config = doc.data()?.templates || {};
    }
  } catch (e) {
    console.error('Failed to fetch email_templates from Firestore', e);
  }
  return config;
}

export async function saveEmailTemplates(config: EmailTemplatesMap): Promise<void> {
  const oldDoc = await firebaseAdmin.firestore().collection('system').doc('email_templates').get();
  const oldData = oldDoc.exists ? oldDoc.data()?.templates || {} : {};

  await firebaseAdmin.firestore().collection('system').doc('email_templates').set({ templates: config });
  
  await logAudit('Email Directory', 'Update Email Templates', oldData, config);
}
