// src/bot/medals/scanners/cavalry-role.scanner.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { Client, Guild, GuildMember } from 'discord.js';

interface CavalryMember {
  userId: string;
  nickname: string;
  patente?: string;
  cavalryRoleDate: Date;
  joinedServerAt?: Date;
}

@Injectable()
export class CavalryRoleScanner {
  private readonly logger = new Logger(CavalryRoleScanner.name);

  // ID do cargo de cavalaria
  private readonly CAVALRY_ROLE_ID = '1347428375710662717';

  // ID do servidor principal
  private readonly TARGET_GUILD_ID = '1256237388229902389';

  constructor(private readonly prisma: PrismaService) {}

  private limparNickname(nickname: string): string {
    return (
      nickname
        ?.replace(/```/g, '')
        ?.replace(/`/g, '')
        ?.replace(/\n/g, '')
        ?.replace(/\u200B/g, '')
        ?.replace(/[^\w\s\-_.]/g, '')
        ?.trim() || 'Usuario_Desconhecido'
    );
  }

  private extrairPatente(member: GuildMember): string | undefined {
    const patentesHierarquia = [
      'Marshall',
      'Vice-Marshall',
      'Coronel',
      'Superintendente',
      'Major',
      'Sheriff',
      'Capitão',
      'Tenente',
      'Sargento',
      'Cabo',
      'Soldado',
      'Recruta',
    ];

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

  private getServerJoinDate(member: GuildMember): Date {
    // Usar data de entrada no servidor como base para cálculo de tempo de serviço
    if (member.joinedAt) {
      this.logger.log(
        `📅 Usando data de entrada no servidor para ${member.displayName}: ${member.joinedAt.toISOString()}`,
      );
      return member.joinedAt;
    }

    // Fallback: usar data de criação da conta se não tiver joinedAt
    if (member.user.createdAt) {
      this.logger.warn(
        `⚠️ Usando data de criação da conta para ${member.displayName}: ${member.user.createdAt.toISOString()}`,
      );
      return member.user.createdAt;
    }

    // Fallback final: 30 dias atrás
    const dataFallback = new Date();
    dataFallback.setDate(dataFallback.getDate() - 30);

    this.logger.error(
      `❌ Usando fallback (30 dias atrás) para ${member.displayName}: ${dataFallback.toISOString()}`,
    );

    return dataFallback;
  }

  async buscarMembrosComCargoCavalaria(
    client: Client,
  ): Promise<CavalryMember[]> {
    this.logger.log('🏇 Buscando membros com cargo de cavalaria...');

    try {
      const guild = client.guilds.cache.get(this.TARGET_GUILD_ID);
      if (!guild) {
        throw new Error(`Servidor não encontrado: ${this.TARGET_GUILD_ID}`);
      }

      this.logger.log(`📡 Servidor encontrado: ${guild.name} (${guild.id})`);

      // Buscar todos os membros
      await guild.members.fetch();
      const members = guild.members.cache;

      this.logger.log(`👥 Total de membros no servidor: ${members.size}`);

      const cavalryMembers: CavalryMember[] = [];

      // Filtrar membros com cargo de cavalaria
      for (const [, member] of members) {
        // Pular bots
        if (member.user.bot) {
          continue;
        }

        // Verificar se tem o cargo de cavalaria
        const temCargoCavalaria = member.roles.cache.has(this.CAVALRY_ROLE_ID);

        if (!temCargoCavalaria) {
          continue;
        }

        this.logger.log(
          `🏇 Membro com cavalaria encontrado: ${member.displayName}`,
        );

        try {
          // Usar data de entrada no servidor como base para cálculo
          const cavalryRoleDate = this.getServerJoinDate(member);

          const cavalryMember: CavalryMember = {
            userId: member.user.id,
            nickname: this.limparNickname(
              member.nickname || member.user.globalName || member.user.username,
            ),
            patente: this.extrairPatente(member),
            cavalryRoleDate,
            joinedServerAt: member.joinedAt || undefined,
          };

          cavalryMembers.push(cavalryMember);

          this.logger.log(
            `✅ Processado: ${cavalryMember.nickname} - Servidor desde: ${cavalryRoleDate.toISOString()}`,
          );
        } catch (error) {
          this.logger.error(
            `❌ Erro ao processar membro ${member.displayName}:`,
            error,
          );
        }
      }

      this.logger.log(
        `🏇 Total de membros com cavalaria: ${cavalryMembers.length}`,
      );
      return cavalryMembers;
    } catch (error) {
      this.logger.error('❌ Erro ao buscar membros com cavalaria:', error);
      throw error;
    }
  }

  async salvarMembrosNoBanco(cavalryMembers: CavalryMember[]): Promise<void> {
    this.logger.log(`💾 Salvando ${cavalryMembers.length} membros no banco...`);

    let salvos = 0;
    let atualizados = 0;
    let erros = 0;

    for (const member of cavalryMembers) {
      try {
        const resultado = await this.prisma.user.upsert({
          where: {
            userId: member.userId,
          },
          update: {
            nickname: member.nickname,
            patente: member.patente,
            cavalryRoleDate: member.cavalryRoleDate,
            joinedServerAt: member.joinedServerAt,
            isActive: true,
            lastSyncAt: new Date(),
          },
          create: {
            userId: member.userId,
            nickname: member.nickname,
            patente: member.patente,
            cavalryRoleDate: member.cavalryRoleDate,
            joinedServerAt: member.joinedServerAt,
            isActive: true,
            lastSyncAt: new Date(),
          },
        });

        // Verificar se foi criado ou atualizado
        const isNew =
          resultado.createdAt.getTime() === resultado.updatedAt.getTime();

        if (isNew) {
          salvos++;
          this.logger.log(`✅ Novo membro salvo: ${member.nickname}`);
        } else {
          atualizados++;
          this.logger.log(`📝 Membro atualizado: ${member.nickname}`);
        }
      } catch (error) {
        erros++;
        this.logger.error(`❌ Erro ao salvar ${member.nickname}:`, error);
      }
    }

    this.logger.log(`💾 Salvamento concluído:`);
    this.logger.log(`   ✅ Novos: ${salvos}`);
    this.logger.log(`   📝 Atualizados: ${atualizados}`);
    this.logger.log(`   ❌ Erros: ${erros}`);
  }

  async executarScanCompleto(client: Client): Promise<CavalryMember[]> {
    this.logger.log('🚀 Iniciando scan completo de cavalaria...');

    try {
      // Buscar membros com cargo
      const cavalryMembers = await this.buscarMembrosComCargoCavalaria(client);

      if (cavalryMembers.length === 0) {
        this.logger.warn('⚠️ Nenhum membro com cargo de cavalaria encontrado');
        return [];
      }

      // Salvar no banco
      await this.salvarMembrosNoBanco(cavalryMembers);

      this.logger.log('✅ Scan completo de cavalaria concluído');
      return cavalryMembers;
    } catch (error) {
      this.logger.error('❌ Erro no scan completo de cavalaria:', error);
      throw error;
    }
  }
}
