import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import dns from 'dns';
import fs from 'fs';
import * as functions from 'firebase-functions/v2';
import { firebaseAdmin, getActiveBucket } from './lib/firebase-admin';

// v2 - Updated MANDATORY_FIELDS: removed launchStatus

// Globally prioritize IPv4 over IPv6 for dns resolution to avoid outbound connection failures
dns.setDefaultResultOrder('ipv4first');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();

// The SPA calls the API same-origin via the Firebase Hosting rewrite, so only a
// small set of origins ever legitimately makes cross-origin calls. Extra origins
// (e.g. a custom domain) can be added via the CORS_ALLOWED_ORIGINS env var
// (comma-separated). Requests with no Origin header (same-origin, curl,
// server-to-server) are always allowed.
const allowedOrigins = [
  'https://nso-portal.web.app',
  'https://nso-portal.firebaseapp.com',
  'http://localhost:5173',
  'http://localhost:3000',
  'https://nso.bluetokaicoffee.com',
  ...(process.env.CORS_ALLOWED_ORIGINS
    ? process.env.CORS_ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
    : []),
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
  })
);

// Baseline security headers (dependency-free; equivalent to the parts of helmet
// that are safe for a JSON API).
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

app.use(express.json({ limit: '50mb' }));

app.get('/uploads/:filename', async (req, res) => {
  res.removeHeader('X-Frame-Options');
  const { filename } = req.params;
  const localPath = path.resolve(process.cwd(), 'uploads', filename);

  if (fs.existsSync(localPath)) {
    return res.sendFile(localPath);
  }

  // If not local, stream from Google Cloud Storage
  try {
    const bucket = await getActiveBucket();
    const storageFile = bucket.file(`NSO DATA/${filename}`);
    const [exists] = await storageFile.exists();

    if (exists) {
      const [metadata] = await storageFile.getMetadata();
      res.setHeader('Content-Type', metadata.contentType || 'application/octet-stream');
      
      const stream = storageFile.createReadStream();
      stream.on('error', (err) => {
        console.error(`Error streaming GCS file NSO DATA/${filename}:`, err);
        if (!res.headersSent) {
          res.status(500).send('Error retrieving file');
        }
      });
      return stream.pipe(res);
    }
  } catch (err) {
    console.error(`Error retrieving GCS file NSO DATA/${filename}:`, err);
  }

  return res.status(404).send('Not Found');
});

import storeRoutes from './routes/stores';
import userRoutes from './routes/users';
import contactRoutes from './routes/contacts';
import systemRoutes from './routes/system';
import globalDocsRoutes from './routes/globalDocs';

// Basic health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'NSM Portal Backend is running' });
});


app.use('/api/stores', storeRoutes);
app.use('/api/users', userRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/global-docs', globalDocsRoutes);

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.resolve(__dirname, '../../frontend/dist')));
  app.get('/*splat', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../../frontend/dist/index.html'));
  });
}

export const api: functions.https.HttpsFunction = functions.https.onRequest({
  invoker: 'public',
  memory: '1GiB',
  timeoutSeconds: 300
}, app as any);

// Firebase Cloud Functions (Gen 2) runs on Cloud Run and manages its own HTTP server.
// Calling app.listen() there causes EADDRINUSE because the port is already in use.
// Only bind a port when running locally or on a direct-Node.js host (e.g. Render).
const isCloudFunctions = !!process.env.K_SERVICE || !!process.env.FUNCTION_TARGET;
if (!isCloudFunctions) {
  const PORT = parseInt(process.env.PORT || '3000', 10);
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

