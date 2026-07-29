declare module 'whatsapp-web.js' {
  export class Client {
    constructor(options: any);
    on(event: string, callback: (...args: any[]) => void): void;
    initialize(): Promise<void>;
    sendMessage(chatId: string, content: string, options?: any): Promise<any>;
    logout(): Promise<void>;
    destroy(): Promise<void>;
    info: {
      pushname: string;
      wid: {
        user: string;
      };
    };
  }
  export class LocalAuth {
    constructor(options?: any);
  }
}
