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

if (process.env.NODE_ENV !== 'production') {
  app.listen(3000, () => {
    console.log('Server is running on port 3000');
  });
}
