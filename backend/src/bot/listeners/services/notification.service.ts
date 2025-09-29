import { Injectable, Logger } from '@nestjs/common';
import { EmbedBuilder } from 'discord.js';
import { TextChannel } from 'discord.js';
import { DateTime } from 'luxon';
import { PrismaService } from '../../../../prisma/prisma.service';
import { SyncUsersService } from '../../sync/sync-users.service';
import { BOT_CONFIG } from '../config/bot.config';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  private readonly alertChannelId = BOT_CONFIG.CHANNELS.ITEM_ALERT_CHANNEL_ID;
  private readonly weaponAlertChannelId =
    BOT_CONFIG.CHANNELS.WEAPON_ALERT_CHANNEL_ID;

  constructor(
    private readonly prisma: PrismaService,
    private readonly syncUsersService: SyncUsersService,
  ) {}

  async enviarAlertaCanal(
    client: any,
    nickname: string,
    item: string,
    totalRetirado: number,
    limite: number,
    dataHora: Date,
    city: string,
    transacaoId: number,
  ) {
    try {
      const alertChannel = client.channels.cache.get(
        this.alertChannelId,
      ) as TextChannel;

      if (!alertChannel) {
        this.logger.error(
          `❌ Canal de alerta não encontrado: ${this.alertChannelId}`,
        );
        return;
      }

      if (!alertChannel.isTextBased()) {
        this.logger.error('❌ Canal de alerta não é baseado em texto');
        return;
      }

      const dataFormatada = DateTime.fromJSDate(dataHora).toFormat(
        'dd/LL/yyyy - HH:mm:ss',
      );

      const mensagem = new EmbedBuilder()
        .setTitle('📦 CONTROLE DO BAÚ')
        .setDescription('**LIMITE DE RETIRADA EXCEDIDO**')
        .addFields(
          {
            name: 'Autor:',
            value: nickname,
            inline: true,
          },
          {
            name: 'Item:',
            value: item,
            inline: true,
          },
          {
            name: 'Retirado:',
            value: `${totalRetirado} (limite: ${limite})`,
            inline: true,
          },
          {
            name: '📅 Data:',
            value: dataFormatada,
            inline: false,
          },
          {
            name: '🏘️ Cidade:',
            value: city,
            inline: false,
          },
          {
            name: '🆔 ID da Transação:',
            value: `#${transacaoId}`,
            inline: false,
          },
        )
        .setColor(0xff4444); // Cor vermelha para alerta

      await alertChannel.send({ embeds: [mensagem] });
      this.logger.log('✅ Alerta enviado para o canal');
    } catch (error) {
      this.logger.error('❌ Erro ao enviar alerta no canal:', error);
    }
  }

  async enviarAlertaItemBloqueado(
    client: any,
    nickname: string,
    item: string,
    quantidade: number,
    dataHora: Date,
    city: string,
    transacaoId: number,
  ) {
    try {
      const alertChannel = client.channels.cache.get(
        this.alertChannelId,
      ) as TextChannel;

      if (!alertChannel) {
        this.logger.error(
          `❌ Canal de alerta não encontrado: ${this.alertChannelId}`,
        );
        return;
      }

      const dataFormatada = DateTime.fromJSDate(dataHora).toFormat(
        'dd/LL/yyyy - HH:mm:ss',
      );

      const mensagem = new EmbedBuilder()
        .setTitle('🚫 CONTROLE DO BAÚ')
        .setDescription('**ITEM BLOQUEADO PARA RETIRADA**')
        .addFields(
          {
            name: 'Autor:',
            value: nickname,
            inline: true,
          },
          {
            name: 'Item:',
            value: item,
            inline: true,
          },
          {
            name: 'Retirado:',
            value: `${quantidade}`,
            inline: true,
          },
          {
            name: '📅 Data:',
            value: dataFormatada,
            inline: false,
          },
          {
            name: '🏘️ Cidade:',
            value: city,
            inline: false,
          },
          {
            name: '⚠️ Status:',
            value: 'Este item está BLOQUEADO para retirada',
            inline: false,
          },
          {
            name: '🆔 ID da Transação:',
            value: `#${transacaoId}`,
            inline: false,
          },
        )
        .setColor(0xff0000); // Cor vermelha mais forte para bloqueio

      await alertChannel.send({ embeds: [mensagem] });
      this.logger.log('✅ Alerta de item bloqueado enviado para o canal');

      // Envia DM para o jogador sobre o item bloqueado
      await this.enviarDMItemBloqueado(
        client,
        nickname,
        item,
        quantidade,
        transacaoId,
      );
    } catch (error) {
      this.logger.error('❌ Erro ao enviar alerta de item bloqueado:', error);
    }
  }

  async enviarAlertaArmaSemPermissao(
    client: any,
    nickname: string,
    item: string,
    quantidade: number,
    dataHora: Date,
    city: string,
    transacaoId: number,
  ) {
    try {
      const alertChannel = client.channels.cache.get(
        this.weaponAlertChannelId,
      ) as TextChannel;

      if (!alertChannel) {
        this.logger.error(
          `❌ Canal de alerta de armas não encontrado: ${this.weaponAlertChannelId}`,
        );
        return;
      }

      const dataFormatada = DateTime.fromJSDate(dataHora).toFormat(
        'dd/LL/yyyy - HH:mm:ss',
      );

      // Busca a patente do usuário para mostrar no alerta
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

      const patente = userData?.patente || 'Não identificada';

      const mensagem = new EmbedBuilder()
        .setTitle('🔫 CONTROLE DE ARMAS')
        .setDescription('**RETIRADA DE ARMA SEM PERMISSÃO**')
        .addFields(
          {
            name: 'Autor:',
            value: nickname,
            inline: true,
          },
          {
            name: 'Patente:',
            value: patente,
            inline: true,
          },
          {
            name: 'Arma:',
            value: item,
            inline: true,
          },
          {
            name: 'Quantidade:',
            value: `${quantidade}`,
            inline: true,
          },
          {
            name: '📅 Data:',
            value: dataFormatada,
            inline: false,
          },
          {
            name: '🏘️ Cidade:',
            value: city,
            inline: false,
          },
          {
            name: '⚠️ Status:',
            value: 'Patente SEM AUTORIZAÇÃO para retirar armas',
            inline: false,
          },
          {
            name: '🆔 ID da Transação:',
            value: `#${transacaoId}`,
            inline: false,
          },
        )
        .setColor(0xdc143c); // Cor vermelha escura (crimson) para armas

      await alertChannel.send({ embeds: [mensagem] });
      this.logger.log('✅ Alerta de arma sem permissão enviado para o canal');

      // Envia DM para o jogador sobre a arma sem permissão
      await this.enviarDMArmaSemPermissao(
        client,
        nickname,
        item,
        quantidade,
        transacaoId,
        patente,
      );
    } catch (error) {
      this.logger.error(
        '❌ Erro ao enviar alerta de arma sem permissão:',
        error,
      );
    }
  }

  async enviarNotificacaoDevolucao(
    client: any,
    nickname: string,
    item: string,
    excessosAtualizados: any[],
    dataHora: Date,
    city: string,
  ) {
    try {
      const alertChannel = client.channels.cache.get(
        this.alertChannelId,
      ) as TextChannel;

      if (!alertChannel) {
        this.logger.error(
          `❌ Canal de alerta não encontrado: ${this.alertChannelId}`,
        );
        return;
      }

      const dataFormatada = DateTime.fromJSDate(dataHora).toFormat(
        'dd/LL/yyyy - HH:mm:ss',
      );
      const totalDevolvido = excessosAtualizados.reduce(
        (sum, ex) => sum + ex.quantidadeDevolvida,
        0,
      );

      // Determina se há transações completamente devolvidas e pendentes
      const transacoesCompletas = excessosAtualizados.filter(
        (ex) => ex.novoStatus === 'DEVOLVIDO_TOTAL',
      );
      const transacoesParciais = excessosAtualizados.filter(
        (ex) => ex.novoStatus === 'DEVOLVIDO_PARCIAL',
      );

      let descricao = '**ITEM DEVOLVIDO**';
      let cor = 0x44ff44; // Verde

      if (transacoesCompletas.length > 0 && transacoesParciais.length === 0) {
        descricao = '**DEVOLUÇÃO COMPLETA ✅**';
        cor = 0x00ff00; // Verde mais forte
      } else if (transacoesParciais.length > 0) {
        descricao = '**DEVOLUÇÃO PARCIAL ⚠️**';
        cor = 0xffaa00; // Laranja
      }

      // Detalhes das transações
      let detalhesTransacoes = '';
      excessosAtualizados.forEach((ex) => {
        const restante = ex.quantidadeExcesso - ex.novaQuantidadeDevolvida;
        detalhesTransacoes += `#${ex.id}: ${ex.quantidadeDevolvida} devolvidas`;

        if (ex.novoStatus === 'DEVOLVIDO_TOTAL') {
          detalhesTransacoes += ' ✅ COMPLETA\n';
        } else {
          detalhesTransacoes += ` (restam ${restante}) ⚠️\n`;
        }
      });

      const mensagem = new EmbedBuilder()
        .setTitle('📦 CONTROLE DO BAÚ')
        .setDescription(descricao)
        .addFields(
          {
            name: 'Autor:',
            value: nickname,
            inline: false,
          },
          {
            name: 'Item:',
            value: item,
            inline: true,
          },
          {
            name: 'Devolvido:',
            value: `${totalDevolvido}`,
            inline: true,
          },
          {
            name: '📅 Data Devolução:',
            value: dataFormatada,
            inline: false,
          },
          {
            name: '🏘️ Cidade:',
            value: city,
            inline: false,
          },
          {
            name: '🆔 Status das Transações:',
            value: detalhesTransacoes.trim(),
            inline: false,
          },
        )
        .setColor(cor);

      await alertChannel.send({ embeds: [mensagem] });
      this.logger.log('✅ Notificação de devolução enviada para o canal');
    } catch (error) {
      this.logger.error('❌ Erro ao enviar notificação de devolução:', error);
    }
  }

  async enviarNotificacaoDevolucaoArma(
    client: any,
    nickname: string,
    item: string,
    armasDevolvidas: any[],
    dataHora: Date,
    city: string,
  ) {
    try {
      const alertChannel = client.channels.cache.get(
        this.weaponAlertChannelId,
      ) as TextChannel;

      if (!alertChannel) {
        this.logger.error(
          `❌ Canal de alerta de armas não encontrado: ${this.weaponAlertChannelId}`,
        );
        return;
      }

      const dataFormatada = DateTime.fromJSDate(dataHora).toFormat(
        'dd/LL/yyyy - HH:mm:ss',
      );
      const totalDevolvido = armasDevolvidas.reduce(
        (sum, arma) => sum + arma.quantidadeDevolvida,
        0,
      );

      const detalhesTransacoes = armasDevolvidas
        .map(
          (arma) =>
            `#${arma.id}: ${arma.quantidadeDevolvida} unidades ✅ DEVOLVIDA`,
        )
        .join('\n');

      const mensagem = new EmbedBuilder()
        .setTitle('🔫 CONTROLE DE ARMAS')
        .setDescription('**ARMA DEVOLVIDA ✅**')
        .addFields(
          {
            name: 'Autor:',
            value: nickname,
            inline: false,
          },
          {
            name: 'Arma:',
            value: item,
            inline: true,
          },
          {
            name: 'Quantidade Devolvida:',
            value: `${totalDevolvido}`,
            inline: true,
          },
          {
            name: '📅 Data Devolução:',
            value: dataFormatada,
            inline: false,
          },
          {
            name: '🏘️ Cidade:',
            value: city,
            inline: false,
          },
          {
            name: '🆔 Transações Finalizadas:',
            value: detalhesTransacoes,
            inline: false,
          },
        )
        .setColor(0x228b22); // Verde floresta para devolução de arma

      await alertChannel.send({ embeds: [mensagem] });
      this.logger.log(
        '✅ Notificação de devolução de arma enviada para o canal',
      );
    } catch (error) {
      this.logger.error(
        '❌ Erro ao enviar notificação de devolução de arma:',
        error,
      );
    }
  }

  // Métodos para DMs
  async enviarDMJogador(
    client: any,
    nickname: string,
    item: string,
    totalRetirado: number,
    limite: number,
    transacaoId: number,
  ) {
    try {
      // Busca userId pelo nickname usando LIKE (busca que contém)
      const userId =
        await this.syncUsersService.buscarUserIdPorNicknameLike(nickname);

      if (!userId) {
        this.logger.warn(
          `❌ UserId não encontrado para nickname que contenha: ${nickname}`,
        );
        return;
      }

      this.logger.log(`🔍 UserId encontrado com busca LIKE: ${userId}`);
      await this.enviarDMParaUser(
        client,
        userId,
        nickname,
        item,
        totalRetirado,
        limite,
        transacaoId,
      );
    } catch (error) {
      this.logger.error(`❌ Erro ao enviar DM para ${nickname}:`, error);
    }
  }

  async enviarDMItemBloqueado(
    client: any,
    nickname: string,
    item: string,
    quantidade: number,
    transacaoId: number,
  ) {
    try {
      const userId =
        await this.syncUsersService.buscarUserIdPorNicknameLike(nickname);

      if (!userId) {
        this.logger.warn(
          `❌ UserId não encontrado para item bloqueado: ${nickname}`,
        );
        return;
      }

      const user = await client.users.fetch(userId);
      if (!user) {
        this.logger.error(`❌ Usuário não encontrado no Discord: ${userId}`);
        return;
      }

      const mensagemDM =
        `🚫 **ITEM BLOQUEADO**\n\n` +
        `Você tentou retirar **${quantidade}x ${item}**, mas **você não tem autorização para retirar esse item**.\n\n` +
        `🆔 **ID da Transação:** #${transacaoId}\n\n` +
        `❌ **Devolva o item ao baú imediatamente, sob risco de punição**\n\n` +
        `Por favor, entre em contato com a corregedoria para mais informações ou para solicitar liberação especial.`;

      await user.send(mensagemDM);
      this.logger.log(
        `✅ DM de item bloqueado enviada para ${nickname} (${userId})`,
      );
    } catch (error) {
      this.logger.error(`❌ Erro ao enviar DM de item bloqueado:`, error);
    }
  }

  async enviarDMArmaSemPermissao(
    client: any,
    nickname: string,
    item: string,
    quantidade: number,
    transacaoId: number,
    patente: string,
  ) {
    try {
      const userId =
        await this.syncUsersService.buscarUserIdPorNicknameLike(nickname);

      if (!userId) {
        this.logger.warn(
          `❌ UserId não encontrado para arma sem permissão: ${nickname}`,
        );
        return;
      }

      const user = await client.users.fetch(userId);
      if (!user) {
        this.logger.error(`❌ Usuário não encontrado no Discord: ${userId}`);
        return;
      }

      const mensagemDM =
        `🔫 **ARMA SEM AUTORIZAÇÃO**\n\n` +
        `Você tentou retirar **${quantidade}x ${item}**, mas **sua patente não tem autorização para retirar armas**.\n\n` +
        `👮 **Sua patente:** ${patente}\n` +
        `🆔 **ID da Transação:** #${transacaoId}\n\n` +
        `❌ **Devolva a arma ao baú imediatamente, sob risco de punição**\n\n` +
        `Para solicitar autorização, entre em contato com um superior hierárquico.`;

      await user.send(mensagemDM);
      this.logger.log(
        `✅ DM de arma sem permissão enviada para ${nickname} (${userId})`,
      );
    } catch (error) {
      this.logger.error(`❌ Erro ao enviar DM de arma sem permissão:`, error);
    }
  }

  async enviarDMDevolucao(
    client: any,
    nickname: string,
    item: string,
    excessosAtualizados: any[],
  ) {
    try {
      // Busca userId pelo nickname usando LIKE
      const userId =
        await this.syncUsersService.buscarUserIdPorNicknameLike(nickname);

      if (!userId) {
        this.logger.warn(
          `❌ UserId não encontrado para devolução: ${nickname}`,
        );
        return;
      }

      // Busca o usuário no Discord
      const user = await client.users.fetch(userId);
      if (!user) {
        this.logger.error(`❌ Usuário não encontrado no Discord: ${userId}`);
        return;
      }

      const transacoesCompletas = excessosAtualizados.filter(
        (ex) => ex.novoStatus === 'DEVOLVIDO_TOTAL',
      );
      const transacoesParciais = excessosAtualizados.filter(
        (ex) => ex.novoStatus === 'DEVOLVIDO_PARCIAL',
      );

      let mensagemDM = '';

      if (transacoesCompletas.length > 0 && transacoesParciais.length === 0) {
        // Todas as transações foram completamente devolvidas
        const mensagensEngraçadas = [
          'Parabéns, oficial! Você conseguiu devolver tudo! 🎉 Agora pode dormir tranquilo sem a consciência pesada! 😴',
          'Uau! Devolução completa! 🏆 Você é mais confiável que um relógio suíço! ⏰',
          'Excelente trabalho! 👏 Todas as dívidas quitadas! Pode ir ao baú novamente sem medo da corregedoria! 😎',
          'Perfeito! ✨ Você devolveu tudo certinho! Até o xerife ficaria orgulhoso! 🤠',
          'Missão cumprida, oficial! 🎯 Devolução 100% completa! Agora você pode andar de cabeça erguida pela cidade! 😁',
        ];

        const mensagemAleatoria =
          mensagensEngraçadas[
            Math.floor(Math.random() * mensagensEngraçadas.length)
          ];

        mensagemDM =
          `✅ **DEVOLUÇÃO COMPLETA!**\n\n` +
          `Todas as suas transações de **${item}** foram quitadas com sucesso!\n\n` +
          `📋 **Transações finalizadas:**\n`;

        transacoesCompletas.forEach((ex) => {
          mensagemDM += `• ID #${ex.id}: ${ex.quantidadeDevolvida} unidades ✅\n`;
        });

        mensagemDM += `\n🎊 ${mensagemAleatoria}`;
      } else if (transacoesParciais.length > 0) {
        // Há transações parcialmente devolvidas
        const totalDevolvido = excessosAtualizados.reduce(
          (sum, ex) => sum + ex.quantidadeDevolvida,
          0,
        );
        const totalRestante = excessosAtualizados.reduce(
          (sum, ex) =>
            sum + (ex.quantidadeExcesso - ex.novaQuantidadeDevolvida),
          0,
        );

        mensagemDM =
          `📦 **DEVOLUÇÃO PARCIAL REGISTRADA**\n\n` +
          `Obrigado por devolver **${totalDevolvido}x ${item}**!\n\n` +
          `📋 **Status das transações:**\n`;

        excessosAtualizados.forEach((ex) => {
          const restante = ex.quantidadeExcesso - ex.novaQuantidadeDevolvida;
          if (ex.novoStatus === 'DEVOLVIDO_TOTAL') {
            mensagemDM += `• ID #${ex.id}: ${ex.quantidadeDevolvida} unidades ✅ COMPLETA\n`;
          } else {
            mensagemDM += `• ID #${ex.id}: ${ex.quantidadeDevolvida} devolvidas (restam ${restante}) ⚠️\n`;
          }
        });

        mensagemDM +=
          `\n⚠️ **Ainda falta devolver: ${totalRestante}x ${item}**\n\n` +
          `Por favor, continue devolvendo quando possível. A cada devolução você receberá uma atualização! 📬`;

        // Se tem transações completas também
        if (transacoesCompletas.length > 0) {
          mensagemDM += `\n\n🎉 Algumas transações foram completamente quitadas! Parabéns pelo progresso! 👍`;
        }
      }

      await user.send(mensagemDM);
      this.logger.log(
        `✅ DM de devolução enviada para ${nickname} (${userId})`,
      );
    } catch (error) {
      this.logger.error(`❌ Erro ao enviar DM de devolução:`, error);
    }
  }

  async enviarDMDevolucaoArma(
    client: any,
    nickname: string,
    item: string,
    armasDevolvidas: any[],
  ) {
    try {
      const userId =
        await this.syncUsersService.buscarUserIdPorNicknameLike(nickname);

      if (!userId) {
        this.logger.warn(
          `❌ UserId não encontrado para devolução de arma: ${nickname}`,
        );
        return;
      }

      const user = await client.users.fetch(userId);
      if (!user) {
        this.logger.error(`❌ Usuário não encontrado no Discord: ${userId}`);
        return;
      }

      const totalDevolvido = armasDevolvidas.reduce(
        (sum, arma) => sum + arma.quantidadeDevolvida,
        0,
      );

      const mensagensEngraçadas = [
        'Arma devolvida com sucesso! 🎯 Agora você pode relaxar, a corregedoria não está mais no seu encalço! 😌',
        'Perfeito! 🏆 Arma devolvida! Você provou que é um oficial responsável! 🤠',
        'Excelente! ✨ Devolução completa! Até o Marshal ficaria impressionado com sua honestidade! 🎖️',
        'Missão cumprida, oficial! 🎯 Arma devolvida com sucesso! Pode voltar ao trabalho tranquilo! 👮',
        'Ótimo trabalho! 👏 Devolução realizada! Sua ficha está limpa novamente! 📋✅',
      ];

      const mensagemAleatoria =
        mensagensEngraçadas[
          Math.floor(Math.random() * mensagensEngraçadas.length)
        ];

      let mensagemDM =
        `🔫 **ARMA DEVOLVIDA COM SUCESSO!**\n\n` +
        `Você devolveu **${totalDevolvido}x ${item}** com sucesso!\n\n` +
        `📋 **Transações finalizadas:**\n`;

      armasDevolvidas.forEach((arma) => {
        mensagemDM += `• ID #${arma.id}: ${arma.quantidadeDevolvida} unidades ✅\n`;
      });

      mensagemDM += `\n🎊 ${mensagemAleatoria}`;

      await user.send(mensagemDM);
      this.logger.log(
        `✅ DM de devolução de arma enviada para ${nickname} (${userId})`,
      );
    } catch (error) {
      this.logger.error(`❌ Erro ao enviar DM de devolução de arma:`, error);
    }
  }

  private async enviarDMParaUser(
    client: any,
    userId: string,
    nickname: string,
    item: string,
    totalRetirado: number,
    limite: number,
    transacaoId: number,
  ) {
    try {
      // Busca o usuário no Discord
      const user = await client.users.fetch(userId);
      if (!user) {
        this.logger.error(`❌ Usuário não encontrado no Discord: ${userId}`);
        return;
      }

      const excesso = totalRetirado - limite;

      // Envia DM
      const mensagemDM =
        `⚠️ **Limite Diário Ultrapassado**\n\n` +
        `Você retirou **${totalRetirado}x ${item}** hoje.\n` +
        `O limite diário é de **${limite}** unidades.\n` +
        `**Excesso:** ${excesso} unidades\n\n` +
        `🆔 **ID da Transação:** #${transacaoId}\n\n` +
        `Por favor, devolva o excesso ou entre em contato com a corregedoria informando o ID da transação.\n` +
        `Quando devolver, será enviada uma confirmação automática com o status atualizado! 📬`;

      await user.send(mensagemDM);
      this.logger.log(`✅ DM enviada para ${nickname} (${userId})`);
    } catch (error) {
      this.logger.error(`❌ Erro ao enviar DM para userId ${userId}:`, error);

      // Log mais detalhado do erro
      if (error.code === 50007) {
        this.logger.warn(`⚠️ Usuário ${nickname} não aceita DMs de não-amigos`);
      } else if (error.code === 10013) {
        this.logger.warn(`⚠️ Usuário ${nickname} não encontrado no Discord`);
      }
    }
  }
}
