import { EmbedBuilder } from 'discord.js';
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { BotService } from '../bot.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { DateTime } from 'luxon';
import { SyncUsersService } from '../sync/sync-users.service';
import { TextChannel } from 'discord.js';

@Injectable()
export class MessageListener implements OnModuleInit {
  private readonly logger = new Logger(MessageListener.name);

  constructor(
    private readonly botService: BotService,
    private readonly prisma: PrismaService,
    private readonly syncUsersService: SyncUsersService,
  ) {}

  onModuleInit() {
    // Aguardar um pouco para garantir que o BotService terminou o login
    setTimeout(() => {
      this.configurarListeners();
    }, 2000); // 2 segundos de delay
  }

  private configurarListeners() {
    const client = this.botService.getClient();

    if (!client.isReady()) {
      this.logger.warn('⚠️ Bot ainda não está pronto, aguardando...');
      client.once('ready', () => {
        this.logger.log('✅ Bot ficou pronto, configurando listeners...');
        this.adicionarEventListeners();
      });
    } else {
      this.logger.log('✅ Bot já está pronto, configurando listeners...');
      this.adicionarEventListeners();
    }
  }

  private adicionarEventListeners() {
    const client = this.botService.getClient();

    const canaisDeLog = [
      { id: '1357081317623201944', city: 'Valentine' },
      { id: '1361184008536326254', city: 'Tumbleweed' },
      { id: '1361183486760976464', city: 'Strawberry' },
      { id: '1361183042395439134', city: 'Annes' },
      { id: '1361183181482492105', city: 'Saint Denis' },
      { id: '1361183597045747853', city: 'Black Water' },
      { id: '1361183853749993472', city: 'Armadillo' },
      { id: '1368654877063909377', city: 'Rhodes' },
    ];

    const limpar = (valor: string): string =>
      valor
        ?.replace(/```/g, '')
        ?.replace(/`/g, '')
        ?.replace(/\n/g, '')
        ?.replace(/\u200B/g, '')
        ?.replace(/prolog/gi, '')
        ?.replace(/fixo:/gi, '')
        ?.trim() || '';

    client.on('messageCreate', async (message) => {
      try {
        this.logger.debug(
          `📨 Mensagem recebida no canal: ${message.channel.id}`,
        );

        // Ignora mensagens do próprio bot
        if (message.author.id === client.user?.id) {
          return;
        }

        // Verifica se o canal é monitorado
        const canalLog = canaisDeLog.find(
          (canal) => canal.id === message.channel.id,
        );
        if (!canalLog) {
          return;
        }

        this.logger.log(`🎯 Processando mensagem do canal: ${canalLog.city}`);

        // Verifica se a mensagem tem embeds
        if (!message.embeds || message.embeds.length === 0) {
          this.logger.debug('❌ Mensagem sem embeds');
          return;
        }

        const embed = message.embeds[0];
        if (!embed.fields || embed.fields.length === 0) {
          this.logger.debug('❌ Embed sem campos');
          return;
        }

        this.logger.debug(`📋 Embed com ${embed.fields.length} campos`);

        // Procura pelo campo de item
        const itemField = embed.fields.find((field) =>
          ['item removido', 'item adicionado'].some((termo) =>
            field.name.toLowerCase().includes(termo),
          ),
        );

        if (!itemField) {
          this.logger.debug('❌ Campo de item não encontrado');
          return;
        }

        const nomeItem = itemField.value || '';
        const acao = limpar(itemField.name).replace(/:/g, '');

        // Extrai outros campos
        const autorField = embed.fields.find((f) =>
          f.name.toLowerCase().includes('autor'),
        );
        const dataField = embed.fields.find((f) =>
          f.name.toLowerCase().includes('data'),
        );

        const autorRaw = autorField?.value || '';
        const dataRaw = dataField?.value || '';

        if (!autorRaw || !dataRaw) {
          this.logger.warn('⚠️ Campos autor ou data não encontrados');
          return;
        }

        // Extrai item e quantidade
        const matchItem = nomeItem.match(/(.+?)\s*x(\d+)/i);
        const item = matchItem?.[1]?.trim() || nomeItem.trim();
        const quantidade = Number(matchItem?.[2]) || 1;

        // Extrai nickname e fixo
        const [nicknameRaw, fixoRaw] = autorRaw.split('|');
        const nickname = limpar(nicknameRaw || autorRaw);
        const fixo = limpar(fixoRaw || 'n/a');

        if (!nickname) {
          this.logger.warn('⚠️ Nickname não encontrado');
          return;
        }

        // Converte data
        let dataHora: Date;
        try {
          dataHora = DateTime.fromFormat(
            limpar(dataRaw),
            'dd/LL/yyyy - HH:mm:ss',
          ).toJSDate();
        } catch (error) {
          this.logger.error('❌ Erro ao converter data:', dataRaw, error);
          dataHora = new Date(); // Usar data atual como fallback
        }

        this.logger.log(
          `📝 Processando: ${nickname} - ${acao} - ${item} x${quantidade}`,
        );

        // Salva no banco
        try {
          await this.prisma.itemLog.create({
            data: {
              nickname,
              fixo,
              itemSlug: item.toLowerCase(),
              quantidade,
              acao,
              cidade: canalLog.city,
              dataHora,
            },
          });
          this.logger.log('✅ Log salvo no banco com sucesso');
        } catch (error) {
          this.logger.error('❌ Erro ao salvar no banco:', error);
          return; // Para aqui se não conseguir salvar
        }

        // Verifica se é item removido (controle de limite)
        if (acao.toLowerCase().includes('removido')) {
          await this.verificarLimiteItem(
            client,
            nickname,
            item,
            quantidade,
            dataHora,
            canalLog.city,
          );
        }

        // Verifica se é item adicionado (possível devolução)
        if (acao.toLowerCase().includes('adicionado')) {
          await this.verificarDevolucaoItem(
            client,
            nickname,
            item,
            quantidade,
            dataHora,
            canalLog.city,
          );
        }
      } catch (error) {
        this.logger.error('❌ Erro geral ao processar mensagem:', error);
      }
    });

    this.logger.log('✅ Listeners configurados com sucesso');
  }

  private async verificarLimiteItem(
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
        const temPermissaoArma = await this.verificarPermissaoArma(nickname);
        if (!temPermissaoArma) {
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
              statusArma: 'SEM_PERMISSAO',
            },
          });

          await this.enviarAlertaArmaSemPermissao(
            client,
            nickname,
            item,
            quantidade,
            dataHora,
            city,
            controleArmaRecord.id,
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
        this.logger.warn(`🚫 Item BLOQUEADO para retirada: ${item}`);

        // Registra o item bloqueado na tabela de controle
        const excessoRecord = await this.prisma.excessoItem.create({
          data: {
            nickname,
            itemSlug: item.toLowerCase(),
            quantidadeExcesso: quantidade, // Para itens bloqueados, a quantidade retirada é o excesso
            dataHoraRetirada: dataHora,
            cidade: city,
            status: 'BLOQUEADO', // Novo status para itens bloqueados
          },
        });

        await this.enviarAlertaItemBloqueado(
          client,
          nickname,
          item,
          quantidade,
          dataHora,
          city,
          excessoRecord.id, // Passa o ID da transação
        );
        return;
      }

      this.logger.log(
        `🔍 Verificando limite para ${item}: ${itemAlias.quantidadeMax}`,
      );

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
        `📊 ${nickname}: ${totalRetirado}/${itemAlias.quantidadeMax} ${item}`,
      );

      if (totalRetirado <= itemAlias.quantidadeMax) {
        this.logger.debug('✅ Dentro do limite');
        return;
      }

      const excessoRetirado = totalRetirado - itemAlias.quantidadeMax;

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
          status: 'PENDENTE', // PENDENTE, DEVOLVIDO_PARCIAL, DEVOLVIDO_TOTAL
        },
      });

      // Envia alerta no canal
      await this.enviarAlertaCanal(
        client,
        nickname,
        item,
        totalRetirado,
        itemAlias.quantidadeMax,
        dataHora,
        city,
        excessoRecord.id,
      );

      // Envia DM para o jogador
      await this.enviarDMJogador(
        client,
        nickname,
        item,
        totalRetirado,
        itemAlias.quantidadeMax,
        excessoRecord.id,
      );
    } catch (error) {
      this.logger.error('❌ Erro ao verificar limite:', error);
    }
  }

  private async verificarDevolucaoItem(
    client: any,
    nickname: string,
    item: string,
    quantidade: number,
    dataHora: Date,
    city: string,
  ) {
    try {
      // Primeiro verifica se é uma arma sendo devolvida
      await this.verificarDevolucaoArma(
        client,
        nickname,
        item,
        quantidade,
        dataHora,
        city,
      );

      // Depois verifica devoluções normais (excesso_item)
      const excessosPendentes = await this.prisma.excessoItem.findMany({
        where: {
          nickname,
          itemSlug: item.toLowerCase(),
          status: { in: ['PENDENTE', 'DEVOLVIDO_PARCIAL', 'BLOQUEADO'] },
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
            ? 'DEVOLVIDO_TOTAL'
            : 'DEVOLVIDO_PARCIAL';

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
        await this.enviarNotificacaoDevolucao(
          client,
          nickname,
          item,
          excessosAtualizados,
          dataHora,
          city,
        );

        // Envia DM de confirmação para o jogador
        await this.enviarDMDevolucao(
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
    } catch (error) {
      this.logger.error('❌ Erro ao verificar devolução:', error);
    }
  }

  private async verificarDevolucaoArma(
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
          statusArma: 'SEM_PERMISSAO',
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
            statusArma: 'DEVOLVIDO_TOTAL',
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
        await this.enviarNotificacaoDevolucaoArma(
          client,
          nickname,
          item,
          armasDevolvidas,
          dataHora,
          city,
        );

        await this.enviarDMDevolucaoArma(
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

  private async verificarPermissaoArma(nickname: string): Promise<boolean> {
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

      // Lista de patentes autorizadas para retirar armas
      const patentesAutorizadas = [
        'Capitão',
        'Sheriff',
        'Major',
        'Superintendente',
        'Coronel',
        'Vice-Marshall',
        'Marshall',
      ];

      const temPermissao = patentesAutorizadas.includes(userData.patente);

      this.logger.log(
        `🔫 Verificação de arma: ${userData.patente} | ${userData.nickname} - ${temPermissao ? 'AUTORIZADO' : 'NÃO AUTORIZADO'}`,
      );

      return temPermissao;
    } catch (error) {
      this.logger.error('❌ Erro ao verificar permissão de arma:', error);
      return false; // Em caso de erro, nega a permissão por segurança
    }
  }

  private async enviarAlertaArmaSemPermissao(
    client: any,
    nickname: string,
    item: string,
    quantidade: number,
    dataHora: Date,
    city: string,
    transacaoId: number,
  ) {
    try {
      const alertChannelId = '1385324608558862366'; // Canal específico para armas
      const alertChannel = client.channels.cache.get(
        alertChannelId,
      ) as TextChannel;

      if (!alertChannel) {
        this.logger.error(
          `❌ Canal de alerta de armas não encontrado: ${alertChannelId}`,
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
          {
            name: '✅ Patentes Autorizadas:',
            value:
              'Capitão, Sheriff, Major, Superintendente, Coronel, Vice-Marshall, Marshall',
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

  private async enviarDMArmaSemPermissao(
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
        `✅ **Patentes autorizadas:**\n` +
        `• Capitão\n• Sheriff\n• Major\n• Superintendente\n• Coronel\n• Vice-Marshall\n• Marshall\n\n` +
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

  private async enviarNotificacaoDevolucaoArma(
    client: any,
    nickname: string,
    item: string,
    armasDevolvidas: any[],
    dataHora: Date,
    city: string,
  ) {
    try {
      const alertChannelId = '1385324608558862366'; // Canal específico para armas
      const alertChannel = client.channels.cache.get(
        alertChannelId,
      ) as TextChannel;

      if (!alertChannel) {
        this.logger.error(
          `❌ Canal de alerta de armas não encontrado: ${alertChannelId}`,
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

  private async enviarDMDevolucaoArma(
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

  private async enviarAlertaItemBloqueado(
    client: any,
    nickname: string,
    item: string,
    quantidade: number,
    dataHora: Date,
    city: string,
    transacaoId: number,
  ) {
    try {
      const alertChannelId = '1383496200988266607';
      const alertChannel = client.channels.cache.get(
        alertChannelId,
      ) as TextChannel;

      if (!alertChannel) {
        this.logger.error(
          `❌ Canal de alerta não encontrado: ${alertChannelId}`,
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

  private async enviarDMItemBloqueado(
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

  private async enviarAlertaCanal(
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
      const alertChannelId = '1383496200988266607';
      const alertChannel = client.channels.cache.get(
        alertChannelId,
      ) as TextChannel;

      if (!alertChannel) {
        this.logger.error(
          `❌ Canal de alerta não encontrado: ${alertChannelId}`,
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

  private async enviarNotificacaoDevolucao(
    client: any,
    nickname: string,
    item: string,
    excessosAtualizados: any[],
    dataHora: Date,
    city: string,
  ) {
    try {
      const alertChannelId = '1383496200988266607';
      const alertChannel = client.channels.cache.get(
        alertChannelId,
      ) as TextChannel;

      if (!alertChannel) {
        this.logger.error(
          `❌ Canal de alerta não encontrado: ${alertChannelId}`,
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

  private async enviarDMJogador(
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

  private async enviarDMDevolucao(
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
