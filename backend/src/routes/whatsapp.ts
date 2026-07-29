import { Router } from 'express';
import whatsappService from '../services/whatsapp';
import { authenticate } from '../middleware/auth';

const router = Router();

// Get WhatsApp client status
router.get('/status', authenticate, (req, res) => {
  try {
    const status = whatsappService.getStatus();
    res.json(status);
  } catch (error) {
    console.error('Error fetching WhatsApp status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Initialize WhatsApp client (e.g. generate QR code)
router.post('/connect', authenticate, (req, res) => {
  try {
    whatsappService.initialize();
    res.json({ message: 'WhatsApp client initialization started' });
  } catch (error) {
    console.error('Error initializing WhatsApp:', error);
    res.status(500).json({ error: 'Failed to initialize WhatsApp client' });
  }
});

// Disconnect/Logout WhatsApp client
router.post('/disconnect', authenticate, async (req, res) => {
  try {
    await whatsappService.disconnect();
    res.json({ message: 'WhatsApp client disconnected and logged out' });
  } catch (error) {
    console.error('Error disconnecting WhatsApp:', error);
    res.status(500).json({ error: 'Failed to disconnect WhatsApp client' });
  }
});

// Send test message
router.post('/send-test', authenticate, async (req, res) => {
  try {
    const { phone, message } = req.body;
    
    if (!phone || !message) {
      return res.status(400).json({ error: 'Phone and message are required' });
    }

    const { status } = whatsappService.getStatus();
    if (status !== 'CONNECTED') {
      return res.status(400).json({ error: 'WhatsApp is not connected' });
    }

    const success = await whatsappService.sendMessage(phone, message);
    if (success) {
      res.json({ success: true, message: 'Test message sent' });
    } else {
      res.status(500).json({ error: 'Failed to send WhatsApp message' });
    }
  } catch (error) {
    console.error('Error sending test WhatsApp:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
