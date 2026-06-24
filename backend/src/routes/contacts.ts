// @ts-nocheck

import express from 'express';
import { authenticateToken, authorizeRoles } from './auth';
import { firebaseAdmin } from '../lib/firebase-admin';

const router = express.Router();
const db = firebaseAdmin.firestore();

router.use(authenticateToken);

// Get all contacts
router.get('/', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE'), async (req, res) => {
  try {
    const snapshot = await db.collection('contacts').get();
    const contacts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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

    const emailLower = email.toLowerCase();
    if (!emailLower.endsWith('@bluetokaicoffee.com') && !emailLower.endsWith('@gottea.in')) {
      return res.status(400).json({ error: 'Please enter a valid email ID. Only email addresses with the domain @bluetokaicoffee.com or @gottea.in are allowed.' });
    }

    if (phone && phone.trim()) {
      const existingPhoneQuery = await db.collection('contacts').where('phone', '==', phone.trim()).get();
      if (!existingPhoneQuery.empty) {
        return res.status(400).json({ error: 'Contact number already exists. Please enter a unique contact number.' });
      }
    }

    const newContact = {
      name,
      designation,
      email: emailLower,
      phone: phone ? phone.trim() : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const docRef = await db.collection('contacts').add(newContact);
    res.status(201).json({ id: docRef.id, ...newContact });
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

    const contactDoc = await db.collection('contacts').doc(id).get();
    if (!contactDoc.exists) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    if (email !== undefined) {
      const emailLower = email.toLowerCase();
      if (!emailLower.endsWith('@bluetokaicoffee.com') && !emailLower.endsWith('@gottea.in')) {
        return res.status(400).json({ error: 'Please enter a valid email ID. Only email addresses with the domain @bluetokaicoffee.com or @gottea.in are allowed.' });
      }
    }

    if (phone !== undefined && phone.trim()) {
      const existingPhoneQuery = await db.collection('contacts').where('phone', '==', phone.trim()).get();
      if (!existingPhoneQuery.empty && existingPhoneQuery.docs[0].id !== id) {
        return res.status(400).json({ error: 'Contact number already exists. Please enter a unique contact number.' });
      }
    }

    const updates: any = { updatedAt: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (designation !== undefined) updates.designation = designation;
    if (email !== undefined) updates.email = email.toLowerCase();
    if (phone !== undefined) updates.phone = phone.trim();

    await db.collection('contacts').doc(id).update(updates);
    
    const updatedDoc = await db.collection('contacts').doc(id).get();
    res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

// Delete a contact
router.delete('/:id', authorizeRoles('SUPER_ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection('contacts').doc(id).delete();
    res.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

export default router;
