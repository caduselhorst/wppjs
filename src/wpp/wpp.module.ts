import { Module } from '@nestjs/common';
import { WppService } from './wpp.service';
import { WppController } from './wpp.controller';
import { PrismaService } from 'src/prisma.service';

@Module({
  controllers: [WppController],
  providers: [WppService, PrismaService],
})
export class WppModule {}
