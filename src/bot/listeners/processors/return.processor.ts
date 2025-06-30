import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { NotificationService } from '../services/notification.service';
import { BOT_CONFIG } from '../config/bot.config';

@Injectable()
export class ReturnProcessor {
  private readonly logger = new Logger(ReturnProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  async processarDevolucao(
    client: any,
    nickname: string,
    item: string,
    quantidade: number,
    dataHora: Date,
    city: string,
  ) {
    const excessosPendentes = await this.prisma.excessoItem.findMany({
      where: {
        nickname,
        itemSlug: item.toLowerCase(),
        status: {
          in: [
            BOT_CONFIG.STATUS.PENDING,
            BOT_CONFIG.STATUS.PARTIAL_RETURNED,
            BOT_CONFIG.STATUS.BLOCKED,
          ],
        },
      },
      orderBy: {
        dataHoraRetirada: 'asc', // Mais antigos primeiro
      },
    });

    // Se não há excessos pendentes, é apenas abastecimento do baú
    if (excessosPendentes.length === 0) {
      this.logger.debug(
        `ℹ️ Nenhum excesso pendente para ${nickname} - ${item}. Item adicionado é apenas abastecimento do baú.`,
      );
      return; // Não cria transações nem envia mensagens
    }

    let quantidadeParaDevolver = quantidade;
    const excessosAtualizados = [];

    for (const excesso of excessosPendentes) {
      if (quantidadeParaDevolver <= 0) break;

      const quantidadeJaDevolvida = excesso.quantidadeDevolvida || 0;
      const quantidadeRestante =
        excesso.quantidadeExcesso - quantidadeJaDevolvida;

      if (quantidadeRestante <= 0) continue;

      const quantidadeADevolver = Math.min(
        quantidadeParaDevolver,
        quantidadeRestante,
      );
      const novaQuantidadeDevolvida =
        quantidadeJaDevolvida + quantidadeADevolver;

      // Atualiza o registro de excesso
      const novoStatus =
        novaQuantidadeDevolvida >= excesso.quantidadeExcesso
          ? BOT_CONFIG.STATUS.TOTAL_RETURNED
          : BOT_CONFIG.STATUS.PARTIAL_RETURNED;

      await this.prisma.excessoItem.update({
        where: { id: excesso.id },
        data: {
          quantidadeDevolvida: novaQuantidadeDevolvida,
          dataHoraDevolucao: dataHora,
          status: novoStatus,
        },
      });

      excessosAtualizados.push({
        id: excesso.id,
        quantidadeDevolvida: quantidadeADevolver,
        quantidadeExcesso: excesso.quantidadeExcesso,
        novaQuantidadeDevolvida,
        statusAnterior: excesso.status,
        novoStatus,
      });

      quantidadeParaDevolver -= quantidadeADevolver;

      this.logger.log(
        `✅ Devolução registrada: ${nickname} - ${item} - ${quantidadeADevolver} unidades (ID: ${excesso.id}) - Status: ${novoStatus}`,
      );
    }

    // Só envia notificações se houve realmente devoluções de excesso
    if (excessosAtualizados.length > 0) {
      // Envia notificação de devolução
      await this.notificationService.enviarNotificacaoDevolucao(
        client,
        nickname,
        item,
        excessosAtualizados,
        dataHora,
        city,
      );

      // Envia DM de confirmação para o jogador
      await this.notificationService.enviarDMDevolucao(
        client,
        nickname,
        item,
        excessosAtualizados,
      );
    } else {
      this.logger.debug(
        `ℹ️ Quantidade adicionada (${quantidade}) não corresponde a nenhum excesso pendente para ${nickname} - ${item}. Considerado como abastecimento normal.`,
      );
    }
  }
}
