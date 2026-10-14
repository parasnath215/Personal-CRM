import { Router } from 'express';
import prisma from '../prisma';
import { authenticate, requireRole } from '../middleware/auth';
import bcrypt from 'bcryptjs';

const router = Router();

// Get all users (Admin only)
router.get('/users', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, created_at: true }
    });
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create user (Admin only)
router.post('/users', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, role }
    });
    
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user (Admin only)
router.put('/users/:id', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const { name, email, role, password } = req.body;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (email && email.trim() !== existing.email) {
      const emailTaken = await prisma.user.findUnique({ where: { email: email.trim() } });
      if (emailTaken && emailTaken.id !== id) {
        return res.status(400).json({ error: 'Email is already used by another user' });
      }
    }

    const updateData: any = {};
    if (name && name.trim()) updateData.name = name.trim();
    if (email && email.trim()) updateData.email = email.trim();
    if (role && ['admin', 'hotel_staff', 'accountant'].includes(role)) {
      updateData.role = role;
    }
    if (password && password.trim().length > 0) {
      updateData.password = await bcrypt.hash(password.trim(), 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, email: true, name: true, role: true, created_at: true }
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user (Admin only)
router.delete('/users/:id', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const currentAdminId = (req as any).user.userId;

    if (id === currentAdminId) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Safely reassign linked records to current admin to prevent foreign key errors
    await prisma.expense.updateMany({
      where: { created_by: id },
      data: { created_by: currentAdminId }
    });
    await prisma.task.updateMany({
      where: { created_by: id },
      data: { created_by: currentAdminId }
    });
    await prisma.hotelGuest.updateMany({
      where: { entered_by: id },
      data: { entered_by: currentAdminId }
    });

    await prisma.user.delete({ where: { id } });
    res.json({ success: true, message: `User "${existing.name}" deleted successfully` });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
