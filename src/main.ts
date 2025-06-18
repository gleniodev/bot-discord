import { config } from 'dotenv';
import { AppModule } from './app.module';
import { BotService } from './bot/bot.service';

// Carrega variáveis .env
config();

// Inicia Nest
import { NestFactory } from '@nestjs/core';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  // Inicia o bot via serviço
  const botService = app.get(BotService);
  botService.start();
}
bootstrap();
