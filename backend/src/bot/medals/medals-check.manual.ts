// src/bot/medals/medals-sync.manual.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { BotService } from '../bot.service';
import { MedalsService } from './medals.service';
import { Logger } from '@nestjs/common';

async function runMedalsSync() {
  const logger = new Logger('MedalsSyncManual');

  try {
    logger.log('🏅 Iniciando sincronização manual de medalhas...');

    // Criar a aplicação NestJS
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['log', 'error', 'warn', 'debug', 'verbose'],
    });

    // Obter os serviços necessários
    const botService = app.get(BotService);
    const medalsService = app.get(MedalsService);

    logger.log('📡 Conectando bot Discord...');

    // Aguardar o bot ficar pronto
    const client = botService.getClient();

    if (!client.isReady()) {
      logger.log('⏳ Aguardando bot ficar pronto...');

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout aguardando bot ficar pronto'));
        }, 30000);

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

    // Gerar relatório antes da sincronização
    logger.log('📊 Gerando relatório inicial...');
    const initialReport = await medalsService.generateMedalsReport();

    logger.log('📈 Relatório Inicial:');
    logger.log(
      `   👥 Usuários elegíveis: ${initialReport.summary.totalEligible}`,
    );
    logger.log(
      `   🎯 Com on-duty registrado: ${initialReport.summary.totalWithOnDuty}`,
    );
    logger.log(
      `   📅 Tempo médio de serviço: ${initialReport.summary.avgServiceMonths} meses`,
    );

    // Executar sincronização completa
    logger.log('🔄 Executando sincronização completa...');
    await medalsService.syncCavalryData(client);

    // Buscar usuários elegíveis atualizados
    logger.log('🏅 Buscando usuários elegíveis atualizados...');
    const eligibleUsers = await medalsService.getEligibleUsers();

    // Gerar relatório final
    logger.log('📊 Gerando relatório final...');
    const finalReport = await medalsService.generateMedalsReport();

    logger.log('\n📈 Relatório Final de Medalhas:');
    logger.log(
      `   👥 Total de usuários elegíveis: ${finalReport.summary.totalEligible}`,
    );
    logger.log(
      `   🎯 Com on-duty registrado: ${finalReport.summary.totalWithOnDuty}`,
    );
    logger.log(
      `   📅 Tempo médio de serviço: ${finalReport.summary.avgServiceMonths} meses`,
    );

    if (eligibleUsers.length > 0) {
      logger.log('\n🏅 Distribuição de Medalhas Elegíveis:');

      const medalConfigs = medalsService.getMedalConfigs();

      for (const [medalType, count] of Object.entries(
        finalReport.medalDistribution,
      )) {
        const config = medalConfigs.find((c) => c.type === medalType);
        logger.log(`   ${config?.emoji} ${config?.title}: ${count} usuário(s)`);
      }

      // Calcular bônus total disponível
      let totalBonusAvailable = 0;
      eligibleUsers.forEach((user) => {
        user.eligibleMedals.forEach((medal) => {
          totalBonusAvailable += medal.bonusAmount;
        });
      });

      logger.log(
        `\n💰 Bônus Total Disponível: $${totalBonusAvailable.toLocaleString('pt-BR')}`,
      );

      logger.log('\n📋 Lista de Usuários Elegíveis:');
      logger.log('───────────────────────────────────────────────────────');

      eligibleUsers.forEach((user, index) => {
        logger.log(`\n${index + 1}. ${user.nickname} (${user.patente})`);
        logger.log(
          `   🏇 Entrou no servidor: ${user.joinedServerAt.toLocaleDateString('pt-BR')}`,
        );
        logger.log(`   ⏰ Tempo de serviço: ${user.serviceTime}`);
        logger.log(`   🎯 Último on-duty: ${user.onDutyStatus}`);
        logger.log(`   🏅 Medalhas elegíveis:`);

        user.eligibleMedals.forEach((medal) => {
          logger.log(
            `      ${medal.emoji} ${medal.title} - ${medal.bonusAmount}`,
          );
        });
      });

      // Identificar usuários sem on-duty
      const usersWithoutOnDuty = eligibleUsers.filter(
        (user) => user.lastOnDutyDate === null,
      );

      if (usersWithoutOnDuty.length > 0) {
        logger.log('\n⚠️ Usuários Elegíveis sem Registro de On-Duty:');
        usersWithoutOnDuty.forEach((user) => {
          logger.log(
            `   ❓ ${user.nickname} (${user.patente}) - ${user.serviceTime}`,
          );
        });
        logger.log(
          '\n💡 Dica: Estes usuários podem precisar de verificação manual do histórico.',
        );
      }

      // Sugestões
      logger.log('\n🎯 Próximas Ações Sugeridas:');
      logger.log('   1. Revisar lista de usuários elegíveis');
      logger.log('   2. Usar dashboard web para conceder medalhas');
      logger.log('   3. Verificar usuários sem on-duty registrado');
      logger.log(
        '   4. Executar novamente após concessões para atualizar dados',
      );
    } else {
      logger.log('\n⚠️ Nenhum usuário elegível encontrado');
      logger.log('💡 Verifique se:');
      logger.log('   - O cargo de cavalaria está configurado corretamente');
      logger.log('   - Os usuários têm pelo menos 1 mês de serviço');
      logger.log('   - A sincronização foi executada corretamente');
    }

    logger.log('\n✅ Sincronização manual de medalhas concluída com sucesso!');

    // Fechar a aplicação
    await app.close();
    process.exit(0);
  } catch (error) {
    logger.error('❌ Erro durante a sincronização de medalhas:', error);

    if (error instanceof Error) {
      logger.error(`   Mensagem: ${error.message}`);
      logger.error(`   Stack: ${error.stack}`);
    }

    process.exit(1);
  }
}

// Executar o script se for chamado diretamente
if (require.main === module) {
  console.log('🚀 Executando sincronização manual de medalhas...');
  runMedalsSync();
}

export { runMedalsSync };
