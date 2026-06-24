import { firebaseAdmin } from '../lib/firebase-admin';

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
  await firebaseAdmin.firestore().collection('system').doc('email_recipients').set({ categories: config });
}
