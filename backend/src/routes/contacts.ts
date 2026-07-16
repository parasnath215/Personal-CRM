import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import multer from 'multer';
import vcard from 'vcard-parser';
import fs from 'fs';

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
    const parsed = vcard.parse(vcfData);
    
    // vcard-parser returns an array or object depending on version. Let's assume standard multiple vcards (though it often parses a single).
    // If it's a bulk file, vcard-parser might return multiple. 
    // Actually vcard-parser might just return properties. Let's handle a safe array wrapping if needed.
    // A robust way is to split by "BEGIN:VCARD" if it's multiple.
    const vcards = vcfData.split('BEGIN:VCARD').filter(v => v.trim().length > 0).map(v => 'BEGIN:VCARD' + v);
    
    let importedCount = 0;
    let skippedCount = 0;

    for (const vcfString of vcards) {
      const parsedCard = vcard.parse(vcfString);
      
      const fn = parsedCard.fn?.[0]?.value || '';
      const tel = parsedCard.tel?.[0]?.value || '';
      const email = parsedCard.email?.[0]?.value || null;
      const org = parsedCard.org?.[0]?.value || null;

      // Normalize phone number (basic E.164 conversion - just strip non-digits and add + if missing, for simplicity we just clean it)
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
          tags: org ? `Org: ${org}` : null
        }
      });
      importedCount++;
    }

    // Cleanup temp file
    fs.unlinkSync(req.file.path);

    res.json({ message: 'Import complete', importedCount, skippedCount });
  } catch (error) {
    console.error('Error importing VCF:', error);
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a single contact manually
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, phone, email, tags } = req.body;
    
    const existing = await prisma.contact.findUnique({ where: { phone } });
    if (existing) {
      return res.status(400).json({ error: 'Contact with this phone number already exists' });
    }

    const contact = await prisma.contact.create({
      data: { name, phone, email, tags }
    });
    res.json(contact);
  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add Family Member
router.post('/:id/family', authenticate, async (req, res) => {
  try {
    const contactId = parseInt(req.params.id);
    const { relation, full_name, date_of_birth, date_of_death } = req.body;

    const familyMember = await prisma.familyMember.create({
      data: {
        contact_id: contactId,
        relation,
        full_name,
        date_of_birth: date_of_birth ? new Date(date_of_birth) : null,
        date_of_death: date_of_death ? new Date(date_of_death) : null,
      }
    });
    res.json(familyMember);
  } catch (error) {
    console.error('Error adding family member:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
