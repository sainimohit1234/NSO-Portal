import fs from 'fs';
import path from 'path';

const configPath = path.resolve(__dirname, '../../../email_recipients.json');

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

export function getEmailRecipients(): EmailCategory[] {
  let config = [...DEFAULT_RECIPIENTS];
  if (fs.existsSync(configPath)) {
    try {
      const fileData = fs.readFileSync(configPath, 'utf8');
      const parsed = JSON.parse(fileData);
      
      // Ensure all defaults exist in parsed
      for (const def of DEFAULT_RECIPIENTS) {
        if (!parsed.find((c: EmailCategory) => c.id === def.id)) {
          parsed.push(def);
        }
      }
      config = parsed;
    } catch (e) {
      console.error('Failed to parse email_recipients.json, falling back to defaults', e);
    }
  }
  
  // Save merged or default config back to ensure it's up to date
  try {
    saveEmailRecipients(config);
  } catch (e) {
    console.error('Failed to write default email_recipients.json', e);
  }
  return config;
}

export function saveEmailRecipients(config: EmailCategory[]): void {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
}
