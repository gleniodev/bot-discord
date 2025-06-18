import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MessageListener } from './bot/listeners/message.listener';
import { BotService } from './bot/bot.service';
import { SyncUsersModule } from './bot/sync/sync-users.module';

@Module({
  imports: [SyncUsersModule],
  providers: [BotService, MessageListener, PrismaService],
})
export class AppModule {}
