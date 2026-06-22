import fs from 'fs';
import path from 'path';

const configPath = path.resolve(__dirname, '../../../smtp_config.json');

export interface SMTPConfig {
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string;
}

export function getSMTPConfig(): SMTPConfig {
  let host = process.env.SMTP_HOST || 'smtp.ethereal.email';
  let port = parseInt(process.env.SMTP_PORT || '587', 10);
  let user = process.env.SMTP_USER || '';
  let pass = process.env.SMTP_PASS || '';

  if (fs.existsSync(configPath)) {
    try {
      const fileData = fs.readFileSync(configPath, 'utf8');
      const parsed = JSON.parse(fileData);
      host = parsed.smtpHost || host;
      port = parseInt(parsed.smtpPort || parsed.port || port, 10);
      user = parsed.smtpUser || user;
      pass = parsed.smtpPass || pass;
    } catch (e) {
      console.error('Failed to parse smtp_config.json, falling back to process.env', e);
    }
  }

  // Force secure: true ONLY for port 465 (Implicit SSL/TLS)
  // For other ports like 587, set secure: false so STARTTLS upgrades plain text correctly
  const secure = port === 465;

  return {
    smtpHost: host,
    smtpPort: port,
    smtpSecure: secure,
    smtpUser: user,
    smtpPass: pass
  };
}

export function saveSMTPConfig(config: SMTPConfig): void {
  // Enforce correct secure setting based on port before saving
  const updatedConfig = {
    ...config,
    smtpSecure: config.smtpPort === 465
  };
  fs.writeFileSync(configPath, JSON.stringify(updatedConfig, null, 2), 'utf8');
}
