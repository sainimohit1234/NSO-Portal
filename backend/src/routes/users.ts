import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../utils/auth';
import { authenticateToken, authorizeRoles } from './auth';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticateToken);

// Middleware to automatically apply the 90-day inactivity deletion policy
router.use(async (req: any, res, next) => {
  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    // Feature release date check to protect pre-existing users who have never logged in yet
    const featureReleaseDate = new Date('2026-06-20T00:00:00Z');

    const inactiveUsers = await prisma.user.findMany({
      where: {
        email: { not: 'admin@bluetokaicoffee.com' }, // Exclude main seed admin account
        OR: [
          {
            lastLoginAt: { lte: ninetyDaysAgo }
          },
          {
            lastLoginAt: null,
            createdAt: {
              gt: featureReleaseDate,
              lte: ninetyDaysAgo
            }
          }
        ]
      }
    });

    if (inactiveUsers.length > 0) {
      const idsToDelete = inactiveUsers.map(u => u.id);
      await prisma.user.deleteMany({
        where: {
          id: { in: idsToDelete }
        }
      });
      console.log(`Auto-Deleted ${inactiveUsers.length} inactive user accounts due to the 90-day inactivity policy. IDs: ${idsToDelete.join(', ')}`);
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
    const whereClause = currentUser?.role === 'MANAGER'
      ? { NOT: { role: { in: ['SUPER_ADMIN', 'ADMIN'] } } }
      : {};

    const users = await prisma.user.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
    });
    res.json(users);
  } catch (error) {
    console.error('Fetch users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Create a new user
router.post('/', authorizeRoles('SUPER_ADMIN', 'MANAGER', 'FINANCE'), async (req, res) => {
  try {
    const { name, email, password, phone, role, permissions } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const currentUser = (req as any).user;
    const targetRole = role || 'USER';

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

    // Create User permission restriction: only Super Admin can grant CREATE_USER
    if (currentUser?.role !== 'SUPER_ADMIN' && permissions) {
      const payloadHasCreateUser = permissions.split(',').map((p: string) => p.trim()).includes('CREATE_USER');
      if (payloadHasCreateUser) {
        return res.status(403).json({ error: 'Access denied: Only Super Admin users can grant the Create User permission.' });
      }
    }

    // Email domain validation
    const emailLower = email.toLowerCase();
    if (!emailLower.endsWith('@bluetokaicoffee.com') && !emailLower.endsWith('@gottea.in')) {
      return res.status(400).json({ error: 'Please enter a valid email ID. Only email addresses with the domain @bluetokaicoffee.com or @gottea.in are allowed.' });
    }

    // Unique username validation
    const existingName = await prisma.user.findUnique({
      where: { name }
    });
    if (existingName) {
      return res.status(409).json({ error: 'User Name already exists. Please enter a unique User Name.' });
    }

    // Unique email validation
    const existingEmail = await prisma.user.findUnique({
      where: { email }
    });
    if (existingEmail) {
      return res.status(409).json({ error: 'A user with this email already exists' });
    }

    const user = await prisma.user.create({
      data: { 
        name, 
        email, 
        password: hashPassword(password || 'Bluetokai@123'),
        phone: phone || null, 
        role: role || 'USER', 
        permissions: permissions || null 
      },
    });
    res.status(201).json(user);
  } catch (error: any) {
    if (error?.code === 'P2002') {
      const target = error.meta?.target || '';
      if (target.includes('name')) {
        return res.status(409).json({ error: 'User Name already exists. Please enter a unique User Name.' });
      }
      return res.status(409).json({ error: 'A user with this email already exists' });
    }
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update a user (name, phone, role)
router.put('/:id', authorizeRoles('SUPER_ADMIN', 'MANAGER', 'FINANCE'), async (req, res) => {
  const { id } = req.params;
  const { name, email, password, phone, role } = req.body;
  try {
    const userId = parseInt(id as string);
    const currentUser = (req as any).user;

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Role restrictions for Manager and Finance
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

    // Create User permission restriction: only Super Admin can grant or revoke CREATE_USER
    if (currentUser?.role !== 'SUPER_ADMIN' && req.body.permissions !== undefined) {
      const targetHasCreateUser = targetUser.permissions
        ? targetUser.permissions.split(',').map((p: string) => p.trim()).includes('CREATE_USER')
        : false;
      const payloadHasCreateUser = req.body.permissions
        ? req.body.permissions.split(',').map((p: string) => p.trim()).includes('CREATE_USER')
        : false;
      if (targetHasCreateUser !== payloadHasCreateUser) {
        return res.status(403).json({ error: 'Access denied: Only Super Admin users can grant or revoke the Create User permission.' });
      }
    }

    if (email !== undefined) {
      const emailLower = email.toLowerCase();
      if (!emailLower.endsWith('@bluetokaicoffee.com') && !emailLower.endsWith('@gottea.in')) {
        return res.status(400).json({ error: 'Please enter a valid email ID. Only email addresses with the domain @bluetokaicoffee.com or @gottea.in are allowed.' });
      }
      const existingEmail = await prisma.user.findUnique({
        where: { email }
      });
      if (existingEmail && existingEmail.id !== userId) {
        return res.status(409).json({ error: 'A user with this email already exists' });
      }
    }

    if (name !== undefined) {
      const existingName = await prisma.user.findUnique({
        where: { name }
      });
      if (existingName && existingName.id !== userId) {
        return res.status(409).json({ error: 'User Name already exists. Please enter a unique User Name.' });
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(password !== undefined && { password: hashPassword(password) }),
        ...(phone !== undefined && { phone }),
        ...(role !== undefined && { role }),
        ...(req.body.permissions !== undefined && { permissions: req.body.permissions }),
      },
    });
    res.json(user);
  } catch (error: any) {
    if (error?.code === 'P2002') {
      const target = error.meta?.target || '';
      if (target.includes('name')) {
        return res.status(409).json({ error: 'User Name already exists. Please enter a unique User Name.' });
      }
      return res.status(409).json({ error: 'A user with this email already exists' });
    }
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete a user
router.delete('/:id', authorizeRoles('SUPER_ADMIN'), async (req, res) => {
  const { id } = req.params;
  try {
    const userId = parseInt(id as string);
    const currentUser = (req as any).user;

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.id === currentUser.id) {
      return res.status(400).json({ error: 'Access denied: You cannot delete your own user account.' });
    }

    if (currentUser?.role === 'MANAGER') {
      if (['SUPER_ADMIN', 'ADMIN'].includes(targetUser.role)) {
        return res.status(403).json({ error: 'Access denied: Managers cannot delete Super Admin or Admin profiles.' });
      }
      // Prevent manager from deleting their own user ID
      if (targetUser.id === currentUser.id) {
        return res.status(403).json({ error: 'Access denied: Managers cannot delete their own profiles.' });
      }
      // Prevent manager from deleting others besides USER profile
      if (targetUser.role !== 'USER') {
        return res.status(403).json({ error: 'Access denied: Managers can only delete User profiles.' });
      }
    }

    await prisma.user.delete({ where: { id: userId } });
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
