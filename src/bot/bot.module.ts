import { Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { MessageListener } from './listeners/message.listener';
import { PrismaService } from 'prisma/prisma.service';
import { SyncUsersModule } from './sync/sync-users.module';

@Module({
  imports: [SyncUsersModule],
  providers: [BotService, MessageListener, PrismaService],
})
export class BotModule {}
