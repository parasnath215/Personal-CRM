import { Router } from 'express';
import prisma from '../prisma';
import { authenticate } from '../middleware/auth';

const router = Router();

function formatPaymentMode(mode?: string | null): string {
  if (!mode) return 'Cash';
  const lower = mode.toLowerCase();
  if (lower === 'upi') return 'UPI';
  if (lower === 'card') return 'Credit Card';
  if (lower === 'website') return 'Website / Online';
  return mode.charAt(0).toUpperCase() + mode.slice(1);
}

// Helper to synchronize hotel guest payment to Expense/Income transaction
export async function syncGuestIncome(guestId: number, userId?: number) {
  try {
    const guest = await prisma.hotelGuest.findUnique({ where: { id: guestId } });
    if (!guest) return;

    const guestTag = `[Hotel Guest #${guest.id}]`;
    const targetUserId = userId || guest.entered_by;

    const existingExpense = await prisma.expense.findFirst({
      where: {
        category: 'Hotel income',
        note: { contains: guestTag }
      }
    });

    const amount = guest.amount_paid || 0;
    const paymentMode = formatPaymentMode(guest.payment_mode);
    const note = `Hotel Room ${guest.room_number} - ${guest.name} ${guestTag}`;

    if (amount > 0) {
      if (existingExpense) {
        await prisma.expense.update({
          where: { id: existingExpense.id },
          data: {
            amount,
            spent_on: guest.check_in,
            payment_mode: paymentMode,
            note
          }
        });
      } else {
        await prisma.expense.create({
          data: {
            type: 'income',
            category: 'Hotel income',
            amount,
            spent_on: guest.check_in,
            payment_mode: paymentMode,
            note,
            created_by: targetUserId
          }
        });
      }
    } else if (existingExpense) {
      await prisma.expense.delete({ where: { id: existingExpense.id } });
    }
  } catch (err) {
    console.error(`Error syncing hotel income for guest #${guestId}:`, err);
  }
}

// Backfill / sync all existing hotel guests that have amount_paid > 0
export async function syncAllHotelIncome() {
  try {
    const guests = await prisma.hotelGuest.findMany({
      where: { amount_paid: { gt: 0 } }
    });

    for (const guest of guests) {
      await syncGuestIncome(guest.id, guest.entered_by);
    }
  } catch (err) {
    console.error('Error during bulk hotel income sync:', err);
  }
}

// Get hotel guests
router.get('/guests', authenticate, async (req, res) => {
  try {
    // Background sync to ensure all past hotel records have transactions
    syncAllHotelIncome().catch(() => {});

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

    // Auto-register hotel income in Transactions if amount_paid > 0
    await syncGuestIncome(guest.id, userId);

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

    // Auto-sync hotel income in Transactions
    await syncGuestIncome(guestId, userId);

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

    // Remove any registered hotel income transaction linked to this guest
    const guestTag = `[Hotel Guest #${guestId}]`;
    await prisma.expense.deleteMany({
      where: {
        category: 'Hotel income',
        note: { contains: guestTag }
      }
    });

    await prisma.hotelGuest.delete({ where: { id: guestId } });
    res.json({ success: true, message: 'Guest record deleted' });
  } catch (error) {
    console.error('Error deleting guest:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
