// // Importa os decoradores e utilitários do NestJS
// import { Injectable, Logger } from '@nestjs/common';

// // Importa o serviço que lida com o cliente do Discord
// import { BotService } from '../bot.service';

// // Importa o serviço do Prisma, responsável pela comunicação com o banco de dados
// import { PrismaService } from '../../../prisma/prisma.service';

// // Define o serviço como injetável, permitindo que o NestJS gerencie sua instância
// @Injectable()
// export class SyncUsersService {
//   // Injeta o serviço do bot (para acessar o cliente do Discord)
//   // e o serviço do Prisma (para acessar o banco de dados)
//   constructor(
//     private readonly botService: BotService,
//     private readonly prisma: PrismaService,
//   ) {}

//   // Instancia um logger para escrever mensagens no console
//   private readonly logger = new Logger(SyncUsersService.name);

//   // Função principal para sincronizar os usuários do servidor Discord com o banco de dados
//   async sync() {
//     // Obtém o cliente do Discord
//     const client = this.botService.getClient();

//     // Busca o primeiro servidor (guild) no cache
//     const guild = client.guilds.cache.first();

//     // Se nenhum servidor estiver em cache, exibe um aviso e encerra
//     if (!guild) {
//       this.logger.warn('Nenhum servidor (guild) encontrado no cache.');
//       return;
//     }

//     // Busca todos os membros do servidor
//     const members = await guild.members.fetch();

//     (members)=> console.log(members) ?? console.log("sem membros")

//     // Para cada membro encontrado
//     for (const member of members.values()) {
//       const userId = member.user.id; // ID do usuário no Discord
//       const nickname = member.displayName; // Apelido visível no servidor

//       try {
//         // Insere ou atualiza o usuário no banco de dados
//         await this.prisma.user.upsert({
//           where: { userId }, // Se o userId já existir...
//           update: { nickname }, // ...atualiza o nickname
//           create: { userId, nickname }, // ...senão, cria um novo registro
//         });
//       } catch (error) {
//         // Em caso de erro, loga o nome e o erro ocorrido
//         this.logger.error(`Erro ao sincronizar ${nickname}:`, error);
//       }
//     }

//     // Log final da quantidade total de membros sincronizados
//     this.logger.log(
//       `✅ Sincronização de usuários finalizada. Total: ${members.size}`,
//     );
//   }

//   // Busca o userId de um usuário a partir do seu nickname salvo no banco
//   async buscarUserIdPorNickname(nickname: string): Promise<string | null> {
//     const user = await this.prisma.user.findUnique({
//       where: { nickname }, // Busca o usuário pelo campo `nickname`
//     });

//     return user?.userId || null; // Retorna o userId ou null se não encontrar
//   }
// }

import { Injectable, Logger } from '@nestjs/common';
import { BotService } from '../bot.service';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class SyncUsersService {
  private readonly logger = new Logger(SyncUsersService.name);

  constructor(
    private readonly botService: BotService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Sincroniza os usuários do servidor Discord com o banco de dados.
   */
  async sync() {
    this.logger.log('🔁 Iniciando sincronização de usuários...');

    const client = this.botService.getClient();

    // Verificar se o client está pronto
    if (!client.isReady()) {
      throw new Error('❌ Cliente Discord não está pronto');
    }

    this.logger.log('✅ Cliente Discord está pronto.');

    // Buscar o primeiro servidor (guild)
    const guild = client.guilds.cache.first();
    if (!guild) {
      this.logger.warn('⚠️ Nenhum servidor (guild) encontrado no cache.');
      return;
    }

    this.logger.log(`🎯 Servidor encontrado: ${guild.name} (${guild.id})`);

    try {
      // Buscar todos os membros do servidor
      this.logger.log('🔍 Buscando membros do servidor...');
      const members = await guild.members.fetch();

      this.logger.log(`👥 Total de membros encontrados: ${members.size}`);

      if (!members || members.size === 0) {
        this.logger.warn('⚠️ Nenhum membro encontrado no servidor.');
        return;
      }

      let syncCount = 0;
      let errorCount = 0;

      // Processar cada membro
      for (const [memberId, member] of members) {
        const userId = member.user?.id;
        const nickname = member.displayName;

        // Validar dados do membro
        if (!userId || !nickname) {
          this.logger.warn(`⚠️ Dados inválidos para membro: ${memberId}`);
          errorCount++;
          continue;
        }

        // Pular bots
        if (member.user?.bot) {
          this.logger.debug(`🤖 Pulando bot: ${nickname}`);
          continue;
        }

        this.logger.debug(`➡️ Sincronizando: ${nickname} (${userId})`);

        try {
          // Salvar/atualizar no banco de dados
          await this.prisma.user.upsert({
            where: { userId },
            update: { nickname },
            create: { userId, nickname },
          });

          syncCount++;
        } catch (error) {
          this.logger.error(
            `❌ Erro ao sincronizar ${nickname} (${userId}):`,
            error,
          );
          errorCount++;
        }
      }

      this.logger.log(`✅ Sincronização finalizada!`);
      this.logger.log(`📊 Usuários sincronizados: ${syncCount}`);
      this.logger.log(`⚠️ Erros encontrados: ${errorCount}`);
    } catch (error) {
      this.logger.error('❌ Erro ao buscar membros do servidor:', error);
      throw error;
    }
  }

  /**
   * Busca o ID do usuário pelo nickname salvo no banco.
   */
  // No SyncUsersService, adicione este método:
  async buscarUserIdPorNicknameLike(nickname: string): Promise<string | null> {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          nickname: {
            contains: nickname, // ou use 'mode: 'insensitive'' para case-insensitive
            mode: 'insensitive',
          },
        },
        select: {
          userId: true,
          nickname: true,
        },
      });

      if (user) {
        this.logger.log(`🔍 Encontrado: ${user.nickname} -> ${user.userId}`);
        return user.userId;
      }

      return null;
    } catch (error) {
      this.logger.error('❌ Erro ao buscar userId por nickname LIKE:', error);
      return null;
    }
  }
}
