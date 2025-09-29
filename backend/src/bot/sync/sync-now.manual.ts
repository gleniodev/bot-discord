// src/bot/sync/sync-now.manual.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { BotService } from '../bot.service';
import { SyncUsersService } from './sync-users.service';
import { Logger } from '@nestjs/common';

async function runSync() {
  const logger = new Logger('ManualSync');

  try {
    logger.log('🚀 Iniciando sincronização manual...');

    // Criar a aplicação NestJS
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['log', 'error', 'warn', 'debug', 'verbose'],
    });

    // Obter os serviços necessários
    const botService = app.get(BotService);
    const syncUsersService = app.get(SyncUsersService);

    logger.log('📡 Conectando bot Discord...');

    // Aguardar o bot ficar pronto
    const client = botService.getClient();

    if (!client.isReady()) {
      logger.log('⏳ Aguardando bot ficar pronto...');

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout aguardando bot ficar pronto'));
        }, 30000); // 30 segundos de timeout

        client.once('ready', () => {
          clearTimeout(timeout);
          logger.log('✅ Bot está pronto!');
          resolve();
        });

        client.once('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
    } else {
      logger.log('✅ Bot já está pronto!');
    }

    // Executar sincronização
    logger.log('🔄 Executando sincronização de usuários...');
    await syncUsersService.sincronizarTodosUsuarios(client);

    // Gerar relatório
    logger.log('📊 Gerando relatório de sincronização...');
    const stats = await syncUsersService.gerarRelatorioSincronizacao();

    if (stats) {
      logger.log('📈 Relatório de Sincronização:');
      logger.log(`   👥 Total de usuários: ${stats.totalUsuarios}`);
      logger.log(`   🎖️ Com patente: ${stats.usuariosComPatente}`);
      logger.log(`   🆕 Novos (30 dias): ${stats.usuariosRecentes}`);
      logger.log(
        `   🕐 Última sincronização: ${stats.ultimaSincronizacao.toLocaleString('pt-BR')}`,
      );
    }

    logger.log('✅ Sincronização manual concluída com sucesso!');

    // Fechar a aplicação
    await app.close();
    process.exit(0);
  } catch (error) {
    logger.error('❌ Erro durante a sincronização manual:', error);
    process.exit(1);
  }
}

// Executar o script se for chamado diretamente
if (require.main === module) {
  runSync();
}

export { runSync };
