import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { config } from 'dotenv';

config();

@Injectable()
export class BotService implements OnModuleInit {
  private client: Client;
  private readonly logger = new Logger(BotService.name);

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers, // ESSENCIAL para listar membros
      ],
      partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction,
        Partials.User,
        Partials.GuildMember,
      ],
    });

    // Adicionar listeners para debug
    this.client.on('ready', () => {
      this.logger.log(`✅ Bot conectado como ${this.client.user?.tag}`);
      this.logger.log(`📊 Servidores: ${this.client.guilds.cache.size}`);
    });

    this.client.on('error', (error) => {
      this.logger.error('❌ Erro no Discord Client:', error);
    });

    this.client.on('warn', (warning) => {
      this.logger.warn('⚠️ Aviso do Discord:', warning);
    });
  }

  // Este método é chamado automaticamente quando o módulo é inicializado
  async onModuleInit() {
    const token = process.env.DISCORD_TOKEN;

    if (!token) {
      this.logger.error(
        '❌ DISCORD_TOKEN não encontrado nas variáveis de ambiente!',
      );
      throw new Error('DISCORD_TOKEN é obrigatório');
    }

    this.logger.log('🔐 Fazendo login no Discord...');

    try {
      await this.client.login(token);
      this.logger.log('✅ Login realizado com sucesso!');
    } catch (error) {
      this.logger.error('❌ Erro ao fazer login no Discord:', error);
      throw error;
    }
  }

  getClient(): Client {
    return this.client;
  }

  // Manter o método start() para compatibilidade, mas agora ele só chama onModuleInit
  async start() {
    if (!this.client.isReady()) {
      await this.onModuleInit();
    }
  }

  // Método para verificar se está conectado
  isReady(): boolean {
    return this.client.isReady();
  }

  // Método para aguardar a conexão (útil para scripts)
  async waitForReady(timeoutMs: number = 30000): Promise<void> {
    if (this.client.isReady()) {
      return;
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Timeout: Bot não conectou em ${timeoutMs}ms`));
      }, timeoutMs);

      this.client.once('ready', () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }
}
