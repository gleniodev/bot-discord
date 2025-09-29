// src/bot/listeners/processors/role.processor.ts
import { Injectable, Logger } from '@nestjs/common';
import { GuildMemberRoleManager, Role } from 'discord.js';
import { PrismaService } from '../../../../prisma/prisma.service';
import { MedalsService } from '../../medals/medals.service';

@Injectable()
export class RoleProcessor {
  private readonly logger = new Logger(RoleProcessor.name);

  private readonly CAVALRY_ROLE_ID = '1347428375710662717';

  constructor(
    private readonly prisma: PrismaService,
    private readonly medalsService: MedalsService,
  ) {}

  async processRoleUpdate(
    userId: string,
    oldRoles: GuildMemberRoleManager,
    newRoles: GuildMemberRoleManager,
  ): Promise<void> {
    try {
      // Verificar se o cargo de cavalaria foi adicionado
      const hadCavalryRole = oldRoles.cache.has(this.CAVALRY_ROLE_ID);
      const hasCavalryRole = newRoles.cache.has(this.CAVALRY_ROLE_ID);

      // Se não tinha o cargo e agora tem, registrar a data
      if (!hadCavalryRole && hasCavalryRole) {
        this.logger.log(`🎖️ Usuário ${userId} recebeu cargo de cavalaria`);

        // Atualizar data do cargo de cavalaria
        await this.medalsService.updateCavalryRoleDate(userId, new Date());

        // Buscar informações do usuário para log
        const user = await this.prisma.user.findUnique({
          where: { userId },
          select: { nickname: true },
        });

        this.logger.log(
          `✅ Data de cavalaria registrada para ${user?.nickname || userId}`,
        );
      }

      // Se tinha o cargo e perdeu, pode ser útil para logs/auditoria
      if (hadCavalryRole && !hasCavalryRole) {
        this.logger.log(`⚠️ Usuário ${userId} perdeu cargo de cavalaria`);

        // Aqui você pode implementar lógica adicional, como:
        // - Marcar usuário como inativo para medalhas
        // - Registrar em log de auditoria
        // - Notificar administradores
      }
    } catch (error) {
      this.logger.error('❌ Erro ao processar atualização de cargo:', error);
    }
  }

  async setupRoleListeners(client: any): Promise<void> {
    client.on('guildMemberUpdate', async (oldMember: any, newMember: any) => {
      try {
        await this.processRoleUpdate(
          newMember.user.id,
          oldMember.roles,
          newMember.roles,
        );
      } catch (error) {
        this.logger.error(
          '❌ Erro no listener de atualização de membro:',
          error,
        );
      }
    });

    this.logger.log('✅ Listeners de cargo configurados');
  }
}
