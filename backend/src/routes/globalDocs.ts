// @ts-nocheck

import express from 'express';
import { authenticateToken, authorizeRoles } from './auth';
import { firebaseAdmin } from '../lib/firebase-admin';

const router = express.Router();
const db = firebaseAdmin.firestore();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all documents (links)
router.get('/', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const snapshot = await db.collection('globalDocuments').orderBy('uploadedAt', 'desc').get();
    const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(docs);
  } catch (error) {
    console.error('Failed to fetch documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Add a new link
router.post('/add-link', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { category, linkName, linkUrl } = req.body;
    if (!category) {
      return res.status(400).json({ error: 'Category is required' });
    }
    if (!linkUrl) {
      return res.status(400).json({ error: 'Link URL is required' });
    }

    const newDoc = {
      category,
      fileName: linkName || linkUrl,
      fileUrl: linkUrl,
      uploadedAt: new Date().toISOString()
    };

    const docRef = await db.collection('globalDocuments').add(newDoc);

    // Audit log in storageFiles
    try {
      await db.collection('storageFiles').add({
        storeId: 'global',
        cafeCode: 'Global',
        cafeName: 'Global Documents',
        fileName: newDoc.fileName,
        fileUrl: newDoc.fileUrl,
        docType: 'global_document',
        category: newDoc.category,
        uploadedBy: req.user?.email || 'System',
        uploadedAt: newDoc.uploadedAt,
        status: 'Live'
      });
    } catch (auditErr) {
      console.error('Failed to audit log global document upload:', auditErr);
    }

    res.status(201).json({ id: docRef.id, ...newDoc });
  } catch (error) {
    console.error('Failed to add link:', error);
    res.status(500).json({ error: 'Failed to add link' });
  }
});

// Update a link
router.put('/:id', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'MANAGER'), async (req, res) => {
  const { id } = req.params;
  try {
    const { category, linkName, linkUrl } = req.body;
    if (!category) {
      return res.status(400).json({ error: 'Category is required' });
    }
    if (!linkUrl) {
      return res.status(400).json({ error: 'Link URL is required' });
    }

    const updates = {
      category,
      fileName: linkName || linkUrl,
      fileUrl: linkUrl
    };

    await db.collection('globalDocuments').doc(id).update(updates);
    
    const updatedDoc = await db.collection('globalDocuments').doc(id).get();
    res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (error) {
    console.error('Failed to update link:', error);
    res.status(500).json({ error: 'Failed to update link' });
  }
});

// Delete a document/link
router.delete('/:id', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'MANAGER'), async (req, res) => {
  const { id } = req.params;
  try {
    const docRef = db.collection('globalDocuments').doc(id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return res.status(404).json({ error: 'Link not found' });
    }

    const docData = docSnap.data() || {};
    const fileUrl = docData.fileUrl;

    await docRef.delete();

    // Audit log in storageFiles
    if (fileUrl) {
      try {
        const storageSnapshot = await db.collection('storageFiles').where('fileUrl', '==', fileUrl).get();
        if (!storageSnapshot.empty) {
          const batch = db.batch();
          storageSnapshot.forEach(item => {
            batch.update(db.collection('storageFiles').doc(item.id), {
              status: 'Deleted',
              deletedBy: req.user?.email || 'System',
              deletedAt: new Date().toISOString()
            });
          });
          await batch.commit();
        } else {
          // If no record exists (e.g. legacy file), create a deleted record
          await db.collection('storageFiles').add({
            storeId: 'global',
            cafeCode: 'Global',
            cafeName: 'Global Documents',
            fileName: docData.fileName || docData.fileUrl || 'Global Document',
            fileUrl,
            docType: 'global_document',
            category: docData.category || 'Images & Docs',
            uploadedBy: 'System',
            uploadedAt: docData.uploadedAt || new Date().toISOString(),
            status: 'Deleted',
            deletedBy: req.user?.email || 'System',
            deletedAt: new Date().toISOString()
          });
        }
      } catch (auditErr) {
        console.error('Failed to audit log global document deletion:', auditErr);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete link:', error);
    res.status(500).json({ error: 'Failed to delete link' });
  }
});

export default router;
