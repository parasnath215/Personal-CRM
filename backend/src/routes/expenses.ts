import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { DEFAULT_INCOME_CATEGORIES, DEFAULT_EXPENDITURE_CATEGORIES } from '../seed';

const router = Router();
const prisma = new PrismaClient();

// Get categories (system default + custom user categories)
router.get('/categories', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.userId;

    const dbCategories = await prisma.transactionCategory.findMany({
      where: {
        OR: [
          { is_custom: false },
          { created_by: userId }
        ]
      },
      orderBy: { name: 'asc' }
    });

    const incomeCategories = dbCategories
      .filter(c => c.type === 'income')
      .map(c => ({ id: c.id, name: c.name, type: c.type, is_custom: c.is_custom }));

    const expenditureCategories = dbCategories
      .filter(c => c.type === 'expenditure')
      .map(c => ({ id: c.id, name: c.name, type: c.type, is_custom: c.is_custom }));

    // Fallbacks if database has missing default entries
    const incomeNames = Array.from(new Set([
      ...DEFAULT_INCOME_CATEGORIES,
      ...incomeCategories.map(c => c.name)
    ]));

    const expenditureNames = Array.from(new Set([
      ...DEFAULT_EXPENDITURE_CATEGORIES,
      ...expenditureCategories.map(c => c.name)
    ]));

    const formatList = (catList: any[], defaultNames: string[], typeStr: string) => {
      const existingNames = new Set(catList.map(c => c.name));
      const fullList = [...catList];
      defaultNames.forEach(n => {
        if (!existingNames.has(n)) {
          fullList.push({ id: null, name: n, type: typeStr, is_custom: false });
        }
      });
      return fullList.sort((a, b) => a.name.localeCompare(b.name));
    };

    res.json({
      income: formatList(incomeCategories, DEFAULT_INCOME_CATEGORIES, 'income'),
      expenditure: formatList(expenditureCategories, DEFAULT_EXPENDITURE_CATEGORIES, 'expenditure')
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add custom category
router.post('/categories', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { name, type } = req.body;

    if (!name || !type || !['income', 'expenditure'].includes(type)) {
      return res.status(400).json({ error: 'Name and valid type (income or expenditure) are required.' });
    }

    const trimmedName = name.trim();

    const existing = await prisma.transactionCategory.findFirst({
      where: { name: trimmedName, type }
    });

    if (existing) {
      return res.status(400).json({ error: `Category "${trimmedName}" already exists for ${type}.` });
    }

    const category = await prisma.transactionCategory.create({
      data: {
        name: trimmedName,
        type,
        is_custom: true,
        created_by: userId
      }
    });

    res.json(category);
  } catch (error) {
    console.error('Error creating custom category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete custom category
router.delete('/categories/:id', authenticate, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const userId = (req as any).user.userId;

    const category = await prisma.transactionCategory.findUnique({ where: { id } });
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    if (!category.is_custom || (category.created_by && category.created_by !== userId)) {
      return res.status(403).json({ error: 'Cannot delete default category or category created by another user' });
    }

    await prisma.transactionCategory.delete({ where: { id } });
    res.json({ success: true, message: 'Category deleted' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get transactions (income & expenditure)
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { type } = req.query;

    const whereClause: any = { created_by: userId };
    if (type && type !== 'all') {
      whereClause.type = type as string;
    }

    const expenses = await prisma.expense.findMany({
      where: whereClause,
      orderBy: { spent_on: 'desc' }
    });
    res.json(expenses);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a transaction (Income or Expenditure)
router.post('/', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { amount, category, note, spent_on, payment_mode, type } = req.body;

    const transactionType = type && ['income', 'expenditure'].includes(type) ? type : 'expenditure';

    const expense = await prisma.expense.create({
      data: {
        type: transactionType,
        amount: parseFloat(amount),
        category: category || 'Other',
        note,
        spent_on: new Date(spent_on),
        payment_mode: payment_mode || 'Cash',
        created_by: userId
      }
    });

    res.json(expense);
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a transaction
router.put('/:id', authenticate, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const userId = (req as any).user.userId;
    const { amount, category, note, spent_on, payment_mode, type } = req.body;

    const existing = await prisma.expense.findFirst({
      where: { id, created_by: userId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const updated = await prisma.expense.update({
      where: { id },
      data: {
        type: type ? type : existing.type,
        amount: amount !== undefined ? parseFloat(amount) : existing.amount,
        category: category || existing.category,
        note: note !== undefined ? note : existing.note,
        spent_on: spent_on ? new Date(spent_on) : existing.spent_on,
        payment_mode: payment_mode || existing.payment_mode
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a transaction
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const userId = (req as any).user.userId;

    const existing = await prisma.expense.findFirst({
      where: { id, created_by: userId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    await prisma.expense.delete({ where: { id } });
    res.json({ success: true, message: 'Transaction deleted' });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
