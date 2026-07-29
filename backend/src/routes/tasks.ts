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

// Get task calendar summary counts for a given month/year
router.get('/calendar-summary', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const month = parseInt(req.query.month as string) || (new Date().getMonth() + 1); // 1-indexed

    // Start and end of month in UTC/Local
    const startOfMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const tasks = await prisma.task.findMany({
      where: {
        created_by: userId,
        OR: [
          {
            event_date: {
              gte: startOfMonth,
              lte: endOfMonth
            }
          },
          {
            carried_forward_to: {
              gte: startOfMonth,
              lte: endOfMonth
            }
          }
        ]
      }
    });

    // Group task count by YYYY-MM-DD
    const summary: Record<string, { total: number; pending: number; done: number; carried: number }> = {};

    tasks.forEach(task => {
      const activeDate = task.carried_forward_to || task.event_date;
      const dateKey = activeDate.toISOString().split('T')[0];

      if (!summary[dateKey]) {
        summary[dateKey] = { total: 0, pending: 0, done: 0, carried: 0 };
      }

      summary[dateKey].total += 1;
      if (task.status === 'done') {
        summary[dateKey].done += 1;
      } else if (task.status === 'carried_forward') {
        summary[dateKey].carried += 1;
      } else {
        summary[dateKey].pending += 1;
      }
    });

    res.json(summary);
  } catch (error) {
    console.error('Error fetching calendar summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get tasks for a specific date (default today - for Dashboard)
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const targetDate = req.query.date ? new Date(req.query.date as string) : new Date();

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const tasks = await prisma.task.findMany({
      where: {
        created_by: userId,
        OR: [
          {
            event_date: {
              gte: startOfDay,
              lte: endOfDay
            }
          },
          {
            carried_forward_to: {
              gte: startOfDay,
              lte: endOfDay
            }
          }
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

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Task title is required' });
    }

    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        event_date: event_date ? new Date(event_date) : new Date(),
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

// Full update of task (title, description, event_date, status)
router.put('/:id', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const taskId = parseInt(req.params.id);
    const { title, description, event_date, status, carried_forward_to } = req.body;

    const existingTask = await prisma.task.findUnique({ where: { id: taskId } });
    if (!existingTask || existingTask.created_by !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        ...(title && { title: title.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(event_date && { event_date: new Date(event_date) }),
        ...(status && { status }),
        ...(carried_forward_to !== undefined && { 
          carried_forward_to: carried_forward_to ? new Date(carried_forward_to) : null 
        })
      }
    });

    res.json(updatedTask);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update task status (done, cancelled, carried_forward)
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
        ...(carried_forward_to !== undefined && {
          carried_forward_to: carried_forward_to ? new Date(carried_forward_to) : null
        })
      }
    });

    res.json(updatedTask);
  } catch (error) {
    console.error('Error updating task status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a task
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const taskId = parseInt(req.params.id);

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task || task.created_by !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.task.delete({ where: { id: taskId } });

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
