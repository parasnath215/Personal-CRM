import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Get hotel guests
router.get('/guests', authenticate, async (req, res) => {
  try {
    const guests = await prisma.hotelGuest.findMany({
      orderBy: { check_in: 'desc' }
    });
    res.json(guests);
  } catch (error) {
    console.error('Error fetching guests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create hotel guest
router.post('/guests', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { name, phone, id_proof_type, id_proof_number, check_in, check_out, room_number } = req.body;
    
    const guest = await prisma.hotelGuest.create({
      data: {
        name,
        phone,
        id_proof_type,
        id_proof_number,
        check_in: new Date(check_in),
        check_out: check_out ? new Date(check_out) : null,
        room_number,
        entered_by: userId
      }
    });
    res.json(guest);
  } catch (error) {
    console.error('Error creating guest:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
