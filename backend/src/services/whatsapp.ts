import { Client, LocalAuth } from 'whatsapp-web.js';
// @ts-ignore
import qrcode from 'qrcode';

class WhatsAppService {
  private client: Client;
  private qrCode: string | null = null;
  private isReady: boolean = false;

  constructor() {
    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: 'jakarta-motor-pos',
        dataPath: './.wwebjs_auth'
      }),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      }
    });

    this.client.on('qr', (qr) => {
      console.log('WA QR Received');
      this.qrCode = qr;
      this.isReady = false;
    });

    this.client.on('ready', () => {
      console.log('WhatsApp Client is Ready!');
      this.qrCode = null;
      this.isReady = true;
    });

    this.client.on('authenticated', () => {
      console.log('WhatsApp Authenticated');
    });

    this.client.on('auth_failure', (msg) => {
      console.error('WhatsApp Auth Failure:', msg);
      this.isReady = false;
    });

    this.client.on('disconnected', (reason) => {
      console.log('WhatsApp Disconnected:', reason);
      this.isReady = false;
      this.client.initialize(); // Re-initialize
    });
  }

  public initialize() {
    this.client.initialize().catch(err => console.error('WA Init Error:', err));
  }

  public async getQRCode() {
    if (this.isReady) return { status: 'ready' };
    if (!this.qrCode) return { status: 'loading' };
    
    const qrDataUrl = await qrcode.toDataURL(this.qrCode);
    return { status: 'qr', qr: qrDataUrl };
  }

  public async sendMessage(phoneNumber: string, message: string) {
    if (!this.isReady) {
      console.warn('WhatsApp not ready, cannot send message');
      return false;
    }

    try {
      // Format number to international format (starting with 62 for Indonesia)
      let formattedNumber = phoneNumber.replace(/[^0-9]/g, '');
      if (formattedNumber.startsWith('0')) {
        formattedNumber = '62' + formattedNumber.substring(1);
      }
      
      const chatId = formattedNumber + '@c.us';
      await this.client.sendMessage(chatId, message);
      console.log(`Message sent to ${formattedNumber}`);
      return true;
    } catch (error) {
      console.error('Failed to send WA message:', error);
      return false;
    }
  }

  public async logout() {
    try {
      await this.client.logout();
      this.isReady = false;
      this.qrCode = null;
      return true;
    } catch (error) {
      console.error('WhatsApp logout error:', error);
      return false;
    }
  }

  public getStatus() {
    return this.isReady;
  }
}

export default new WhatsAppService();
