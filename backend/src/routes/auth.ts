import { Request, Response, NextFunction } from 'express';
import { firebaseAdmin } from '../lib/firebase-admin';
import { auditContext } from '../lib/audit-context';

// NOTE: All authentication (login, password reset) is handled client-side by
// Firebase Auth. The former backend /api/auth/* endpoints (custom JWT login,
// OTP reset, etc.) were unused by the app and have been removed. This module now
// only provides the request-authentication middleware used by the API routes,
// which verifies the caller's Firebase ID token.

const db = firebaseAdmin.firestore();

interface AuthenticatedRequest extends Request {
  user?: any;
}

// Authentication middleware — verifies a Firebase ID token and loads the user.
export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  if (!token && req.query.token) {
    token = req.query.token as string;
  }

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(token);
    const email = decodedToken.email;

    if (!email) {
      return res.status(401).json({ error: 'Token missing email claim' });
    }

    const userQuery = await db.collection('users').where('email', '==', email.toLowerCase()).get();
    if (userQuery.empty) {
      return res.status(401).json({ error: 'User not found in database' });
    }

    const dbUser = { id: userQuery.docs[0].id, ...userQuery.docs[0].data() } as any;
    if (dbUser.approved !== true && dbUser.email !== 'admin@bluetokaicoffee.com') {
      return res.status(403).json({ error: 'Access denied: User account is pending admin approval' });
    }
    req.user = dbUser;

    // Update heartbeat and lastLoginAt
    const nowStr = new Date().toISOString();
    const updates: any = { lastActiveAt: nowStr };

    const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000;
    const shouldUpdateLoginTime = !dbUser.lastLoginAt || new Date(dbUser.lastLoginAt).getTime() < twelveHoursAgo;

    if (shouldUpdateLoginTime) {
      updates.lastLoginAt = nowStr;
    }

    await db.collection('users').doc(dbUser.id).update(updates)
      .catch(e => console.error('Failed to update lastActiveAt/lastLoginAt:', e));

    auditContext.run({ user: dbUser }, () => {
      next();
    });
  } catch (error) {
    console.error('Firebase token verification error:', error);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Role authorization middleware
export const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied: Insufficient permissions' });
    }
    next();
  };
};
