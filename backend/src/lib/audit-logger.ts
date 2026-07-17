import { auditContext } from './audit-context';
import { firebaseAdmin } from './firebase-admin';

const db = firebaseAdmin.firestore();

export async function logAudit(moduleName: string, activity: string, oldData: any, newData: any) {
  if (moduleName === 'auditLog') return;

  const context = auditContext.getStore();
  if (!context || !context.user) return; // Only log user-initiated actions

  const user = context.user;
  const logData = {
    module: moduleName,
    activity: activity,
    userName: user.name || user.email || 'Unknown User',
    userEmail: user.email || '',
    userId: user.id,
    timestamp: new Date().toISOString(),
    oldValue: oldData ? JSON.stringify(oldData) : null,
    newValue: newData ? JSON.stringify(newData) : null,
  };

  try {
    await db.collection('auditLogs').add(logData);
  } catch (e) {
    console.error(`Failed to write audit log for ${moduleName}:`, e);
  }
}
