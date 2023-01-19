import { Injectable, Logger } from '@nestjs/common';
import { phoneNumberFormatter } from 'src/lib/formatter';
import {
  Buttons,
  Client,
  LocalAuth,
  Message,
  MessageAck,
  NoAuth,
} from 'whatsapp-web.js';
import { StateModel, QRCodeModel } from './models';
import { SendButtonMessageInput } from './models/send-button-message-input';
import { SendMessageStatus } from './models/send-message-status';

@Injectable()
export class WppService {
  private client: Client;
  private qrcode: string;

  private readonly logger = new Logger(WppService.name);

  constructor() {
    this.logger.log('Whatsapp client constructor is initializing');
    this.client = new Client({
      //restartOnAuthFail: true,
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process', // <- Esta nao funciona no windows
          '--disable-gpu',
        ],
      },
      authStrategy: new NoAuth(),
    });
    this.client.initialize();

    /*
     * Registros dos eventos da API
     */
    this.client.on('qr', (qrCode) => {
      this.logger.log('Evento de qrcode');
      this.qrcode = qrCode;
    });

    this.client.on('ready', (evt) => {
      this.logger.log('API apta para enviar e receber mensagens');
    });

    this.client.on('auth_failure', (evt) => {
      this.logger.log('Evento de auth_failure ' + JSON.stringify(evt));
    });
    this.client.on('authenticated', (evt) => {
      this.logger.log('API autenticada');
    });

    this.client.on('disconnected', (evt) => {
      this.logger.log('Evento de disconnected');
      this.client.initialize();
    });

    /*
    this.client.on('message', (evt: Message) => {
      this.logger.log('Evento de message ' + JSON.stringify(evt));
    });
    */

    this.client.on('message_ack', (evt: MessageAck) => {
      this.logger.log('Evento de message_ack ' + JSON.stringify(evt));
    });

    /*
    this.client.on('message_create', (evt: Message) => {
      this.logger.log('Evento de message_create ' + JSON.stringify(evt));
    });
    */

    this.client.on('loading_screen', (percent, message) => {
      this.logger.log('Carregando ' + percent + '%' + ' ' + message);
    });

    this.logger.log('Whatsapp client constructor has finished');
  }

  async getQRCode(): Promise<QRCodeModel> {
    this.logger.log('Executando método de geração de QRCode');

    const qr = new QRCodeModel();
    qr.qrcode = this.qrcode;
    return qr;
  }

  async getState(): Promise<StateModel> {
    this.logger.log(await this.client.getState());

    const s = new StateModel();
    s.state = await this.client.getState();

    return s;
  }

  async sendMessage(
    contato: string,
    mensagem: string,
  ): Promise<SendMessageStatus> {
    this.logger.log('Send message is initialized');

    const formattedContact = phoneNumberFormatter(contato);
    const s = new SendMessageStatus();

    await this.client
      .sendMessage(formattedContact, mensagem)
      .then(() => {
        s.status = 'Envio OK';
      })
      .catch((error) => {
        this.logger.error(error);
        const s = new SendMessageStatus();
        s.status = error;
      })
      .finally(() => this.logger.log('Send message is finished'));
    return s;
  }

  async sendButtonMessage(
    data: SendButtonMessageInput,
  ): Promise<SendMessageStatus> {
    this.logger.log('Send button message is initialized');
    this.logger.log(JSON.stringify(data));

    const formattedContact = phoneNumberFormatter(data.contact);
    const s = new SendMessageStatus();

    const button = new Buttons(
      data.button.body,
      data.button.buttons,
      data.button.title,
      data.button.footer,
    );

    await this.client
      .sendMessage(formattedContact, button)
      .then(() => {
        s.status = 'Envio OK';
      })
      .catch((error) => {
        this.logger.error(error);
        const s = new SendMessageStatus();
        s.status = error;
      })
      .finally(() => this.logger.log('Send button message is finished'));
    return s;
  }
}