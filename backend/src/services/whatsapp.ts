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
  private lastError: string | null = null;

  constructor() {}

  public async initialize(force: boolean = false) {
    if (this.client && !force) {
      if (this.status === 'CONNECTING' || this.status === 'QR_RECEIVED' || this.status === 'CONNECTED') {
        return;
      }
    }

    if (this.client) {
      try {
        await this.client.destroy().catch(() => {});
      } catch (e) {
        // ignore destroy error
      }
      this.client = null;
    }

    this.lastError = null;
    this.status = 'CONNECTING';
    console.log('Initializing WhatsApp client...');

    // Locate Chrome executable if installed via puppeteer browsers install
    let executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    if (!executablePath) {
      const cacheDir = path.join(__dirname, '../../.cache/puppeteer/chrome');
      if (fs.existsSync(cacheDir)) {
        try {
          const findChrome = (dir: string): string | null => {
            const files = fs.readdirSync(dir);
            for (const file of files) {
              const fullPath = path.join(dir, file);
              const stat = fs.statSync(fullPath);
              if (stat.isDirectory()) {
                const found = findChrome(fullPath);
                if (found) return found;
              } else if (file === 'chrome' || file === 'chrome.exe') {
                return fullPath;
              }
            }
            return null;
          };
          const found = findChrome(cacheDir);
          if (found) {
            executablePath = found;
            console.log('Using cached Chrome binary:', executablePath);
          }
        } catch (e) {
          console.warn('Could not traverse cache directory:', e);
        }
      }
    }

    const puppeteerArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--disable-extensions'
    ];

    try {
      this.client = new Client({
        authStrategy: new LocalAuth({
          clientId: 'crm-session',
          dataPath: this.authDir
        }),
        puppeteer: {
          headless: true,
          executablePath: executablePath || undefined,
          args: puppeteerArgs
        },
        webVersionCache: {
          type: 'remote',
          remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-js/main/dist/wppconnect-wa.js'
        }
      });

      this.client.on('qr', async (qr) => {
        console.log('WhatsApp QR code received.');
        try {
          this.qrCodeDataUrl = await qrcode.toDataURL(qr);
          this.status = 'QR_RECEIVED';
          this.lastError = null;
        } catch (err: any) {
          console.error('Error generating QR code data URL:', err);
          this.lastError = 'Failed to generate QR image';
        }
      });

      this.client.on('authenticated', () => {
        console.log('WhatsApp client authenticated.');
        this.status = 'CONNECTING';
        this.lastError = null;
      });

      this.client.on('auth_failure', (msg) => {
        console.error('WhatsApp authentication failure:', msg);
        this.status = 'DISCONNECTED';
        this.lastError = typeof msg === 'string' ? msg : 'Authentication failed';
        this.qrCodeDataUrl = null;
        this.client = null;
      });

      this.client.on('ready', () => {
        console.log('WhatsApp client is ready.');
        this.status = 'CONNECTED';
        this.qrCodeDataUrl = null;
        this.lastError = null;
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
        this.client = null;
        this.cleanupAuthDir();
      });

      this.client.initialize().catch((err: any) => {
        console.error('Error during WhatsApp initialization:', err);
        this.status = 'DISCONNECTED';
        this.lastError = err?.message || 'Failed to launch WhatsApp browser environment';
        this.client = null;
      });
    } catch (err: any) {
      console.error('Failed to construct WhatsApp client:', err);
      this.status = 'DISCONNECTED';
      this.lastError = err?.message || 'Failed to instantiate WhatsApp client';
      this.client = null;
    }
  }

  public getStatus() {
    return {
      status: this.status,
      qrCode: this.qrCodeDataUrl,
      user: this.connectedUser,
      error: this.lastError
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
    if (!this.client) {
      this.status = 'DISCONNECTED';
      this.connectedUser = null;
      this.qrCodeDataUrl = null;
      this.lastError = null;
      this.cleanupAuthDir();
      return;
    }

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
      this.lastError = null;
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
