import { Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { MessageListener } from './listeners/message.listener';
import { PrismaService } from '../../prisma/prisma.service';
import { SyncUsersModule } from './sync/sync-users.module';
// import { MedalsService } from './medals/medals.service';
import { MemberListener } from './listeners/member.listener';
import { Client, GatewayIntentBits, Partials } from 'discord.js';

@Module({
  imports: [SyncUsersModule],
  providers: [BotService, MessageListener, PrismaService],
})
export class BotModule {
  public client: Client;

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, // se você já usa
      ],
      partials: [Partials.GuildMember, Partials.User],
    });

    // Registra listeners (inclui welcome/leave + invites)
    new MemberListener(this.client);
  }

  public async start(token: string) {
    await this.client.login(token);
  }
}
