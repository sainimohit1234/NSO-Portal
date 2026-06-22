import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import dns from 'dns';
import { PrismaClient } from '@prisma/client';

// Globally prioritize IPv4 over IPv6 for dns resolution to avoid outbound connection failures
dns.setDefaultResultOrder('ipv4first');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 5001;

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

// Seeding logic for users if the database is empty
async function seedUsers() {
  try {
    const count = await prisma.user.count();
    if (count === 0) {
      console.log('No users found in database, seeding default users...');
      const defaultPasswordHash = hashPassword('Bluetokai@123');
      await prisma.user.createMany({
        data: [
          { name: 'Super Admin', email: 'admin@bluetokaicoffee.com', password: hashPassword('11111'), phone: '9999900001', role: 'SUPER_ADMIN' },
          { name: 'Aarav Mehta', email: 'aarav.mehta@bluetokaicoffee.com', password: defaultPasswordHash, phone: '9810011001', role: 'MANAGER' },
          { name: 'Ananya Sharma', email: 'ananya.sharma@bluetokaicoffee.com', password: defaultPasswordHash, phone: '9810011002', role: 'MANAGER' },
          { name: 'Kabir Singh', email: 'kabir.singh@bluetokaicoffee.com', password: defaultPasswordHash, phone: '9810011003', role: 'MANAGER' },
          { name: 'Rohan Gupta', email: 'rohan.gupta@bluetokaicoffee.com', password: defaultPasswordHash, phone: '9810011004', role: 'USER' },
          { name: 'Pooja Patel', email: 'pooja.patel@bluetokaicoffee.com', password: defaultPasswordHash, phone: '9810011005', role: 'USER' },
        ],
      });
      console.log('Seeding completed successfully.');
    }
  } catch (error) {
    console.error('Error seeding users:', error);
  }
}

// Initialize lastLoginAt for any existing users who have never logged in since the column was added
async function initializeLastLogin() {
  try {
    const usersToUpdate = await prisma.user.findMany({
      where: { lastLoginAt: null }
    });
    if (usersToUpdate.length > 0) {
      console.log(`Initializing lastLoginAt to createdAt for ${usersToUpdate.length} existing users...`);
      for (const u of usersToUpdate) {
        await prisma.user.update({
          where: { id: u.id },
          data: { lastLoginAt: u.createdAt }
        });
      }
      console.log('Successfully initialized lastLoginAt for existing users.');
    }
  } catch (error) {
    console.error('Error initializing lastLoginAt for existing users:', error);
  }
}

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.resolve(__dirname, '../../frontend/dist')));
  app.get('/*splat', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../../frontend/dist/index.html'));
  });
}

app.listen(port, async () => {
  console.log(`Server is running on port ${port}`);
  await seedUsers();
  await initializeLastLogin();
});

