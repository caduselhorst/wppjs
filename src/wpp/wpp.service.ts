import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { phoneNumberFormatter } from 'src/lib/formatter';
import { Buttons, Client, LocalAuth, MessageAck } from 'whatsapp-web.js';
import { StateModel, QRCodeModel } from './models';
import { SendButtonMessageInput } from './models/send-button-message-input';
import { SendMessageStatus } from './models/send-message-status';
import { GetRegisteredClientModel } from './models/get-registeredclient-model';
import { VersionModel } from './models/version-model';

@Injectable()
export class WppService {
  private client: Client;
  private qrcode: string;

  private readonly logger = new Logger(WppService.name);

  constructor() {
    let path = '.';
    let id = 'clientid';

    const args = process.argv;

    args.forEach((e) => {
      if (e.startsWith('--path')) {
        path = e.split(':')[1];
      }

      if (e.startsWith('--id')) {
        id = e.split(':')[1];
      }
    });

    this.logger.log('### Whatsapp client constructor is initializing ###');
    this.logger.log(`Client ID: ${id} Data path: ${path}`);
    this.client = new Client({
      restartOnAuthFail: true,
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
      authStrategy: new LocalAuth({
        clientId: process.env.WPP_CLIENT_ID,
        dataPath: path,
      }),
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
      this.logger.log('API apta para enviar e receber mensagens -> ' + evt);
    });

    this.client.on('auth_failure', (evt) => {
      this.logger.log('Evento de auth_failure ' + JSON.stringify(evt));
    });
    this.client.on('authenticated', (evt) => {
      this.logger.log('API autenticada -> ' + evt);
    });

    this.client.on('remote_session_saved', () => {
      this.logger.log('Session saved on remote data base');
    });

    this.client.on('disconnected', (evt) => {
      this.logger.log('Evento de disconnected -> ' + evt);
      this.client.initialize();
    });

    this.client.on('message_ack', (evt: MessageAck) => {
      this.logger.log('Evento de message_ack ' + JSON.stringify(evt));
    });

    this.client.on('loading_screen', (percent, message) => {
      this.logger.log('Carregando ' + percent + '%' + ' ' + message);
    });

    this.logger.log('Whatsapp client constructor has finished');
  }

  async getVersion(): Promise<VersionModel> {
    this.logger.log('Executando método de recuperação da versão');

    const version = await this.client.getWWebVersion();

    const versionModel = new VersionModel();

    versionModel.version = version;

    return versionModel;
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

  async getRegisteredClient(
    contact: string,
  ): Promise<GetRegisteredClientModel> {
    let regClient;

    try {
      regClient = await this.client.getNumberId(contact);
    } catch (error) {
      this.logger.error(
        'An error ocurred during attempt to identify de registration number',
      );
      this.logger.error(error);
    }

    if (regClient === null) {
      const result = new GetRegisteredClientModel();
      result.message = 'The contact number is not registered on Whatsapp';
      return result;
    }

    const result = new GetRegisteredClientModel();

    result.registeredContact = regClient.user;
    result.server = regClient.server;
    result.message = 'OK';

    return result;
  }

  async sendMessage(
    contato: string,
    mensagem: string,
  ): Promise<SendMessageStatus> {
    this.logger.log('Send message is initialized');

    const s = new SendMessageStatus();

    const registeredclient = await this.getRegisteredClient(contato);

    if (!registeredclient.message.includes('OK')) {
      throw new BadRequestException(
        'Número informado não é registrado no Whatsapp',
      );
    }

    this.logger.log(
      `Contact is registered: ${registeredclient.registeredContact}@${registeredclient.server}`,
    );

    const result = await this.client.sendMessage(
      `${registeredclient.registeredContact}@${registeredclient.server}`,
      mensagem,
    );

    s.id = result.id.id;
    s.status = 'OK';

    return s;
  }

  // send a message button to client
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
