import fs from 'fs';
import path from 'path';

const configPath = path.resolve(__dirname, '../../../email_threads.json');

/**
 * Retrieves the message ID of the initial email sent for a given Cafe Code.
 * Returns null if no thread exists.
 */
export function getThreadMessageId(cafeCode: string): string | null {
  if (fs.existsSync(configPath)) {
    try {
      const fileData = fs.readFileSync(configPath, 'utf8');
      const parsed = JSON.parse(fileData);
      return parsed[cafeCode] || null;
    } catch (e) {
      console.error('Failed to parse email_threads.json', e);
    }
  }
  return null;
}

/**
 * Saves the message ID of the initial email sent for a given Cafe Code.
 */
export function saveThreadMessageId(cafeCode: string, messageId: string): void {
  let parsed: Record<string, string> = {};
  if (fs.existsSync(configPath)) {
    try {
      const fileData = fs.readFileSync(configPath, 'utf8');
      parsed = JSON.parse(fileData);
    } catch (e) {
      console.error('Failed to parse email_threads.json, initializing empty thread storage', e);
    }
  }
  parsed[cafeCode] = messageId;
  try {
    fs.writeFileSync(configPath, JSON.stringify(parsed, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to write email_threads.json', e);
  }
}
