// src/bot/sync/scheduled-sync.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SyncUsersService } from './sync-users.service';
import { BotService } from '../bot.service';

@Injectable()
export class ScheduledSyncService {
  private readonly logger = new Logger(ScheduledSyncService.name);

  constructor(
    private readonly syncUsersService: SyncUsersService,
    private readonly botService: BotService,
  ) {}

  // Sincronização completa a cada 6 horas
  @Cron('0 */6 * * *', {
    name: 'sync-complete-users',
    timeZone: 'America/Sao_Paulo',
  })
  async sincronizacaoCompleta() {
    this.logger.log('🕐 Iniciando sincronização automática completa...');

    try {
      const client = this.botService.getClient();

      if (!client.isReady()) {
        this.logger.warn('⚠️ Bot não está pronto para sincronização');
        return;
      }

      await this.syncUsersService.sincronizarTodosUsuarios(client);

      const stats = await this.syncUsersService.gerarRelatorioSincronizacao();
      this.logger.log(
        `✅ Sincronização automática concluída: ${stats?.totalUsuarios} usuários`,
      );
    } catch (error) {
      this.logger.error('❌ Erro na sincronização automática:', error);
    }
  }

  // Sincronização incremental a cada hora
  @Cron('0 * * * *', {
    name: 'sync-incremental',
    timeZone: 'America/Sao_Paulo',
  })
  async sincronizacaoIncremental() {
    this.logger.log('🔄 Verificando atualizações incrementais...');

    try {
      const client = this.botService.getClient();

      if (!client.isReady()) {
        this.logger.warn(
          '⚠️ Bot não está pronto para sincronização incremental',
        );
        return;
      }

      // Aqui você pode implementar lógica mais específica para sync incremental
      // Por exemplo, apenas usuários que entraram/saíram recentemente

      this.logger.log('✅ Verificação incremental concluída');
    } catch (error) {
      this.logger.error('❌ Erro na sincronização incremental:', error);
    }
  }

  // Limpeza de dados antigos toda segunda-feira às 3h
  @Cron('0 3 * * 1', {
    name: 'cleanup-old-data',
    timeZone: 'America/Sao_Paulo',
  })
  async limpezaDados() {
    this.logger.log('🧹 Iniciando limpeza de dados antigos...');

    try {
      // Implementar limpeza de logs antigos, backups, etc.
      this.logger.log('✅ Limpeza de dados concluída');
    } catch (error) {
      this.logger.error('❌ Erro na limpeza de dados:', error);
    }
  }
}
