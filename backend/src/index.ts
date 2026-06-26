import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import dns from 'dns';
import * as functions from 'firebase-functions/v2';
import { firebaseAdmin } from './lib/firebase-admin';

// Globally prioritize IPv4 over IPv6 for dns resolution to avoid outbound connection failures
dns.setDefaultResultOrder('ipv4first');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();


app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

import storeRoutes from './routes/stores';
import userRoutes from './routes/users';
import contactRoutes from './routes/contacts';
import authRoutes from './routes/auth';
import systemRoutes from './routes/system';
import globalDocsRoutes from './routes/globalDocs';
import { hashPassword } from './utils/auth';

const DEFAULT_SEED_PASSWORD = process.env.DEFAULT_SEED_PASSWORD || 'Bluetokai@123';
const LEGACY_ADMIN_PASSWORD = '11111';

// Basic health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'NSM Portal Backend is running' });
});

app.get('/api/temp-live-codes', async (req, res) => {
  try {
    const db = firebaseAdmin.firestore();
    const snapshot = await db.collection('stores').get();
    const liveStores = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const code = (data.cafeCode || '').toUpperCase();
      const isTarget = code.startsWith('CA') || code.startsWith('GOT') || code.startsWith('CAGT');
      const isActive = data.isActive !== false;
      const isLive = data.status === 'LIVE';

      if (isActive && isTarget && isLive) {
        liveStores.push({
          cafeCode: data.cafeCode,
          cafeName: data.cafeName
        });
      }
    });

    liveStores.sort((a, b) => a.cafeCode.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    res.json({ count: liveStores.length, codes: liveStores });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.use('/api/stores', storeRoutes);
app.use('/api/users', userRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/global-docs', globalDocsRoutes);

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.resolve(__dirname, '../../frontend/dist')));
  app.get('/*splat', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../../frontend/dist/index.html'));
  });
}

export const api = functions.https.onRequest({ invoker: 'public' }, app);

// Always start the HTTP server so Render (and direct Node.js runs) can serve traffic.
// Firebase Cloud Functions would also handle via the `api` export if deployed there.
const PORT = parseInt(process.env.PORT || '3000', 10);
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
