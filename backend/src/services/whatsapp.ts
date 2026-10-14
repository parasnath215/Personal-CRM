import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  WASocket
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode';
import path from 'path';
import fs from 'fs';
import pino from 'pino';

export type WhatsAppStatus = 'DISCONNECTED' | 'CONNECTING' | 'QR_RECEIVED' | 'CONNECTED';

class WhatsAppService {
  private sock: WASocket | null = null;
  private status: WhatsAppStatus = 'DISCONNECTED';
  private qrCodeDataUrl: string | null = null;
  private connectedUser: { name: string; number: string } | null = null;
  private authDir = path.join(__dirname, '../../.baileys_auth');
  private lastError: string | null = null;
  private isExplicitDisconnect: boolean = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;

  constructor() {}

  public async initialize(force: boolean = false) {
    this.isExplicitDisconnect = false;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.sock && !force) {
      if (this.status === 'CONNECTING' || this.status === 'QR_RECEIVED' || this.status === 'CONNECTED') {
        return;
      }
    }

    // Teardown any existing socket
    if (this.sock) {
      try {
        this.sock.ev.removeAllListeners('connection.update');
        this.sock.ev.removeAllListeners('creds.update');
        this.sock.end(undefined);
      } catch (e) {
        // ignore socket close errors
      }
      this.sock = null;
    }

    this.lastError = null;
    this.status = 'CONNECTING';
    console.log('[WhatsAppService] Initializing Baileys lightweight WebSocket client...');

    try {
      if (!fs.existsSync(this.authDir)) {
        fs.mkdirSync(this.authDir, { recursive: true });
      }

      const { state, saveCreds } = await useMultiFileAuthState(this.authDir);
      const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: undefined }));

      this.sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser: ['Personal CRM', 'Chrome', '1.0.0']
      });

      this.sock.ev.on('creds.update', saveCreds);

      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          console.log('[WhatsAppService] Baileys QR code received.');
          try {
            this.qrCodeDataUrl = await qrcode.toDataURL(qr);
            this.status = 'QR_RECEIVED';
            this.lastError = null;
          } catch (err: any) {
            console.error('[WhatsAppService] Error generating QR data URL:', err);
            this.lastError = 'Failed to generate QR image';
          }
        }

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
          const isLoggedOut = statusCode === DisconnectReason.loggedOut;
          console.log(`[WhatsAppService] Connection closed (status: ${statusCode}, loggedOut: ${isLoggedOut})`);

          this.sock = null;

          if (isLoggedOut) {
            console.log('[WhatsAppService] Session logged out. Cleaning up credentials...');
            this.status = 'DISCONNECTED';
            this.qrCodeDataUrl = null;
            this.connectedUser = null;
            this.lastError = null;
            this.cleanupAuthDir();
          } else if (!this.isExplicitDisconnect) {
            const isRestart = statusCode === DisconnectReason.restartRequired;

            if (this.reconnectAttempts >= this.maxReconnectAttempts && !isRestart) {
              console.warn('[WhatsAppService] Max reconnect attempts reached. Setting status to DISCONNECTED.');
              this.status = 'DISCONNECTED';
              this.qrCodeDataUrl = null;
              this.lastError = 'Connection dropped. Please click Connect WhatsApp to reconnect.';
              return;
            }

            this.reconnectAttempts++;
            const delay = isRestart ? 500 : 3000;
            console.log(`[WhatsAppService] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}, reason: ${isRestart ? 'restartRequired' : 'temporaryDisconnect'})...`);
            
            this.status = 'CONNECTING';

            if (this.reconnectTimeout) {
              clearTimeout(this.reconnectTimeout);
            }

            this.reconnectTimeout = setTimeout(() => {
              this.initialize(true);
            }, delay);
          } else {
            this.status = 'DISCONNECTED';
            this.qrCodeDataUrl = null;
            this.connectedUser = null;
          }
        } else if (connection === 'open') {
          console.log('[WhatsAppService] WhatsApp connection open & ready!');
          this.status = 'CONNECTED';
          this.qrCodeDataUrl = null;
          this.lastError = null;
          this.reconnectAttempts = 0;

          const rawId = this.sock?.user?.id || '';
          const cleanPhone = rawId.split(':')[0] || rawId.split('@')[0];
          this.connectedUser = {
            name: this.sock?.user?.name || 'CRM WhatsApp User',
            number: cleanPhone
          };
        }
      });
    } catch (err: any) {
      console.error('[WhatsAppService] Initialization failed:', err);
      this.status = 'DISCONNECTED';
      this.lastError = err?.message || 'Failed to start WhatsApp socket client';
      this.sock = null;
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
    if (this.status !== 'CONNECTED' || !this.sock) {
      console.warn('[WhatsAppService] Cannot send message: WhatsApp client is not connected.');
      return false;
    }

    try {
      let cleanNumber = phone.replace(/\D/g, '');
      // Format 10-digit Indian numbers with country code 91
      if (cleanNumber.length === 10) {
        cleanNumber = '91' + cleanNumber;
      } else if (cleanNumber.length === 11 && cleanNumber.startsWith('0')) {
        cleanNumber = '91' + cleanNumber.slice(1);
      }

      const jid = `${cleanNumber}@s.whatsapp.net`;
      console.log(`[WhatsAppService] Sending WhatsApp message to ${jid}...`);
      await this.sock.sendMessage(jid, { text: message });
      console.log(`[WhatsAppService] Successfully delivered message to ${jid}`);
      return true;
    } catch (error: any) {
      console.error('[WhatsAppService] Failed to send WhatsApp message:', error);
      return false;
    }
  }

  public async disconnect(): Promise<void> {
    this.isExplicitDisconnect = true;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.sock) {
      try {
        console.log('[WhatsAppService] Logging out and terminating WhatsApp session...');
        this.sock.ev.removeAllListeners('connection.update');
        this.sock.ev.removeAllListeners('creds.update');
        await this.sock.logout().catch(() => {});
        this.sock.end(undefined);
      } catch (err) {
        console.error('[WhatsAppService] Error during socket logout:', err);
      }
    }

    this.sock = null;
    this.status = 'DISCONNECTED';
    this.connectedUser = null;
    this.qrCodeDataUrl = null;
    this.lastError = null;
    this.cleanupAuthDir();
  }

  private cleanupAuthDir() {
    if (fs.existsSync(this.authDir)) {
      try {
        console.log('[WhatsAppService] Cleaning up session directory:', this.authDir);
        fs.rmSync(this.authDir, { recursive: true, force: true });
      } catch (err) {
        console.error('[WhatsAppService] Failed to delete session directory:', err);
      }
    }
  }
}

export const whatsappService = new WhatsAppService();
export default whatsappService;
