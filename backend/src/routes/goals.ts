import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get goals with progress
router.get('/', authenticate, async (req, res) => {
  try {
    const goals = await prisma.goal.findMany({
      include: {
        progress: true
      }
    });
    res.json(goals);
  } catch (error) {
    console.error('Error fetching goals:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a goal
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, target_amount, target_date, category } = req.body;
    const goal = await prisma.goal.create({
      data: {
        title,
        target_amount: parseFloat(target_amount),
        target_date: new Date(target_date),
        category
      }
    });
    res.json(goal);
  } catch (error) {
    console.error('Error creating goal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add progress
router.post('/:id/progress', authenticate, async (req, res) => {
  try {
    const goalId = parseInt(req.params.id as string);
    const { month, amount_achieved, note } = req.body;
    
    const progress = await prisma.goalProgress.create({
      data: {
        goal_id: goalId,
        month,
        amount_achieved: parseFloat(amount_achieved),
        note
      }
    });
    res.json(progress);
  } catch (error) {
    console.error('Error adding goal progress:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a goal
router.put('/:id', authenticate, async (req, res) => {
  try {
    const goalId = parseInt(req.params.id as string);
    const { title, target_amount, target_date, category } = req.body;

    const existing = await prisma.goal.findUnique({ where: { id: goalId } });
    if (!existing) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    const updatedGoal = await prisma.goal.update({
      where: { id: goalId },
      data: {
        ...(title && { title: title.trim() }),
        ...(target_amount !== undefined && { target_amount: parseFloat(target_amount) }),
        ...(target_date && { target_date: new Date(target_date) }),
        ...(category !== undefined && { category })
      },
      include: {
        progress: true
      }
    });

    res.json(updatedGoal);
  } catch (error) {
    console.error('Error updating goal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a goal
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const goalId = parseInt(req.params.id as string);

    const existing = await prisma.goal.findUnique({ where: { id: goalId } });
    if (!existing) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    await prisma.goal.delete({ where: { id: goalId } });
    res.json({ message: 'Goal deleted successfully' });
  } catch (error) {
    console.error('Error deleting goal:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
