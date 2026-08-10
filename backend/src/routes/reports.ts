import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get aggregated expenses by category (backward compatibility)
router.get('/expenses', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    
    const aggregated = await prisma.expense.groupBy({
      by: ['category'],
      where: {
        created_by: userId,
        type: 'expenditure'
      },
      _sum: {
        amount: true
      }
    });

    const data = aggregated.map(item => ({
      name: item.category,
      value: item._sum.amount || 0
    }));

    res.json(data);
  } catch (error) {
    console.error('Error aggregating expenses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Comprehensive financial reports endpoint (Income & Expenditure)
router.get('/financials', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.userId;

    const [incomeGroup, expenditureGroup] = await Promise.all([
      prisma.expense.groupBy({
        by: ['category'],
        where: { created_by: userId, type: 'income' },
        _sum: { amount: true }
      }),
      prisma.expense.groupBy({
        by: ['category'],
        where: { created_by: userId, type: 'expenditure' },
        _sum: { amount: true }
      })
    ]);

    const incomeByCategory = incomeGroup.map(item => ({
      name: item.category,
      value: item._sum.amount || 0
    }));

    const expenditureByCategory = expenditureGroup.map(item => ({
      name: item.category,
      value: item._sum.amount || 0
    }));

    const totalIncome = incomeByCategory.reduce((sum, item) => sum + item.value, 0);
    const totalExpenditure = expenditureByCategory.reduce((sum, item) => sum + item.value, 0);
    const netBalance = totalIncome - totalExpenditure;

    res.json({
      totalIncome,
      totalExpenditure,
      netBalance,
      incomeByCategory,
      expenditureByCategory
    });
  } catch (error) {
    console.error('Error fetching financial reports:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
