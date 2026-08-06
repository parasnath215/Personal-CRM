import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import tasksRoutes from './routes/tasks';
import contactsRoutes from './routes/contacts';
import expensesRoutes from './routes/expenses';
import reportsRoutes from './routes/reports';
import settingsRoutes from './routes/settings';
import goalsRoutes from './routes/goals';
import hotelRoutes from './routes/hotel';
import whatsappRoutes from './routes/whatsapp';
import whatsappService from './services/whatsapp';
import { ensureAdminUserExists } from './seed';
import path from 'path';
import fs from 'fs';
import './cron'; // Initialize background cron jobs

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Health Check Endpoint (Used for Keep-Awake / Monitoring)
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    message: 'Backend server is active and healthy'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/goals', goalsRoutes);
app.use('/api/hotel', hotelRoutes);
app.use('/api/whatsapp', whatsappRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);

  // Automatically ensure admin user exists on server start
  await ensureAdminUserExists();

  // Auto-initialize WhatsApp if a saved session is found
  const sessionPath = path.join(__dirname, '../.wwebjs_auth/session-crm-session');
  if (fs.existsSync(sessionPath)) {
    console.log('Saved WhatsApp session found. Auto-initializing WhatsApp client...');
    whatsappService.initialize();
  }
});
