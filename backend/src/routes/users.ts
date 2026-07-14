// @ts-nocheck

import { Router } from 'express';
import { hashPassword } from '../utils/auth';
import { authenticateToken, authorizeRoles } from './auth';
import { firebaseAdmin } from '../lib/firebase-admin';
import { logAudit } from '../lib/audit-logger';

const router = Router();
const db = firebaseAdmin.firestore();

router.use(authenticateToken);

// Middleware to automatically apply the 90-day inactivity deletion policy
router.use(async (req: any, res, next) => {
  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const featureReleaseDate = new Date('2026-06-20T00:00:00Z');

    const usersSnapshot = await db.collection('users').get();
    const inactiveUsers: any[] = [];
    
    usersSnapshot.forEach(doc => {
      const user = doc.data();
      user.id = doc.id;
      if (user.email === 'admin@bluetokaicoffee.com') return;

      const lastLoginAt = user.lastLoginAt ? new Date(user.lastLoginAt) : null;
      const createdAt = user.createdAt ? new Date(user.createdAt) : null;

      if (lastLoginAt && lastLoginAt <= ninetyDaysAgo) {
        inactiveUsers.push(user);
      } else if (!lastLoginAt && createdAt && createdAt > featureReleaseDate && createdAt <= ninetyDaysAgo) {
        inactiveUsers.push(user);
      }
    });

    if (inactiveUsers.length > 0) {
      const batch = db.batch();
      const idsToDelete = inactiveUsers.map(u => u.id);
      idsToDelete.forEach(id => {
        batch.delete(db.collection('users').doc(id));
      });
      await batch.commit();
      console.log(`Auto-Deleted ${inactiveUsers.length} inactive user accounts. IDs: ${idsToDelete.join(', ')}`);
    }
  } catch (error) {
    console.error('Error in user auto-deletion middleware:', error);
  }
  next();
});

// Get all users
router.get('/', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE'), async (req, res) => {
  try {
    const currentUser = (req as any).user;
    const usersSnapshot = await db.collection('users').get();
    let users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

    if (currentUser?.role === 'MANAGER') {
      users = users.filter(u => !['SUPER_ADMIN', 'ADMIN'].includes(u.role));
    }
    
    users.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    res.json(users);
  } catch (error) {
    console.error('Fetch users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Create a new user
router.post('/', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE'), async (req, res) => {
  try {
    const { name, email, password, phone, role, permissions } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const currentUser = (req as any).user;
    const targetRole = role || 'USER';

    if (targetRole === 'SUPER_ADMIN' && currentUser?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Access denied: Only Super Admin users can create a Super Admin profile.' });
    }

    // Role restrictions for Manager and Finance
    if (currentUser?.role === 'MANAGER' || currentUser?.role === 'FINANCE') {
      const hasCreatePermission = currentUser?.permissions
        ? currentUser.permissions.split(',').map((p: string) => p.trim()).includes('CREATE_USER')
        : false;
      if (!hasCreatePermission) {
        return res.status(403).json({ error: 'Access denied: You do not have permission to create users.' });
      }
      if (targetRole !== currentUser.role) {
        return res.status(403).json({ error: `Access denied: Users with the ${currentUser.role} access profile can create only ${currentUser.role} users.` });
      }
    }

    if (currentUser?.role !== 'SUPER_ADMIN' && currentUser?.role !== 'ADMIN' && permissions) {
      const payloadHasCreateUser = permissions.split(',').map((p: string) => p.trim()).includes('CREATE_USER');
      if (payloadHasCreateUser) {
        return res.status(403).json({ error: 'Access denied: Only Super Admin and Admin users can grant the Create User permission.' });
      }
    }

    const emailLower = email.toLowerCase();
    if (!emailLower.endsWith('@bluetokaicoffee.com') && !emailLower.endsWith('@gottea.in')) {
      return res.status(400).json({ error: 'Please enter a valid email ID. Only email addresses with the domain @bluetokaicoffee.com or @gottea.in are allowed.' });
    }

    const nameQuery = await db.collection('users').where('name', '==', name).get();
    if (!nameQuery.empty) {
      return res.status(409).json({ error: 'User Name already exists. Please enter a unique User Name.' });
    }

    const emailQuery = await db.collection('users').where('email', '==', emailLower).get();
    if (!emailQuery.empty) {
      return res.status(409).json({ error: 'A user with this email already exists' });
    }

    // Create the user in Firebase Auth
    let uid: string;
    try {
      const authUser = await firebaseAdmin.auth().createUser({
        email: emailLower,
        password: password || 'Bluetokai@123',
        displayName: name
      });
      uid = authUser.uid;
    } catch (authError: any) {
      if (authError.code === 'auth/email-already-exists') {
        const existingAuthUser = await firebaseAdmin.auth().getUserByEmail(emailLower);
        uid = existingAuthUser.uid;
      } else {
        throw authError;
      }
    }

    const newUser = {
      id: uid,
      name,
      email: emailLower,
      password: hashPassword(password || 'Bluetokai@123'),
      phone: phone || null,
      role: role || 'USER',
      permissions: permissions || null,
      approved: true,
      registrationStatus: 'APPROVED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.collection('users').doc(uid).set(newUser);
    
    const sanitizedUser = { ...newUser };
    delete sanitizedUser.password;
    await logAudit('User Management', 'Create User', null, sanitizedUser);

    res.status(201).json(newUser);
  } catch (error: any) {
    console.error('Create user error:', error);
    res.status(500).json({ error: error.message || 'Failed to create user' });
  }
});

// Update a user (name, phone, role)
router.put('/:id', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE'), async (req, res) => {
  const { id } = req.params;
  const { name, email, password, phone, role } = req.body;
  try {
    const currentUser = (req as any).user;

    const userDoc = await db.collection('users').doc(id).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    const targetUser = { id: userDoc.id, ...userDoc.data() } as any;

    if (targetUser.role === 'SUPER_ADMIN' && currentUser?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Access denied: Only Super Admin users can modify a Super Admin profile.' });
    }

    if (currentUser?.role === 'MANAGER' || currentUser?.role === 'FINANCE') {
      const hasCreatePermission = currentUser?.permissions
        ? currentUser.permissions.split(',').map((p: string) => p.trim()).includes('CREATE_USER')
        : false;
      if (!hasCreatePermission) {
        return res.status(403).json({ error: 'Access denied: You do not have permission to edit users.' });
      }
      if (targetUser.role !== currentUser.role) {
        return res.status(403).json({ error: `Access denied: Users with the ${currentUser.role} access profile can edit only ${currentUser.role} users.` });
      }
      if (targetUser.id === currentUser.id && req.body.permissions !== undefined && (req.body.permissions || null) !== (targetUser.permissions || null)) {
        return res.status(403).json({ error: 'Access denied: You cannot modify your own permissions.' });
      }
      if (role && role !== currentUser.role) {
        return res.status(403).json({ error: 'Access denied: You cannot change the access profile role.' });
      }
    }

    if (currentUser?.role !== 'SUPER_ADMIN' && currentUser?.role !== 'ADMIN' && req.body.permissions !== undefined) {
      const targetHasCreateUser = targetUser.permissions ? targetUser.permissions.split(',').map((p: string) => p.trim()).includes('CREATE_USER') : false;
      const payloadHasCreateUser = req.body.permissions ? req.body.permissions.split(',').map((p: string) => p.trim()).includes('CREATE_USER') : false;
      if (targetHasCreateUser !== payloadHasCreateUser) {
        return res.status(403).json({ error: 'Access denied: Only Super Admin and Admin users can grant or revoke the Create User permission.' });
      }
    }

    if (email !== undefined) {
      const emailLower = email.toLowerCase();
      if (!emailLower.endsWith('@bluetokaicoffee.com') && !emailLower.endsWith('@gottea.in')) {
        return res.status(400).json({ error: 'Please enter a valid email ID. Only email addresses with the domain @bluetokaicoffee.com or @gottea.in are allowed.' });
      }
      const existingEmail = await db.collection('users').where('email', '==', emailLower).get();
      if (!existingEmail.empty && existingEmail.docs[0].id !== id) {
        return res.status(409).json({ error: 'A user with this email already exists' });
      }
    }

    if (name !== undefined) {
      const existingName = await db.collection('users').where('name', '==', name).get();
      if (!existingName.empty && existingName.docs[0].id !== id) {
        return res.status(409).json({ error: 'User Name already exists. Please enter a unique User Name.' });
      }
    }

    // Sync updates to Firebase Auth if email, password, or name changed
    const authUpdates: any = {};
    if (email !== undefined) authUpdates.email = email.toLowerCase();
    if (password !== undefined) authUpdates.password = password;
    if (name !== undefined) authUpdates.displayName = name;

    if (Object.keys(authUpdates).length > 0) {
      await firebaseAdmin.auth().updateUser(id, authUpdates);
    }

    const updates: any = { updatedAt: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email.toLowerCase();
    if (password !== undefined) updates.password = hashPassword(password);
    if (phone !== undefined) updates.phone = phone;
    if (role !== undefined) updates.role = role;
    if (req.body.permissions !== undefined) updates.permissions = req.body.permissions;
    if (req.body.approved !== undefined) updates.approved = req.body.approved;
    if (req.body.registrationStatus !== undefined) updates.registrationStatus = req.body.registrationStatus;

    await db.collection('users').doc(id).update(updates);
    
    const sanitizedOld = { ...targetUser };
    delete sanitizedOld.password;
    const sanitizedNew = { ...targetUser, ...updates };
    delete sanitizedNew.password;
    await logAudit('User Management', 'Update User', sanitizedOld, sanitizedNew);

    const updatedDoc = await db.collection('users').doc(id).get();
    res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (error: any) {
    console.error('Update user error:', error);
    res.status(500).json({ error: error.message || 'Failed to update user' });
  }
});

// Delete a user
router.delete('/:id', authorizeRoles('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  const { id } = req.params;
  try {
    const currentUser = (req as any).user;

    const userDoc = await db.collection('users').doc(id).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    const targetUser = { id: userDoc.id, ...userDoc.data() } as any;

    if (targetUser.role === 'SUPER_ADMIN' && currentUser?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Access denied: Only Super Admin users can delete a Super Admin profile.' });
    }

    if (targetUser.id === currentUser.id) {
      return res.status(400).json({ error: 'Access denied: You cannot delete your own user account.' });
    }

    if (currentUser?.role === 'MANAGER') {
      if (['SUPER_ADMIN', 'ADMIN'].includes(targetUser.role)) {
        return res.status(403).json({ error: 'Access denied: Managers cannot delete Super Admin or Admin profiles.' });
      }
      if (targetUser.id === currentUser.id) {
        return res.status(403).json({ error: 'Access denied: Managers cannot delete their own profiles.' });
      }
      if (targetUser.role !== 'USER') {
        return res.status(403).json({ error: 'Access denied: Managers can only delete User profiles.' });
      }
    }

    // Delete user from Firebase Auth
    try {
      await firebaseAdmin.auth().deleteUser(id);
    } catch (authError: any) {
      console.warn(`Could not delete user ${id} from Firebase Auth (might not exist in Auth):`, authError);
    }

    await db.collection('users').doc(id).delete();
    
    const sanitizedOld = { ...targetUser };
    delete sanitizedOld.password;
    await logAudit('User Management', 'Delete User', sanitizedOld, null);

    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete user' });
  }
});

// GET /api/storage-files (List all tracked upload/delete file operations, restricted to SUPER_ADMIN)
router.get('/storage-files', authorizeRoles('SUPER_ADMIN'), async (req: any, res) => {
  try {
    const snapshot = await db.collection('storageFiles').get();
    const files: any[] = [];
    snapshot.forEach(doc => {
      files.push({ id: doc.id, ...doc.data() });
    });
    // Sort by uploadedAt descending
    files.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    res.json(files);
  } catch (error) {
    console.error('Failed to get storage files:', error);
    res.status(500).json({ error: 'Failed to retrieve storage files' });
  }
});

export default router;
