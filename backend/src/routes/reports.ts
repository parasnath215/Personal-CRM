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

// Monthly statement for income and expenditure
router.get('/monthly-statement', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { month: targetMonth } = req.query; // optional 'YYYY-MM'

    // Fetch all transactions for the user
    const transactions = await prisma.expense.findMany({
      where: { created_by: userId },
      orderBy: { spent_on: 'desc' }
    });

    // Group transactions by month: 'YYYY-MM'
    const monthGroups: Record<string, typeof transactions> = {};

    transactions.forEach(t => {
      const d = new Date(t.spent_on);
      const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthGroups[mKey]) {
        monthGroups[mKey] = [];
      }
      monthGroups[mKey].push(t);
    });

    // Compute monthly summaries
    const monthlyStatements = Object.keys(monthGroups)
      .sort((a, b) => b.localeCompare(a))
      .map(mKey => {
        const txs = monthGroups[mKey];
        const [yearStr, monthStr] = mKey.split('-');
        const dateObj = new Date(parseInt(yearStr), parseInt(monthStr) - 1, 1);
        const label = dateObj.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

        const incomeTxs = txs.filter(t => t.type === 'income');
        const expenditureTxs = txs.filter(t => (t.type || 'expenditure') === 'expenditure');

        const totalIncome = incomeTxs.reduce((sum, t) => sum + t.amount, 0);
        const totalExpenditure = expenditureTxs.reduce((sum, t) => sum + t.amount, 0);
        const netBalance = totalIncome - totalExpenditure;

        // Categories breakdown
        const incomeCatMap: Record<string, number> = {};
        incomeTxs.forEach(t => {
          incomeCatMap[t.category] = (incomeCatMap[t.category] || 0) + t.amount;
        });

        const expenditureCatMap: Record<string, number> = {};
        expenditureTxs.forEach(t => {
          expenditureCatMap[t.category] = (expenditureCatMap[t.category] || 0) + t.amount;
        });

        return {
          monthKey: mKey,
          label,
          year: parseInt(yearStr),
          month: parseInt(monthStr),
          totalIncome,
          totalExpenditure,
          netBalance,
          transactionCount: txs.length,
          incomeCount: incomeTxs.length,
          expenditureCount: expenditureTxs.length,
          savingsRate: totalIncome > 0 ? Math.round(((totalIncome - totalExpenditure) / totalIncome) * 100) : 0,
          incomeByCategory: Object.entries(incomeCatMap).map(([name, value]) => ({ name, value })),
          expenditureByCategory: Object.entries(expenditureCatMap).map(([name, value]) => ({ name, value })),
          transactions: targetMonth === mKey ? txs : undefined
        };
      });

    // If targetMonth requested and transactions not populated above
    let currentSelectedMonthData = null;
    if (targetMonth && typeof targetMonth === 'string') {
      currentSelectedMonthData = monthlyStatements.find(s => s.monthKey === targetMonth);
      if (currentSelectedMonthData && !currentSelectedMonthData.transactions) {
        currentSelectedMonthData.transactions = monthGroups[targetMonth] || [];
      }
    }

    res.json({
      months: monthlyStatements,
      selectedMonth: currentSelectedMonthData
    });
  } catch (error) {
    console.error('Error fetching monthly statement:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
