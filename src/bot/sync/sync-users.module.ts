// src/discord/sync-users/sync-users.module.ts
import { Module } from '@nestjs/common';
import { SyncUsersService } from './sync-users.service';
import { BotService } from '../bot.service';
import { PrismaService } from '../../../prisma/prisma.service';

@Module({
  providers: [SyncUsersService, BotService, PrismaService],
  exports: [SyncUsersService], // ✅ necessário para uso em outros módulos
})
export class SyncUsersModule {}
