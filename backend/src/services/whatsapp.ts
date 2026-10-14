import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

export type WhatsAppStatus = 'DISCONNECTED' | 'CONNECTING' | 'QR_RECEIVED' | 'CONNECTED';

class WhatsAppService {
  private client: Client | null = null;
  private status: WhatsAppStatus = 'DISCONNECTED';
  private qrCodeDataUrl: string | null = null;
  private connectedUser: { name: string; number: string } | null = null;
  private authDir = path.join(__dirname, '../../.wwebjs_auth');
  private lastError: string | null = null;

  constructor() {}

  private resolveChromePath(): string | undefined {
    // 1. Explicit env var override
    if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
      console.log('Using PUPPETEER_EXECUTABLE_PATH:', process.env.PUPPETEER_EXECUTABLE_PATH);
      return process.env.PUPPETEER_EXECUTABLE_PATH;
    }

    // 2. Run puppeteer browsers install to verify or download Chrome and capture its exact path
    try {
      console.log('Resolving Chrome binary path via puppeteer CLI...');
      const output = execSync('npx puppeteer browsers install chrome', {
        encoding: 'utf8',
        timeout: 90000
      });
      const match = output.match(/chrome@[^\s]+\s+([^\r\n]+)/);
      if (match && match[1]) {
        const detectedPath = match[1].trim();
        if (fs.existsSync(detectedPath)) {
          console.log('Verified Chrome binary at:', detectedPath);
          return detectedPath;
        }
      }
    } catch (e: any) {
      console.warn('Warning during puppeteer install check:', e?.message);
    }

    // 3. Fallback: recursively search common cache folders
    const searchDirs = [
      '/opt/render/.cache/puppeteer/chrome',
      path.join(process.env.HOME || '', '.cache/puppeteer/chrome'),
      path.join(process.env.USERPROFILE || '', '.cache/puppeteer/chrome'),
      path.join(__dirname, '../../.cache/puppeteer/chrome')
    ];

    const findBinary = (dir: string): string | null => {
      try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const fullPath = path.join(dir, file);
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            const found = findBinary(fullPath);
            if (found) return found;
          } else if (file === 'chrome' || file === 'chrome.exe') {
            return fullPath;
          }
        }
      } catch {
        // ignore read error
      }
      return null;
    };

    for (const dir of searchDirs) {
      if (fs.existsSync(dir)) {
        const found = findBinary(dir);
        if (found) {
          console.log('Discovered Chrome binary at:', found);
          return found;
        }
      }
    }

    console.warn('Could not detect custom Chrome path; falling back to Puppeteer defaults.');
    return undefined;
  }

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

    // Resolve verified Chrome binary executable
    const executablePath = this.resolveChromePath();

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
