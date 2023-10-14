import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

let PORT = 3333;
const args = process.argv;

args.forEach((e) => {
  if (e.startsWith('--port')) {
    console.log(e.split(':'));
    PORT = Number(e.split(':')[1]);
  }
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(PORT);
}
bootstrap();
