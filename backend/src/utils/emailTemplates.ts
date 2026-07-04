import { firebaseAdmin } from '../lib/firebase-admin';

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
  await firebaseAdmin.firestore().collection('system').doc('email_templates').set({ templates: config });
}
