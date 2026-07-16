import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get aggregated expenses by category
router.get('/expenses', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    
    // Group by category and sum the amount
    const aggregated = await prisma.expense.groupBy({
      by: ['category'],
      where: { created_by: userId },
      _sum: {
        amount: true
      }
    });

    // Format for Recharts
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

export default router;
