import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, authorizeRoles } from './auth';

const router = express.Router();
const prisma = new PrismaClient();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all documents (links)
router.get('/', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const docs = await prisma.globalDocument.findMany({
      orderBy: { uploadedAt: 'desc' }
    });
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

    const newDoc = await prisma.globalDocument.create({
      data: {
        category,
        fileName: linkName || linkUrl,
        fileUrl: linkUrl
      }
    });

    res.status(201).json(newDoc);
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

    const updatedDoc = await prisma.globalDocument.update({
      where: { id: parseInt(id as string) },
      data: {
        category,
        fileName: linkName || linkUrl,
        fileUrl: linkUrl
      }
    });

    res.json(updatedDoc);
  } catch (error) {
    console.error('Failed to update link:', error);
    res.status(500).json({ error: 'Failed to update link' });
  }
});

// Delete a document/link
router.delete('/:id', authorizeRoles('SUPER_ADMIN', 'ADMIN', 'MANAGER'), async (req, res) => {
  const { id } = req.params;
  try {
    const doc = await prisma.globalDocument.findUnique({ where: { id: parseInt(id as string) } });
    if (!doc) {
      return res.status(404).json({ error: 'Link not found' });
    }

    await prisma.globalDocument.delete({ where: { id: parseInt(id as string) } });
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete link:', error);
    res.status(500).json({ error: 'Failed to delete link' });
  }
});

export default router;
