// src/bot/listeners/bot-listeners.module.ts
import { Module } from '@nestjs/common';
import { MessageListener } from './message.listener';
import { MessageProcessor } from './processors/message.processor';
import { ReturnProcessor } from './processors/return.processor';
import { ItemLimitChecker } from './checkers/item-limit.checker';
import { WeaponController } from './controllers/weapon.controller';
import { NotificationService } from './services/notification.service';
import { BotService } from '../bot.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { SyncUsersService } from '../sync/sync-users.service';

@Module({
  providers: [
    MessageListener,
    MessageProcessor,
    ReturnProcessor,
    ItemLimitChecker,
    WeaponController,
    NotificationService,
    BotService,
    PrismaService,
    SyncUsersService,
  ],
  exports: [
    MessageListener,
    MessageProcessor,
    ReturnProcessor,
    ItemLimitChecker,
    WeaponController,
    NotificationService,
  ],
})
export class BotListenersModule {}
