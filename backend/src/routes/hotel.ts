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
    const { 
      name, 
      phone, 
      id_proof_type, 
      id_proof_number, 
      check_in, 
      check_out, 
      room_number,
      booking_source,
      payment_mode,
      amount_paid,
      status
    } = req.body;
    
    const guest = await prisma.hotelGuest.create({
      data: {
        name: name?.trim(),
        phone: phone?.trim(),
        id_proof_type: id_proof_type || 'Aadhaar Card',
        id_proof_number: id_proof_number?.trim() || null,
        check_in: check_in ? new Date(check_in) : new Date(),
        check_out: check_out ? new Date(check_out) : null,
        room_number: String(room_number).trim(),
        booking_source: booking_source || 'offline',
        payment_mode: payment_mode || 'cash',
        amount_paid: amount_paid !== undefined && amount_paid !== '' ? parseFloat(amount_paid) : 0,
        status: status || 'checked_in',
        entered_by: userId
      }
    });
    res.json(guest);
  } catch (error) {
    console.error('Error creating guest:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update hotel guest
router.put('/guests/:id', authenticate, async (req, res) => {
  try {
    const guestId = parseInt(req.params.id as string);
    const { 
      name, 
      phone, 
      id_proof_type, 
      id_proof_number, 
      check_in, 
      check_out, 
      room_number,
      booking_source,
      payment_mode,
      amount_paid,
      status
    } = req.body;

    const existing = await prisma.hotelGuest.findUnique({ where: { id: guestId } });
    if (!existing) {
      return res.status(404).json({ error: 'Guest record not found' });
    }

    const updated = await prisma.hotelGuest.update({
      where: { id: guestId },
      data: {
        ...(name && { name: name.trim() }),
        ...(phone && { phone: phone.trim() }),
        ...(id_proof_type !== undefined && { id_proof_type }),
        ...(id_proof_number !== undefined && { id_proof_number: id_proof_number?.trim() || null }),
        ...(check_in && { check_in: new Date(check_in) }),
        ...(check_out !== undefined && { check_out: check_out ? new Date(check_out) : null }),
        ...(room_number && { room_number: String(room_number).trim() }),
        ...(booking_source !== undefined && { booking_source }),
        ...(payment_mode !== undefined && { payment_mode }),
        ...(amount_paid !== undefined && { amount_paid: amount_paid !== '' ? parseFloat(amount_paid) : 0 }),
        ...(status !== undefined && { status })
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating guest:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete hotel guest
router.delete('/guests/:id', authenticate, async (req, res) => {
  try {
    const guestId = parseInt(req.params.id as string);
    const existing = await prisma.hotelGuest.findUnique({ where: { id: guestId } });
    if (!existing) {
      return res.status(404).json({ error: 'Guest record not found' });
    }

    await prisma.hotelGuest.delete({ where: { id: guestId } });
    res.json({ success: true, message: 'Guest record deleted' });
  } catch (error) {
    console.error('Error deleting guest:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
