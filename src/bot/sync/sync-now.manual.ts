import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { SyncUsersService } from './sync-users.service';
import { BotService } from '../bot.service';

async function bootstrap() {
  console.log('🟡 Iniciando contexto da aplicação Nest...');
  const app = await NestFactory.createApplicationContext(AppModule);

  console.log('🟢 Contexto iniciado. Buscando serviços...');

  try {
    const botService = app.get(BotService);
    const syncUsersService = app.get(SyncUsersService);

    if (!syncUsersService) {
      console.error('❌ SyncUsersService não foi encontrado.');
      await app.close();
      return;
    }

    console.log('🔵 Aguardando bot conectar ao Discord...');

    // Aguardar o bot ficar pronto (o login já acontece no OnModuleInit)
    await botService.waitForReady(60000); // 60 segundos

    console.log('✅ Bot conectado! Executando sincronização...');

    // Executar sincronização
    await syncUsersService.sync();

    console.log('✅ Sincronização concluída com sucesso.');
  } catch (error) {
    console.error('❌ Erro durante a execução:', error);
  } finally {
    console.log('🔚 Encerrando a aplicação...');
    await app.close();
  }
}

bootstrap().catch(console.error);
