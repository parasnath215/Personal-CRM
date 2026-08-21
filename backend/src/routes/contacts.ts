import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import multer from 'multer';
// @ts-ignore
import vcard from 'vcard-parser';
import fs from 'fs';
import { executeDailyWishesAndReminders } from '../cron';

const router = Router();
const prisma = new PrismaClient();
const upload = multer({ dest: 'uploads/' });

// Get all contacts
router.get('/', authenticate, async (req, res) => {
  try {
    const contacts = await prisma.contact.findMany({
      include: {
        familyMembers: true
      },
      orderBy: { created_at: 'desc' }
    });
    res.json(contacts);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Import VCF
router.post('/import', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const vcfData = fs.readFileSync(req.file.path, 'utf8');
    const vcards = vcfData.split('BEGIN:VCARD').filter(v => v.trim().length > 0).map(v => 'BEGIN:VCARD' + v);
    
    let importedCount = 0;
    let skippedCount = 0;

    for (const vcfString of vcards) {
      const parsedCard = vcard.parse(vcfString);
      
      const fn = parsedCard.fn?.[0]?.value || '';
      const tel = parsedCard.tel?.[0]?.value || '';
      const email = parsedCard.email?.[0]?.value || null;
      const org = parsedCard.org?.[0]?.value || null;
      const bday = parsedCard.bday?.[0]?.value || null;

      const cleanPhone = tel.replace(/[^\d+]/g, '');

      if (!fn || !cleanPhone) {
        skippedCount++;
        continue;
      }

      const existing = await prisma.contact.findUnique({ where: { phone: cleanPhone } });
      if (existing) {
        skippedCount++;
        continue;
      }

      await prisma.contact.create({
        data: {
          name: fn,
          phone: cleanPhone,
          email,
          tags: org ? `Org: ${org}` : null,
          date_of_birth: bday ? new Date(bday) : null
        }
      });
      importedCount++;
    }

    if (req.file) fs.unlinkSync(req.file.path);
    res.json({ message: 'Import complete', importedCount, skippedCount });
  } catch (error) {
    console.error('Error importing VCF:', error);
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a contact
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, phone, email, tags, date_of_birth, marriage_anniversary } = req.body;
    
    const existing = await prisma.contact.findUnique({ where: { phone } });
    if (existing) {
      return res.status(400).json({ error: 'Contact with this phone number already exists' });
    }

    const contact = await prisma.contact.create({
      data: {
        name,
        phone,
        email,
        tags,
        date_of_birth: date_of_birth ? new Date(date_of_birth) : null,
        marriage_anniversary: marriage_anniversary ? new Date(marriage_anniversary) : null
      }
    });
    res.json(contact);
  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a contact
router.put('/:id', authenticate, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const { name, phone, email, tags, date_of_birth, marriage_anniversary } = req.body;

    const existing = await prisma.contact.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    const updated = await prisma.contact.update({
      where: { id },
      data: {
        name: name || existing.name,
        phone: phone || existing.phone,
        email: email !== undefined ? email : existing.email,
        tags: tags !== undefined ? tags : existing.tags,
        date_of_birth: date_of_birth !== undefined ? (date_of_birth ? new Date(date_of_birth) : null) : existing.date_of_birth,
        marriage_anniversary: marriage_anniversary !== undefined ? (marriage_anniversary ? new Date(marriage_anniversary) : null) : existing.marriage_anniversary
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a contact
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    await prisma.contact.delete({ where: { id } });
    res.json({ success: true, message: 'Contact deleted' });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add Family Member
router.post('/:id/family', authenticate, async (req, res) => {
  try {
    const contactId = parseInt(req.params.id as string);
    const { relation, full_name, date_of_birth, marriage_anniversary, date_of_death } = req.body;

    const familyMember = await prisma.familyMember.create({
      data: {
        contact_id: contactId,
        relation,
        full_name,
        date_of_birth: date_of_birth ? new Date(date_of_birth) : null,
        marriage_anniversary: marriage_anniversary ? new Date(marriage_anniversary) : null,
        date_of_death: date_of_death ? new Date(date_of_death) : null,
      }
    });
    res.json(familyMember);
  } catch (error) {
    console.error('Error adding family member:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete Family Member
router.delete('/:id/family/:memberId', authenticate, async (req, res) => {
  try {
    const memberId = parseInt(req.params.memberId as string);
    await prisma.familyMember.delete({ where: { id: memberId } });
    res.json({ success: true, message: 'Family member deleted' });
  } catch (error) {
    console.error('Error deleting family member:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Manual trigger for automated birthday & anniversary wishes check
router.post('/trigger-wishes', authenticate, async (_req, res) => {
  try {
    const result = await executeDailyWishesAndReminders();
    res.json(result);
  } catch (error) {
    console.error('Error triggering daily wishes check:', error);
    res.status(500).json({ error: 'Failed to execute wishes automation' });
  }
});

export default router;
