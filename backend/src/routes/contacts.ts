// @ts-nocheck

import express from 'express';
import { authenticateToken, authorizeRoles } from './auth';
import { firebaseAdmin } from '../lib/firebase-admin';
import * as XLSX from 'xlsx';
import busboy from 'busboy';

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

// Bulk Download Contacts
router.get('/bulk/download', authorizeRoles('SUPER_ADMIN'), async (req, res) => {
  try {
    const snapshot = await db.collection('contacts').get();
    const contacts = snapshot.docs.map(doc => doc.data());

    const wsData = [
      ['Name', 'Designation', 'Email', 'Contact Number', 'Action']
    ];

    contacts.forEach(c => {
      wsData.push([
        c.name || '',
        c.designation || '',
        c.email || '',
        c.phone || '',
        ''
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contacts");
    
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader('Content-Disposition', `attachment; filename=Contacts_Bulk_Template.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error('Error in bulk download contacts:', error);
    res.status(500).json({ error: 'Failed to download contacts' });
  }
});

// Bulk Upload Contacts
router.post('/bulk/upload', authorizeRoles('SUPER_ADMIN'), async (req: any, res) => {
  try {
    const bb = busboy({ headers: req.headers });
    let fileBuffer: Buffer | null = null;

    bb.on('file', (fieldname, file, info) => {
      const chunks: any[] = [];
      file.on('data', (data) => chunks.push(data));
      file.on('end', () => { fileBuffer = Buffer.concat(chunks); });
    });

    bb.on('finish', async () => {
      if (!fileBuffer) {
        return res.status(400).json({ error: 'No file uploaded.' });
      }

      try {
        const wb = XLSX.read(fileBuffer, { type: 'buffer' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<any>(ws, { header: 1 });

        if (rows.length === 0) {
          return res.status(400).json({ error: 'Uploaded file is empty.' });
        }

        const headers = rows[0];
        const dataRows = rows.slice(1);

        const emailIdx = headers.findIndex(h => h && h.toString().toLowerCase() === 'email');
        const actionIdx = headers.findIndex(h => h && h.toString().toLowerCase() === 'action');
        const nameIdx = headers.findIndex(h => h && h.toString().toLowerCase() === 'name');
        const designationIdx = headers.findIndex(h => h && h.toString().toLowerCase() === 'designation');
        const phoneIdx = headers.findIndex(h => h && h.toString().toLowerCase().trim() === 'contact number');

        if (emailIdx === -1 || actionIdx === -1 || nameIdx === -1 || designationIdx === -1) {
           return res.status(400).json({ error: 'Missing required columns. Please use the exported template.' });
        }

        const results = {
          total: dataRows.length,
          created: 0,
          updated: 0,
          deleted: 0,
          failed: 0,
          errors: [] as any[]
        };

        const existingContactsSnap = await db.collection('contacts').get();
        const existingByEmail = new Map();
        const existingByPhone = new Map();
        existingContactsSnap.docs.forEach(doc => {
           const data = doc.data();
           if (data.email) existingByEmail.set(data.email.toLowerCase(), doc.id);
           if (data.phone) existingByPhone.set(data.phone.trim(), doc.id);
        });

        for (let i = 0; i < dataRows.length; i++) {
          const row = dataRows[i];
          const rowNum = i + 2;
          
          if (!row || row.length === 0 || row.every(c => c === undefined || c === null || c === '')) {
             results.total--; // adjust total if row is entirely empty
             continue; // skip empty rows
          }

          const action = (row[actionIdx] || '').toString().trim();
          const email = (row[emailIdx] || '').toString().trim().toLowerCase();
          const name = (row[nameIdx] || '').toString().trim();
          const designation = (row[designationIdx] || '').toString().trim();
          const phone = phoneIdx !== -1 ? (row[phoneIdx] || '').toString().trim() : '';

          if (!action) {
             results.failed++;
             results.errors.push({ row: rowNum, error: 'Action required' });
             continue;
          }

          if (action.toLowerCase() === 'create') {
             if (!name || !email || !designation) {
                results.failed++;
                results.errors.push({ row: rowNum, error: 'Name, designation, and email are required for Create' });
                continue;
             }
             if (!email.endsWith('@bluetokaicoffee.com') && !email.endsWith('@gottea.in')) {
                results.failed++;
                results.errors.push({ row: rowNum, error: 'Invalid email domain' });
                continue;
             }
             if (existingByEmail.has(email)) {
                results.failed++;
                results.errors.push({ row: rowNum, error: 'Duplicate Email ID' });
                continue;
             }
             if (phone && existingByPhone.has(phone)) {
                results.failed++;
                results.errors.push({ row: rowNum, error: 'Duplicate Contact Number' });
                continue;
             }
             
             const newDocRef = db.collection('contacts').doc();
             await newDocRef.set({
               name, designation, email, phone, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
             });
             existingByEmail.set(email, newDocRef.id);
             if (phone) existingByPhone.set(phone, newDocRef.id);
             results.created++;
             
          } else if (action.toLowerCase() === 'update') {
             if (!email) {
                results.failed++;
                results.errors.push({ row: rowNum, error: 'Email is required to find the contact for Update' });
                continue;
             }
             const docId = existingByEmail.get(email);
             if (!docId) {
                results.failed++;
                results.errors.push({ row: rowNum, error: 'Contact not found for Update' });
                continue;
             }
             
             if (phone && existingByPhone.has(phone) && existingByPhone.get(phone) !== docId) {
                results.failed++;
                results.errors.push({ row: rowNum, error: 'Duplicate Contact Number' });
                continue;
             }

             const updates: any = { updatedAt: new Date().toISOString() };
             if (name) updates.name = name;
             if (designation) updates.designation = designation;
             if (phone) {
               updates.phone = phone;
               existingByPhone.set(phone, docId);
             } else if (phone === '') { // allow clearing phone? Assuming yes.
               updates.phone = null;
             }

             await db.collection('contacts').doc(docId).update(updates);
             results.updated++;
             
          } else if (action.toLowerCase() === 'delete') {
             if (!email) {
                results.failed++;
                results.errors.push({ row: rowNum, error: 'Email is required to find the contact for Delete' });
                continue;
             }
             const docId = existingByEmail.get(email);
             if (!docId) {
                results.failed++;
                results.errors.push({ row: rowNum, error: 'Contact not found for Delete' });
                continue;
             }
             await db.collection('contacts').doc(docId).delete();
             existingByEmail.delete(email);
             if (phone) existingByPhone.delete(phone);
             results.deleted++;
          } else {
             results.failed++;
             results.errors.push({ row: rowNum, error: 'Invalid Action. Must be Create, Update, or Delete' });
          }
        }

        res.json(results);
      } catch (err: any) {
         console.error('Bulk upload processing error:', err);
         res.status(500).json({ error: 'Bulk upload processing failed', message: err.message });
      }
    });

    bb.on('error', (err) => {
       console.error('Busboy error:', err);
       res.status(500).json({ error: 'File upload failed' });
    });

    if (req.rawBody) {
      bb.end(req.rawBody);
    } else {
      req.pipe(bb);
    }
  } catch (error) {
    console.error('Error initializing bulk upload:', error);
    res.status(500).json({ error: 'Failed to process bulk upload' });
  }
});
