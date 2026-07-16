import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get expenses (with optional month/year filter)
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const expenses = await prisma.expense.findMany({
      where: { created_by: userId },
      orderBy: { spent_on: 'desc' }
    });
    res.json(expenses);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create an expense
router.post('/', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { amount, category, note, spent_on, payment_mode } = req.body;

    const expense = await prisma.expense.create({
      data: {
        amount: parseFloat(amount),
        category,
        note,
        spent_on: new Date(spent_on),
        payment_mode,
        created_by: userId
      }
    });

    res.json(expense);
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
