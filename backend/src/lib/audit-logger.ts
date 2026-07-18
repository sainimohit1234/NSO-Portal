import { auditContext } from './audit-context';
import { firebaseAdmin } from './firebase-admin';

const db = firebaseAdmin.firestore();

function getActionMessage(moduleName: string, activity: string, oldData: any, newData: any): string | null {
  const isCreate = activity.toLowerCase().includes('create');
  const isDelete = activity.toLowerCase().includes('delete') || activity.toLowerCase().includes('remove');
  
  if (isCreate) return `Created ${moduleName} record`;
  if (isDelete) return `Deleted ${moduleName} record`;

  // It's an update
  if (!oldData || !newData) return `Updated ${moduleName} record`;

  let changedFields: string[] = [];
  for (const key of Object.keys(newData)) {
    // Ignore automatic fields
    if (['updatedAt', 'id', 'createdAt'].includes(key)) continue;
    
    if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
      changedFields.push(key);
    }
  }

  if (changedFields.length === 0) return null; // No actual change

  let actionPrefix = `Updated ${moduleName} Details`;
  if (changedFields.includes('status')) {
    actionPrefix = `Changed Store Status from ${oldData.status || 'None'} to ${newData.status}`;
  }

  return `${actionPrefix} (Modified: ${changedFields.join(', ')})`;
}

export async function logAudit(moduleName: string, activity: string, oldData: any, newData: any) {
  const ignoredModules = ['auditLog', 'storeHistory', 'metadata', 'login_audit_trail'];
  if (ignoredModules.includes(moduleName)) return;

  const context = auditContext.getStore();
  if (!context || !context.user) return; // Only log user-initiated actions

  const user = context.user;
  const actionMsg = getActionMessage(moduleName, activity, oldData, newData);
  if (!actionMsg) return; // No actual change

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const docId = `audit_${user.id}_${dateStr}`;

  const newActivity = {
    time: timeStr,
    timestamp: now.toISOString(),
    module: moduleName,
    action: actionMsg
  };

  try {
    const docRef = db.collection('auditLogs').doc(docId);
    await docRef.set({
      userId: user.id,
      userName: user.name || user.email || 'Unknown User',
      userEmail: user.email || '',
      date: dateStr,
      timestamp: dateStr, // for sorting descending by day
      activities: firebaseAdmin.firestore.FieldValue.arrayUnion(newActivity)
    }, { merge: true });
  } catch (e) {
    console.error(`Failed to write audit log for ${moduleName}:`, e);
  }
}
