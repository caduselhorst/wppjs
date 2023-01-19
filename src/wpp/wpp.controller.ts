import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Logger,
  Post,
  Res,
} from '@nestjs/common';
import { StateModel, QRCodeModel } from './models';
import { SendButtonMessageInput } from './models/send-button-message-input';
import { SendMessageInput } from './models/send-message-input';
import { SendMessageStatus } from './models/send-message-status';
import { WppService } from './wpp.service';

import * as qr from 'qr-image';
import * as fs from 'fs';
import { PrismaService } from 'src/prisma.service';
import { Prisma } from '@prisma/client';

@Controller()
export class WppController {
  private readonly logger = new Logger(WppController.name);
  constructor(
    private readonly wppService: WppService,
    private readonly prismaService: PrismaService,
  ) {}

  @Get('wpp/qrcode')
  @HttpCode(200)
  async getQRCode(
    @Headers('accept') header: string,
    @Res() response,
  ): Promise<any> {
    if (header && header.includes('json')) {
      return response.json(await this.wppService.getQRCode());
    }
    const qrimage = qr.image(await (await this.wppService.getQRCode()).qrcode, {
      type: 'png',
    });

    return qrimage.pipe(response);
  }

  @Get('wpp/state')
  @HttpCode(200)
  async getState(): Promise<StateModel> {
    return await this.wppService.getState();
  }

  @Post('wpp/send-message')
  @HttpCode(200)
  async sendMessage(
    @Body() input: SendMessageInput,
  ): Promise<SendMessageStatus> {
    this.logger.log(
      'Send-message -> contact: ' +
        input.contact +
        ' message: ' +
        input.message,
    );

    return await this.wppService.sendMessage(input.contact, input.message);
  }

  @Post('wpp/send-button-message')
  @HttpCode(200)
  async sendButtonMessage(
    @Body() input: SendButtonMessageInput,
  ): Promise<SendMessageStatus> {
    return await this.wppService.sendButtonMessage(input);
  }

  /***************    Integration  ********************/

  @Post('integration')
  async receiveData(@Body() data) {
    this.logger.log(data);

    if (data.StatusId === 800 || data.StatusId === '800') {
      this.logger.log('Status de job compatível com envio de mensagem');
      const state = await this.wppService.getState();

      if (state.state === null) {
        this.logger.warn('API não conectada. A mensagem não será enviada');
        await this.prismaService.wppmessage.create({
          data: {
            resultmsg: 'API não conectada',
            contact:
              '55' +
              data.Cliente.Telefone.replace(' ', '')
                .replace('(', '')
                .replace(')', '')
                .replace('-', ''),
            date: new Date(),
            result: -1,
            sendedmsg: data.SmsProfissionalCaminho,
          },
        });
      } else {
        const result: SendMessageStatus = await this.wppService.sendMessage(
          '55' +
            data.Cliente.Telefone.replace(' ', '')
              .replace('(', '')
              .replace(')', '')
              .replace('-', ''),
          data.SmsProfissionalCaminho,
        );

        /*
        const result: SendMessageStatus = await this.wppService.sendMessage(
          '559684072732',
          data.SmsProfissionalCaminho,
        );
        */
        if (result.status === 'Envio OK') {
          await this.prismaService.wppmessage.create({
            data: {
              resultmsg: 'Mensagem enviada',
              contact:
                '55' +
                data.Cliente.Telefone.replace(' ', '')
                  .replace('(', '')
                  .replace(')', '')
                  .replace('-', ''),
              date: new Date(),
              result: 1,
              sendedmsg: data.SmsProfissionalCaminho,
            },
          });
        } else {
          await this.prismaService.wppmessage.create({
            data: {
              resultmsg: result.status,
              contact:
                '55' +
                data.Cliente.Telefone.replace(' ', '')
                  .replace('(', '')
                  .replace(')', '')
                  .replace('-', ''),
              date: new Date(),
              result: -1,
              sendedmsg: data.SmsProfissionalCaminho,
            },
          });
        }
      }
    }

    return { result: 'Ok' };
  }
}
