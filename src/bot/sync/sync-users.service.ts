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
   * Separa o nickname em patente e nome baseado no padrão "Patente | Nome"
   */
  private separateNicknameAndPatente(displayName: string): {
    patente: string | null;
    nome: string;
  } {
    if (!displayName || typeof displayName !== 'string') {
      return { patente: null, nome: '' };
    }

    const trimmedDisplayName = displayName.trim();

    // Verifica se existe o separador " | "
    if (trimmedDisplayName.includes(' | ')) {
      const parts = trimmedDisplayName.split(' | ');

      if (parts.length >= 2) {
        const patente = parts[0].trim();
        const nome = parts.slice(1).join(' | ').trim(); // Caso tenha mais de um "|", junta tudo como nome

        return {
          patente: patente || null,
          nome: nome || trimmedDisplayName,
        };
      }
    }

    // Se não encontrar o padrão, considera tudo como nome e patente como null
    return {
      patente: null,
      nome: trimmedDisplayName,
    };
  }

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
        const displayName = member.displayName;

        // Validar dados do membro
        if (!userId || !displayName) {
          this.logger.warn(`⚠️ Dados inválidos para membro: ${memberId}`);
          errorCount++;
          continue;
        }

        // Pular bots
        if (member.user?.bot) {
          this.logger.debug(`🤖 Pulando bot: ${displayName}`);
          continue;
        }

        // Separar patente e nome
        const { patente, nome } = this.separateNicknameAndPatente(displayName);

        this.logger.debug(
          `➡️ Sincronizando: ${displayName} -> Patente: "${patente}", Nome: "${nome}" (${userId})`,
        );

        try {
          // Salvar/atualizar no banco de dados
          await this.prisma.user.upsert({
            where: { userId },
            update: {
              nickname: nome,
              patente: patente,
            },
            create: {
              userId,
              nickname: nome,
              patente: patente,
            },
          });

          syncCount++;
        } catch (error) {
          this.logger.error(
            `❌ Erro ao sincronizar ${displayName} (${userId}):`,
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
  async buscarUserIdPorNicknameLike(nickname: string): Promise<string | null> {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          nickname: {
            contains: nickname,
            mode: 'insensitive',
          },
        },
        select: {
          userId: true,
          nickname: true,
          patente: true,
        },
      });

      if (user) {
        this.logger.log(
          `🔍 Encontrado: ${user.patente ? `${user.patente} | ` : ''}${user.nickname} -> ${user.userId}`,
        );
        return user.userId;
      }

      return null;
    } catch (error) {
      this.logger.error('❌ Erro ao buscar userId por nickname LIKE:', error);
      return null;
    }
  }
}
