import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Client, GuildMember } from 'discord.js';

interface UserSyncData {
  userId: string; // Corrigido: era discordId
  nickname: string;
  patente?: string;
  joinedServerAt?: Date;
  createdAccountAt?: Date;
  premiumSince?: Date;
  roles?: string[];
}

@Injectable()
export class SyncUsersService {
  private readonly logger = new Logger(SyncUsersService.name);

  // IDs dos servidores que você quer sincronizar
  private readonly TARGET_GUILD_IDS = ['1256237388229902389'];

  constructor(private readonly prisma: PrismaService) {}

  async sincronizarTodosUsuarios(client: Client): Promise<void> {
    try {
      this.logger.log('🔄 Iniciando sincronização completa de usuários...');

      let totalSincronizados = 0;
      let totalErros = 0;

      for (const guildId of this.TARGET_GUILD_IDS) {
        try {
          const guild = client.guilds.cache.get(guildId);
          if (!guild) {
            this.logger.warn(`⚠️ Servidor não encontrado: ${guildId}`);
            continue;
          }

          this.logger.log(
            `📡 Sincronizando servidor: ${guild.name} (${guild.id})`,
          );

          // Buscar todos os membros do servidor
          await guild.members.fetch();

          const members = guild.members.cache;
          this.logger.log(
            `👥 Encontrados ${members.size} membros no servidor ${guild.name}`,
          );

          for (const [, member] of members) {
            // Removido memberId não usado
            try {
              await this.sincronizarUsuario(member);
              totalSincronizados++;

              // Log a cada 50 usuários processados
              if (totalSincronizados % 50 === 0) {
                this.logger.log(
                  `📊 Processados ${totalSincronizados} usuários...`,
                );
              }
            } catch (error) {
              totalErros++;
              this.logger.error(
                `❌ Erro ao sincronizar usuário ${member.user.username}:`,
                error,
              );
            }
          }
        } catch (error) {
          this.logger.error(`❌ Erro ao processar servidor ${guildId}:`, error);
        }
      }

      this.logger.log(
        `✅ Sincronização concluída! Sincronizados: ${totalSincronizados}, Erros: ${totalErros}`,
      );
    } catch (error) {
      this.logger.error('❌ Erro na sincronização completa:', error);
    }
  }

  async sincronizarUsuario(member: GuildMember): Promise<void> {
    try {
      const userData = this.extrairDadosDoMembro(member);

      await this.salvarOuAtualizarUsuario(userData);

      this.logger.debug(
        `✅ Usuário sincronizado: ${userData.nickname} (${userData.userId})`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Erro ao sincronizar usuário ${member.user.username}:`,
        error,
      );
      throw error;
    }
  }

  private extrairDadosDoMembro(member: GuildMember): UserSyncData {
    // Extrair nickname (prioridade: apelido do servidor > nome de usuário > display name)
    const nickname = this.limparNickname(
      member.nickname || member.user.globalName || member.user.username,
    );

    // Extrair patente dos cargos
    const patente = this.extrairPatente(member);

    // Extrair datas importantes
    const joinedServerAt = member.joinedAt;
    const createdAccountAt = member.user.createdAt;
    const premiumSince = member.premiumSince;

    // Extrair roles (para futuro uso)
    const roles = member.roles.cache
      .map((role) => role.name)
      .filter((name) => name !== '@everyone');

    return {
      userId: member.user.id, // Corrigido: era discordId
      nickname,
      patente,
      joinedServerAt,
      createdAccountAt,
      premiumSince,
      roles,
    };
  }

  private extrairPatente(member: GuildMember): string | undefined {
    // Lista de patentes em ordem hierárquica (do maior para menor)
    const patentesHierarquia = [
      'Marechal',
      'General',
      'Coronel',
      'Tenente-Coronel',
      'Superintendente',
      'Major',
      'Sheriff',
      'Capitão',
      '1º Tenente',
      '2º Tenente',
      'Sub-Tenente',
      '1º Sargento',
      '2º Sargento',
      '3º Sargento',
      'Cabo',
      'Soldado',
      'Recruta',
    ];

    // Buscar a patente mais alta do usuário
    for (const patente of patentesHierarquia) {
      const temPatente = member.roles.cache.some((role) =>
        role.name.toLowerCase().includes(patente.toLowerCase()),
      );
      if (temPatente) {
        return patente;
      }
    }

    return undefined;
  }

  private limparNickname(nickname: string): string {
    return (
      nickname
        ?.replace(/```/g, '')
        ?.replace(/`/g, '')
        ?.replace(/\n/g, '')
        ?.replace(/\u200B/g, '') // Zero-width space
        ?.replace(/[^\w\s\-_.]/g, '') // Remove caracteres especiais exceto - _ .
        ?.trim() || 'Usuario_Desconhecido'
    );
  }

  private async salvarOuAtualizarUsuario(
    userData: UserSyncData,
  ): Promise<void> {
    try {
      await this.prisma.user.upsert({
        where: {
          userId: userData.userId, // Corrigido: era discordId
        },
        update: {
          nickname: userData.nickname,
          patente: userData.patente,
          joinedServerAt: userData.joinedServerAt,
          createdAccountAt: userData.createdAccountAt,
          premiumSince: userData.premiumSince,
          lastSyncAt: new Date(),
          isActive: true,
        },
        create: {
          userId: userData.userId, // Corrigido: era discordId
          nickname: userData.nickname,
          patente: userData.patente,
          joinedServerAt: userData.joinedServerAt,
          createdAccountAt: userData.createdAccountAt,
          premiumSince: userData.premiumSince,
          lastSyncAt: new Date(),
          isActive: true,
        },
      });
    } catch (error) {
      this.logger.error(
        `❌ Erro ao salvar usuário ${userData.nickname}:`,
        error,
      );
      throw error;
    }
  }

  // Método para buscar usuário por nickname (mantido para compatibilidade)
  async buscarUserIdPorNicknameLike(nickname: string): Promise<string | null> {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          nickname: {
            contains: nickname,
            mode: 'insensitive',
          },
          isActive: true,
        },
        select: {
          userId: true, // Corrigido: era discordId
        },
      });

      return user?.userId || null; // Corrigido: era discordId
    } catch (error) {
      this.logger.error(
        `❌ Erro ao buscar usuário por nickname: ${nickname}`,
        error,
      );
      return null;
    }
  }

  // Novo método para buscar dados completos do usuário
  async buscarUsuarioCompleto(userId: string) {
    // Corrigido: era discordId
    try {
      return await this.prisma.user.findUnique({
        where: { userId }, // Corrigido: era discordId
      });
    } catch (error) {
      this.logger.error(`❌ Erro ao buscar usuário completo: ${userId}`, error); // Corrigido: era discordId
      return null;
    }
  }

  // Método para marcar usuários inativos (que saíram do servidor)
  async marcarUsuariosInativos(membrosAtivos: string[]): Promise<void> {
    try {
      await this.prisma.user.updateMany({
        where: {
          userId: {
            // Corrigido: era discordId
            notIn: membrosAtivos,
          },
          isActive: true,
        },
        data: {
          isActive: false,
          lastSyncAt: new Date(),
        },
      });

      this.logger.log('✅ Usuários inativos marcados');
    } catch (error) {
      this.logger.error('❌ Erro ao marcar usuários inativos:', error);
    }
  }

  // Relatório de sincronização
  async gerarRelatorioSincronizacao() {
    try {
      const stats = await this.prisma.user.aggregate({
        _count: true,
        where: { isActive: true },
      });

      const usuariosComPatente = await this.prisma.user.count({
        where: {
          isActive: true,
          patente: { not: null },
        },
      });

      const usuariosRecentes = await this.prisma.user.count({
        where: {
          isActive: true,
          joinedServerAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Últimos 30 dias
          },
        },
      });

      return {
        totalUsuarios: stats._count,
        usuariosComPatente,
        usuariosRecentes,
        ultimaSincronizacao: new Date(),
      };
    } catch (error) {
      this.logger.error('❌ Erro ao gerar relatório:', error);
      return null;
    }
  }
}
