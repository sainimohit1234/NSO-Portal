import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, authorizeRoles } from './auth';

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticateToken);

// Get all contacts
router.get('/', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE'), async (req, res) => {
  try {
    const contacts = await prisma.contact.findMany();
    res.json(contacts);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

// Create a new contact
router.post('/', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { name, designation, email, phone } = req.body;
    if (!name || !email || !designation) {
      return res.status(400).json({ error: 'Name, designation, and email are required' });
    }

    // Email domain validation
    const emailLower = email.toLowerCase();
    if (!emailLower.endsWith('@bluetokaicoffee.com') && !emailLower.endsWith('@gottea.in')) {
      return res.status(400).json({ error: 'Please enter a valid email ID. Only email addresses with the domain @bluetokaicoffee.com or @gottea.in are allowed.' });
    }

    // Contact number uniqueness check
    if (phone && phone.trim()) {
      const existingPhone = await prisma.contact.findFirst({
        where: { phone: phone.trim() }
      });
      if (existingPhone) {
        return res.status(400).json({ error: 'Contact number already exists. Please enter a unique contact number.' });
      }
    }

    const newContact = await prisma.contact.create({
      data: { name, designation, email, phone }
    });
    res.status(201).json(newContact);
  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(500).json({ error: 'Failed to create contact' });
  }
});

// Update a contact
router.put('/:id', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, designation, email, phone } = req.body;

    if (email !== undefined) {
      // Email domain validation
      const emailLower = email.toLowerCase();
      if (!emailLower.endsWith('@bluetokaicoffee.com') && !emailLower.endsWith('@gottea.in')) {
        return res.status(400).json({ error: 'Please enter a valid email ID. Only email addresses with the domain @bluetokaicoffee.com or @gottea.in are allowed.' });
      }
    }

    // Contact number uniqueness check
    if (phone !== undefined && phone.trim()) {
      const existingPhone = await prisma.contact.findFirst({
        where: {
          phone: phone.trim(),
          NOT: { id: parseInt(id as string, 10) }
        }
      });
      if (existingPhone) {
        return res.status(400).json({ error: 'Contact number already exists. Please enter a unique contact number.' });
      }
    }

    const updatedContact = await prisma.contact.update({
      where: { id: parseInt(id as string, 10) },
      data: {
        ...(name !== undefined && { name }),
        ...(designation !== undefined && { designation }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone })
      }
    });
    res.json(updatedContact);
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

// Delete a contact
router.delete('/:id', authorizeRoles('SUPER_ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.contact.delete({
      where: { id: parseInt(id as string, 10) }
    });
    res.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

export default router;
