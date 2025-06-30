// src/bot/listeners/controllers/weapon.controller.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { SyncUsersService } from '../../sync/sync-users.service';
import { NotificationService } from '../services/notification.service';
import { BOT_CONFIG } from '../config/bot.config';

@Injectable()
export class WeaponController {
  private readonly logger = new Logger(WeaponController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly syncUsersService: SyncUsersService,
    private readonly notificationService: NotificationService,
  ) {}

  async verificarPermissaoArma(nickname: string): Promise<boolean> {
    try {
      // Busca o usuário pelo nickname para obter a patente
      const user =
        await this.syncUsersService.buscarUserIdPorNicknameLike(nickname);

      if (!user) {
        this.logger.warn(
          `⚠️ Usuário não encontrado para verificação de arma: ${nickname}`,
        );
        return false;
      }

      // Busca a patente do usuário no banco
      const userData = await this.prisma.user.findFirst({
        where: {
          nickname: {
            contains: nickname,
            mode: 'insensitive',
          },
        },
        select: {
          patente: true,
          nickname: true,
        },
      });

      if (!userData || !userData.patente) {
        this.logger.warn(`⚠️ Patente não encontrada para ${nickname}`);
        return false;
      }

      const temPermissao = BOT_CONFIG.WEAPONS.AUTHORIZED_RANKS.includes(
        userData.patente,
      );

      this.logger.log(
        `🔫 Verificação de arma: ${userData.patente} | ${userData.nickname} - ${temPermissao ? 'AUTORIZADO' : 'NÃO AUTORIZADO'}`,
      );

      return temPermissao;
    } catch (error) {
      this.logger.error('❌ Erro ao verificar permissão de arma:', error);
      return false; // Em caso de erro, nega a permissão por segurança
    }
  }

  async processarArmaSemPermissao(
    client: any,
    nickname: string,
    item: string,
    quantidade: number,
    dataHora: Date,
    city: string,
  ) {
    this.logger.warn(
      `🔫 ARMA SEM PERMISSÃO: ${nickname} tentou retirar ${item}`,
    );

    // Busca a patente do usuário
    const userData = await this.prisma.user.findFirst({
      where: {
        nickname: {
          contains: nickname,
          mode: 'insensitive',
        },
      },
      select: {
        patente: true,
      },
    });

    // Registra na tabela ControleArmas
    const controleArmaRecord = await this.prisma.controleArmas.create({
      data: {
        nickname,
        itemSlug: item.toLowerCase(),
        quantidade,
        dataHoraRetirada: dataHora,
        cidade: city,
        patente: userData?.patente || 'Não identificada',
        statusArma: BOT_CONFIG.STATUS.NO_PERMISSION,
      },
    });

    await this.notificationService.enviarAlertaArmaSemPermissao(
      client,
      nickname,
      item,
      quantidade,
      dataHora,
      city,
      controleArmaRecord.id,
    );
  }

  async verificarDevolucaoArma(
    client: any,
    nickname: string,
    item: string,
    quantidade: number,
    dataHora: Date,
    city: string,
  ) {
    try {
      // Busca armas pendentes de devolução na tabela ControleArmas
      const armasPendentes = await this.prisma.controleArmas.findMany({
        where: {
          nickname,
          itemSlug: item.toLowerCase(),
          statusArma: BOT_CONFIG.STATUS.NO_PERMISSION,
        },
        orderBy: {
          dataHoraRetirada: 'asc', // Mais antigas primeiro
        },
      });

      if (armasPendentes.length === 0) {
        this.logger.debug(
          `ℹ️ Nenhuma arma pendente para ${nickname} - ${item}`,
        );
        return;
      }

      let quantidadeParaDevolver = quantidade;
      const armasDevolvidas = [];

      for (const arma of armasPendentes) {
        if (quantidadeParaDevolver <= 0) break;

        const quantidadeADevolver = Math.min(
          quantidadeParaDevolver,
          arma.quantidade,
        );

        // Atualiza o registro da arma
        await this.prisma.controleArmas.update({
          where: { id: arma.id },
          data: {
            statusArma: BOT_CONFIG.STATUS.TOTAL_RETURNED,
            dataHoraDevolucao: dataHora,
          },
        });

        armasDevolvidas.push({
          id: arma.id,
          quantidadeDevolvida: quantidadeADevolver,
          patente: arma.patente,
        });

        quantidadeParaDevolver -= quantidadeADevolver;

        this.logger.log(
          `✅ Arma devolvida: ${nickname} - ${item} - ${quantidadeADevolver} unidades (ID: ${arma.id})`,
        );
      }

      // Envia notificações se houve devoluções de armas
      if (armasDevolvidas.length > 0) {
        await this.notificationService.enviarNotificacaoDevolucaoArma(
          client,
          nickname,
          item,
          armasDevolvidas,
          dataHora,
          city,
        );

        await this.notificationService.enviarDMDevolucaoArma(
          client,
          nickname,
          item,
          armasDevolvidas,
        );
      }
    } catch (error) {
      this.logger.error('❌ Erro ao verificar devolução de arma:', error);
    }
  }
}
