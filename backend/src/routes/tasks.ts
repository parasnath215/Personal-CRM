import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get ALL tasks (for full view page)
router.get('/all', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const tasks = await prisma.task.findMany({
      where: { created_by: userId },
      orderBy: { event_date: 'asc' }
    });
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching all tasks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get tasks for a specific date (default today - for Dashboard)
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const dateQuery = req.query.date ? new Date(req.query.date as string) : new Date();
    
    dateQuery.setUTCHours(0, 0, 0, 0);

    const tasks = await prisma.task.findMany({
      where: {
        created_by: userId,
        OR: [
          { event_date: dateQuery },
          { carried_forward_to: dateQuery }
        ]
      },
      orderBy: { created_at: 'asc' }
    });

    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new task
router.post('/', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { title, description, event_date } = req.body;

    const task = await prisma.task.create({
      data: {
        title,
        description,
        event_date: new Date(event_date),
        status: 'pending',
        created_by: userId
      }
    });

    res.json(task);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update task status (done, cancelled, carry_forward)
router.patch('/:id/status', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const taskId = parseInt(req.params.id);
    const { status, carried_forward_to } = req.body;

    // Verify ownership
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task || task.created_by !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        status,
        ...(carried_forward_to && { carried_forward_to: new Date(carried_forward_to) })
      }
    });

    res.json(updatedTask);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
