import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode';
import path from 'path';
import fs from 'fs';

export type WhatsAppStatus = 'DISCONNECTED' | 'CONNECTING' | 'QR_RECEIVED' | 'CONNECTED';

class WhatsAppService {
  private client: Client | null = null;
  private status: WhatsAppStatus = 'DISCONNECTED';
  private qrCodeDataUrl: string | null = null;
  private connectedUser: { name: string; number: string } | null = null;
  private authDir = path.join(__dirname, '../../.wwebjs_auth');

  constructor() {}

  public initialize() {
    if (this.client) {
      return;
    }

    console.log('Initializing WhatsApp client...');
    this.status = 'CONNECTING';

    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: 'crm-session',
        dataPath: this.authDir
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      }
    });

    this.client.on('qr', async (qr) => {
      console.log('WhatsApp QR code received.');
      try {
        this.qrCodeDataUrl = await qrcode.toDataURL(qr);
        this.status = 'QR_RECEIVED';
      } catch (err) {
        console.error('Error generating QR code data URL:', err);
      }
    });

    this.client.on('authenticated', () => {
      console.log('WhatsApp client authenticated.');
      this.status = 'CONNECTING';
    });

    this.client.on('auth_failure', (msg) => {
      console.error('WhatsApp authentication failure:', msg);
      this.status = 'DISCONNECTED';
      this.qrCodeDataUrl = null;
    });

    this.client.on('ready', () => {
      console.log('WhatsApp client is ready.');
      this.status = 'CONNECTED';
      this.qrCodeDataUrl = null;
      if (this.client) {
        const info = this.client.info;
        this.connectedUser = {
          name: info.pushname || 'CRM WhatsApp User',
          number: info.wid.user
        };
      }
    });

    this.client.on('disconnected', (reason) => {
      console.log('WhatsApp client disconnected:', reason);
      this.status = 'DISCONNECTED';
      this.connectedUser = null;
      this.qrCodeDataUrl = null;
      this.cleanupAuthDir();
    });

    this.client.initialize().catch((err) => {
      console.error('Error during WhatsApp initialization:', err);
      this.status = 'DISCONNECTED';
    });
  }

  public getStatus() {
    return {
      status: this.status,
      qrCode: this.qrCodeDataUrl,
      user: this.connectedUser
    };
  }

  public async sendMessage(phone: string, message: string): Promise<boolean> {
    if (this.status !== 'CONNECTED' || !this.client) {
      console.warn('Cannot send message: WhatsApp client is not connected.');
      return false;
    }

    try {
      let cleanNumber = phone.replace(/\D/g, '');
      if (!cleanNumber.endsWith('@c.us')) {
        cleanNumber = `${cleanNumber}@c.us`;
      }

      console.log(`Sending WhatsApp message to ${cleanNumber}...`);
      await this.client.sendMessage(cleanNumber, message);
      console.log(`WhatsApp message successfully sent to ${cleanNumber}`);
      return true;
    } catch (error) {
      console.error('Failed to send WhatsApp message:', error);
      return false;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.client) return;

    try {
      console.log('Logging out/destroying WhatsApp client...');
      await this.client.logout().catch(() => {});
      await this.client.destroy().catch(() => {});
    } catch (err) {
      console.error('Error during client logout/destroy:', err);
    } finally {
      this.client = null;
      this.status = 'DISCONNECTED';
      this.connectedUser = null;
      this.qrCodeDataUrl = null;
      this.cleanupAuthDir();
    }
  }

  private cleanupAuthDir() {
    const sessionPath = path.join(this.authDir, 'session-crm-session');
    if (fs.existsSync(sessionPath)) {
      try {
        console.log('Cleaning up session directory:', sessionPath);
        fs.rmSync(sessionPath, { recursive: true, force: true });
      } catch (err) {
        console.error('Failed to delete session directory:', err);
      }
    }
  }
}

export const whatsappService = new WhatsAppService();
export default whatsappService;
