import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import { env } from 'process';

const PORT = env.PORT || 3000;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(PORT);
}
bootstrap();
