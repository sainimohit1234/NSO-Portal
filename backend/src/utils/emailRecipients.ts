import { firebaseAdmin } from '../lib/firebase-admin';
import { logAudit } from '../lib/audit-logger';

export interface EmailCategory {
  id: string;
  name: string;
  type: 'to' | 'cc';
  emails: string[];
}

const DEFAULT_RECIPIENTS: EmailCategory[] = [
  {
    id: 'swiggy',
    name: 'Swiggy',
    type: 'to',
    emails: [
      'rahul.mukhi@swiggy.in',
      'shaik.ansar@swiggy.in',
      'premiumvm@swiggy.in'
    ]
  },
  {
    id: 'zomato',
    name: 'Zomato',
    type: 'to',
    emails: [
      'kriti.lahoty@zomato.com',
      'ananya.roy@zomato.com',
      'ananya.bawa@zomato.com'
    ]
  },
  {
    id: 'others',
    name: 'Others',
    type: 'to',
    emails: []
  },
  {
    id: 'cc',
    name: 'CC Email IDs (Applicable for Both Templates)',
    type: 'cc',
    emails: [
      'centraloperations@bluetokaicoffee.com',
      'Anushree@bluetokaicoffee.com',
      'akash.t@bluetokaicoffee.com'
    ]
  },
  {
    id: 'auto_mails',
    name: 'Mail IDs for Auto Mails (TO)',
    type: 'to',
    emails: []
  },
  {
    id: 'auto_mails_cc',
    name: 'Mail IDs for Auto Mails (CC)',
    type: 'cc',
    emails: []
  }
];

export async function getEmailRecipients(): Promise<EmailCategory[]> {
  let config = [...DEFAULT_RECIPIENTS];
  try {
    const doc = await firebaseAdmin.firestore().collection('system').doc('email_recipients').get();
    if (doc.exists) {
      const parsed = doc.data()?.categories || [];
      for (const def of DEFAULT_RECIPIENTS) {
        if (!parsed.find((c: EmailCategory) => c.id === def.id)) {
          parsed.push(def);
        }
      }
      config = parsed;
    } else {
      await saveEmailRecipients(config);
    }
  } catch (e) {
    console.error('Failed to fetch email_recipients from Firestore, falling back to defaults', e);
  }
  
  return config;
}

export async function saveEmailRecipients(config: EmailCategory[]): Promise<void> {
  await firebaseAdmin.firestore().collection('system').doc('email_recipients').set({ categories: config }, { merge: true });
}

export interface EmailMapping {
  id: string;
  category: string;
  subCategory: string;
  to: string[];
  cc: string[];
}

const DEFAULT_MAPPINGS: EmailMapping[] = [
  {
    id: 'zomato_btc',
    category: 'Zomato',
    subCategory: 'BTC Zomato',
    to: ['abc@company.com', 'xyz@company.com'],
    cc: ['manager@company.com']
  },
  {
    id: 'zomato_sab',
    category: 'Zomato',
    subCategory: 'SAB Zomato',
    to: ['abc@company.com'],
    cc: ['manager@company.com']
  },
  {
    id: 'zomato_gottea',
    category: 'Zomato',
    subCategory: 'GOT Tea Zomato',
    to: ['abc@company.com'],
    cc: ['manager@company.com']
  },
  {
    id: 'swiggy_btc',
    category: 'Swiggy',
    subCategory: 'BTC Swiggy',
    to: ['abc@company.com'],
    cc: ['manager@company.com']
  },
  {
    id: 'swiggy_sab',
    category: 'Swiggy',
    subCategory: 'SAB Swiggy',
    to: ['abc@company.com'],
    cc: ['manager@company.com']
  },
  {
    id: 'swiggy_gottea',
    category: 'Swiggy',
    subCategory: 'GOT Tea Swiggy',
    to: ['abc@company.com'],
    cc: ['manager@company.com']
  }
];

export async function getEmailMappings(): Promise<EmailMapping[]> {
  let config = [...DEFAULT_MAPPINGS];
  try {
    const doc = await firebaseAdmin.firestore().collection('system').doc('email_recipients').get();
    if (doc.exists && Array.isArray(doc.data()?.mappings)) {
      config = doc.data()?.mappings || [];
    } else {
      await saveEmailMappings(config);
    }
  } catch (e) {
    console.error('Failed to fetch email mappings from Firestore, falling back to defaults', e);
  }
  return config;
}

export async function saveEmailMappings(config: EmailMapping[]): Promise<void> {
  const oldDoc = await firebaseAdmin.firestore().collection('system').doc('email_recipients').get();
  const oldData = oldDoc.exists ? oldDoc.data()?.mappings || [] : [];
  
  await firebaseAdmin.firestore().collection('system').doc('email_recipients').set({ mappings: config }, { merge: true });
  
  await logAudit('Email Directory', 'Update Email Mappings', oldData, config);
}
