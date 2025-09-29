// src/bot/medals/medals.module.ts
import { Module } from '@nestjs/common';
import { MedalsService } from './medals.service';
import { MedalsController } from './medals.controller';
import { OnDutyHistoryScanner } from './scanners/onduty-history.scanner';
import { CavalryRoleScanner } from './scanners/cavalry-role.scanner';
import { PrismaService } from '../../../prisma/prisma.service';
import { BotService } from '../bot.service';

@Module({
  controllers: [MedalsController],
  providers: [
    MedalsService,
    OnDutyHistoryScanner,
    CavalryRoleScanner,
    PrismaService,
    BotService,
  ],
  exports: [MedalsService, OnDutyHistoryScanner, CavalryRoleScanner],
})
export class MedalsModule {}
