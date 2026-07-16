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
import './cron'; // Initialize background cron jobs

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/goals', goalsRoutes);
app.use('/api/hotel', hotelRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
