// src/bot/listeners/checkers/item-limit.checker.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { WeaponController } from '../controllers/weapon.controller';
import { NotificationService } from '../services/notification.service';
import { ReturnProcessor } from '../processors/return.processor';
import { BOT_CONFIG } from '../config/bot.config';

@Injectable()
export class ItemLimitChecker {
  private readonly logger = new Logger(ItemLimitChecker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly weaponController: WeaponController,
    private readonly notificationService: NotificationService,
    private readonly returnProcessor: ReturnProcessor,
  ) {}

  async verificarLimiteItem(
    client: any,
    nickname: string,
    item: string,
    quantidade: number,
    dataHora: Date,
    city: string,
  ) {
    try {
      // Busca limite do item na tabela ItemAlias
      const itemAlias = await this.prisma.itemAlias.findUnique({
        where: { itemSlug: item.toLowerCase() },
      });

      if (!itemAlias) {
        this.logger.debug(`ℹ️ Item não encontrado no alias: ${item}`);
        return;
      }

      // NOVA VERIFICAÇÃO: Controle de armas por patente
      if (itemAlias.categoria === 'ARMA') {
        const temPermissaoArma =
          await this.weaponController.verificarPermissaoArma(nickname);
        if (!temPermissaoArma) {
          await this.weaponController.processarArmaSemPermissao(
            client,
            nickname,
            item,
            quantidade,
            dataHora,
            city,
          );
          return;
        }
      }

      // Verifica as regras do limite
      if (itemAlias.quantidadeMax === null) {
        this.logger.debug(`ℹ️ Item sem limite: ${item}`);
        return;
      }

      if (itemAlias.quantidadeMax === 0) {
        await this.processarItemBloqueado(
          client,
          nickname,
          item,
          quantidade,
          dataHora,
          city,
        );
        return;
      }

      await this.verificarLimiteQuantidade(
        client,
        nickname,
        item,
        quantidade,
        dataHora,
        city,
        itemAlias.quantidadeMax,
      );
    } catch (error) {
      this.logger.error('❌ Erro ao verificar limite:', error);
    }
  }

  async verificarDevolucaoItem(
    client: any,
    nickname: string,
    item: string,
    quantidade: number,
    dataHora: Date,
    city: string,
  ) {
    try {
      // Primeiro verifica se é uma arma sendo devolvida
      await this.weaponController.verificarDevolucaoArma(
        client,
        nickname,
        item,
        quantidade,
        dataHora,
        city,
      );

      // Depois verifica devoluções normais (excesso_item)
      await this.returnProcessor.processarDevolucao(
        client,
        nickname,
        item,
        quantidade,
        dataHora,
        city,
      );
    } catch (error) {
      this.logger.error('❌ Erro ao verificar devolução:', error);
    }
  }

  private async processarItemBloqueado(
    client: any,
    nickname: string,
    item: string,
    quantidade: number,
    dataHora: Date,
    city: string,
  ) {
    this.logger.warn(`🚫 Item BLOQUEADO para retirada: ${item}`);

    // Registra o item bloqueado na tabela de controle
    const excessoRecord = await this.prisma.excessoItem.create({
      data: {
        nickname,
        itemSlug: item.toLowerCase(),
        quantidadeExcesso: quantidade, // Para itens bloqueados, a quantidade retirada é o excesso
        dataHoraRetirada: dataHora,
        cidade: city,
        status: BOT_CONFIG.STATUS.BLOCKED, // Novo status para itens bloqueados
      },
    });

    await this.notificationService.enviarAlertaItemBloqueado(
      client,
      nickname,
      item,
      quantidade,
      dataHora,
      city,
      excessoRecord.id,
    );
  }

  private async verificarLimiteQuantidade(
    client: any,
    nickname: string,
    item: string,
    quantidade: number,
    dataHora: Date,
    city: string,
    quantidadeMax: number,
  ) {
    this.logger.log(`🔍 Verificando limite para ${item}: ${quantidadeMax}`);

    // Novo: início do dia baseado na dataHora recebida
    const inicioDoDia = new Date(dataHora);
    inicioDoDia.setHours(0, 0, 0, 0);

    const total = await this.prisma.itemLog.aggregate({
      where: {
        nickname,
        itemSlug: item.toLowerCase(),
        acao: { contains: 'removido' },
        dataHora: { gte: inicioDoDia },
      },
      _sum: { quantidade: true },
    });

    const totalRetirado = total._sum.quantidade || 0;

    this.logger.log(
      `📊 ${nickname}: ${totalRetirado}/${quantidadeMax} ${item}`,
    );

    if (totalRetirado <= quantidadeMax) {
      this.logger.debug('✅ Dentro do limite');
      return;
    }

    const excessoRetirado = totalRetirado - quantidadeMax;

    this.logger.warn(
      `⚠️ LIMITE ULTRAPASSADO: ${nickname} - ${item} - Excesso: ${excessoRetirado}`,
    );

    // Registra o excesso na tabela de controle
    const excessoRecord = await this.prisma.excessoItem.create({
      data: {
        nickname,
        itemSlug: item.toLowerCase(),
        quantidadeExcesso: excessoRetirado,
        dataHoraRetirada: dataHora,
        cidade: city,
        status: BOT_CONFIG.STATUS.PENDING, // PENDENTE, DEVOLVIDO_PARCIAL, DEVOLVIDO_TOTAL
      },
    });

    // Envia alerta no canal
    await this.notificationService.enviarAlertaCanal(
      client,
      nickname,
      item,
      totalRetirado,
      quantidadeMax,
      dataHora,
      city,
      excessoRecord.id,
    );

    // Envia DM para o jogador
    await this.notificationService.enviarDMJogador(
      client,
      nickname,
      item,
      totalRetirado,
      quantidadeMax,
      excessoRecord.id,
    );
  }
}
