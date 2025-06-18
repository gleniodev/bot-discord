// import { EmbedBuilder } from 'discord.js';
// import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
// import { BotService } from '../bot.service';
// import { PrismaService } from '../../../prisma/prisma.service';
// import { DateTime } from 'luxon';
// import { SyncUsersService } from '../sync/sync-users.service';
// import { TextChannel } from 'discord.js';

// @Injectable()
// export class MessageListener implements OnModuleInit {
//   private readonly logger = new Logger(MessageListener.name);

//   constructor(
//     private readonly botService: BotService,
//     private readonly prisma: PrismaService,
//     private readonly syncUsersService: SyncUsersService,
//   ) {}

//   onModuleInit() {
//     // Aguardar um pouco para garantir que o BotService terminou o login
//     setTimeout(() => {
//       this.configurarListeners();
//     }, 2000); // 2 segundos de delay
//   }

//   private configurarListeners() {
//     const client = this.botService.getClient();

//     if (!client.isReady()) {
//       this.logger.warn('⚠️ Bot ainda não está pronto, aguardando...');
//       client.once('ready', () => {
//         this.logger.log('✅ Bot ficou pronto, configurando listeners...');
//         this.adicionarEventListeners();
//       });
//     } else {
//       this.logger.log('✅ Bot já está pronto, configurando listeners...');
//       this.adicionarEventListeners();
//     }
//   }

//   private adicionarEventListeners() {
//     const client = this.botService.getClient();

//     const canaisDeLog = [
//       { id: '1357081317623201944', city: 'Valentine' },
//       { id: '1361184008536326254', city: 'Tumbleweed' },
//       { id: '1361183486760976464', city: 'Strawberry' },
//       { id: '1361183042395439134', city: 'Annes' },
//       { id: '1361183181482492105', city: 'Saint Denis' },
//       { id: '1361183597045747853', city: 'Black Water' },
//       { id: '1361183853749993472', city: 'Armadillo' },
//       { id: '1368654877063909377', city: 'Rhodes' },
//     ];

//     const limpar = (valor: string): string =>
//       valor
//         ?.replace(/```/g, '')
//         ?.replace(/`/g, '')
//         ?.replace(/\n/g, '')
//         ?.replace(/\u200B/g, '')
//         ?.replace(/prolog/gi, '')
//         ?.replace(/fixo:/gi, '')
//         ?.trim() || '';

//     client.on('messageCreate', async (message) => {
//       try {
//         this.logger.debug(
//           `📨 Mensagem recebida no canal: ${message.channel.id}`,
//         );

//         // Ignora mensagens do próprio bot
//         if (message.author.id === client.user?.id) {
//           return;
//         }

//         // Verifica se o canal é monitorado
//         const canalLog = canaisDeLog.find(
//           (canal) => canal.id === message.channel.id,
//         );
//         if (!canalLog) {
//           return;
//         }

//         this.logger.log(`🎯 Processando mensagem do canal: ${canalLog.city}`);

//         // Verifica se a mensagem tem embeds
//         if (!message.embeds || message.embeds.length === 0) {
//           this.logger.debug('❌ Mensagem sem embeds');
//           return;
//         }

//         const embed = message.embeds[0];
//         if (!embed.fields || embed.fields.length === 0) {
//           this.logger.debug('❌ Embed sem campos');
//           return;
//         }

//         this.logger.debug(`📋 Embed com ${embed.fields.length} campos`);

//         // Procura pelo campo de item
//         const itemField = embed.fields.find((field) =>
//           ['item removido', 'item adicionado'].some((termo) =>
//             field.name.toLowerCase().includes(termo),
//           ),
//         );

//         if (!itemField) {
//           this.logger.debug('❌ Campo de item não encontrado');
//           return;
//         }

//         const nomeItem = itemField.value || '';
//         const acao = limpar(itemField.name).replace(/:/g, '');

//         // Extrai outros campos
//         const autorField = embed.fields.find((f) =>
//           f.name.toLowerCase().includes('autor'),
//         );
//         const dataField = embed.fields.find((f) =>
//           f.name.toLowerCase().includes('data'),
//         );

//         const autorRaw = autorField?.value || '';
//         const dataRaw = dataField?.value || '';

//         if (!autorRaw || !dataRaw) {
//           this.logger.warn('⚠️ Campos autor ou data não encontrados');
//           return;
//         }

//         // Extrai item e quantidade
//         const matchItem = nomeItem.match(/(.+?)\s*x(\d+)/i);
//         const item = matchItem?.[1]?.trim() || nomeItem.trim();
//         const quantidade = Number(matchItem?.[2]) || 1;

//         // Extrai nickname e fixo
//         const [nicknameRaw, fixoRaw] = autorRaw.split('|');
//         const nickname = limpar(nicknameRaw || autorRaw);
//         const fixo = limpar(fixoRaw || 'n/a');

//         if (!nickname) {
//           this.logger.warn('⚠️ Nickname não encontrado');
//           return;
//         }

//         // Converte data
//         let dataHora: Date;
//         try {
//           dataHora = DateTime.fromFormat(
//             limpar(dataRaw),
//             'dd/LL/yyyy - HH:mm:ss',
//           ).toJSDate();
//         } catch (error) {
//           this.logger.error('❌ Erro ao converter data:', dataRaw);
//           dataHora = new Date(); // Usar data atual como fallback
//         }

//         this.logger.log(
//           `📝 Processando: ${nickname} - ${acao} - ${item} x${quantidade}`,
//         );

//         // Salva no banco
//         try {
//           await this.prisma.itemLog.create({
//             data: {
//               nickname,
//               fixo,
//               itemSlug: item.toLowerCase(),
//               quantidade,
//               acao,
//               cidade: canalLog.city,
//               dataHora,
//             },
//           });
//           this.logger.log('✅ Log salvo no banco com sucesso');
//         } catch (error) {
//           this.logger.error('❌ Erro ao salvar no banco:', error);
//           return; // Para aqui se não conseguir salvar
//         }

//         // Verifica limites apenas para itens REMOVIDOS
//         if (!acao.toLowerCase().includes('removido')) {
//           this.logger.debug('ℹ️ Item adicionado, não verifica limite');
//           return;
//         }

//         await this.verificarLimiteItem(client, nickname, item, quantidade);
//       } catch (error) {
//         this.logger.error('❌ Erro geral ao processar mensagem:', error);
//       }
//     });

//     this.logger.log('✅ Listeners configurados com sucesso');
//   }

//   private async verificarLimiteItem(
//     client: any,
//     nickname: string,
//     item: string,
//     quantidade: number,
//   ) {
//     try {
//       // Busca limite do item
//       const limite = await this.prisma.itemLimit.findUnique({
//         where: { itemSlug: item.toLowerCase() },
//       });

//       if (!limite) {
//         this.logger.debug(`ℹ️ Item sem limite: ${item}`);
//         return;
//       }

//       this.logger.log(
//         `🔍 Verificando limite para ${item}: ${limite.quantidadeMax}`,
//       );

//       // Calcula total das últimas 24h
//       const vinteQuatroHorasAtras = DateTime.now()
//         .minus({ hours: 24 })
//         .toJSDate();

//       const total = await this.prisma.itemLog.aggregate({
//         where: {
//           nickname,
//           itemSlug: item.toLowerCase(),
//           acao: { contains: 'removido' },
//           dataHora: { gte: vinteQuatroHorasAtras },
//         },
//         _sum: { quantidade: true },
//       });

//       const totalRetirado = total._sum.quantidade || 0;

//       this.logger.log(
//         `📊 ${nickname}: ${totalRetirado}/${limite.quantidadeMax} ${item}`,
//       );

//       if (totalRetirado <= limite.quantidadeMax) {
//         this.logger.debug('✅ Dentro do limite');
//         return;
//       }

//       this.logger.warn(`⚠️ LIMITE ULTRAPASSADO: ${nickname} - ${item}`);

//       // Envia alerta no canal
//       await this.enviarAlertaCanal(
//         client,
//         nickname,
//         item,
//         totalRetirado,
//         limite.quantidadeMax,
//       );

//       // Envia DM para o jogador
//       await this.enviarDMJogador(
//         client,
//         nickname,
//         item,
//         totalRetirado,
//         limite.quantidadeMax,
//       );
//     } catch (error) {
//       this.logger.error('❌ Erro ao verificar limite:', error);
//     }
//   }

//   private async enviarAlertaCanal(
//     client: any,
//     nickname: string,
//     item: string,
//     totalRetirado: number,
//     limite: number,
//     dataHora: Date,
//     city: string,
//   ) {
//     try {
//       const alertChannelId = '1383496200988266607';
//       const alertChannel = client.channels.cache.get(
//         alertChannelId,
//       ) as TextChannel;

//       if (!alertChannel) {
//         this.logger.error(
//           `❌ Canal de alerta não encontrado: ${alertChannelId}`,
//         );
//         return;
//       }

//       if (!alertChannel.isTextBased()) {
//         this.logger.error('❌ Canal de alerta não é baseado em texto');
//         return;
//       }
//       const mensagem = new EmbedBuilder()
//         .setTitle('📦 CONTROLE DO BAÚ')
//         .setDescription('**LIMITE DE RETIRADA EXCEDIDO**')
//         .addFields(
//           {
//             name: 'Autor:',
//             value: { nickname },
//             inline: true,
//           },
//           {
//             name: 'Item:',
//             value: { item },
//             inline: true,
//           },
//           {
//             name: 'Retirado:',
//             value: `${totalRetirado} (limite: ${limite})`,
//             inline: true,
//           },
//           { name: '📅 Data:', value: { dataHora }, inline: false },
//           { name: 'Cidade', value: { city }, inline: false },
//         )
//         .setColor('#2f3136'); // Cor parecida com o fundo do Discord escuro

//       // const mensagem =
//       //   `⚠️ **LIMITE ULTRAPASSADO**\n\n` +
//       //   `👤 Jogador: ${nickname}\n` +
//       //   `📦 Item: ${item}\n` +
//       //   `📊 Retirado: ${totalRetirado} (limite: ${limite})\n\n `;

//       await alertChannel.send(mensagem);
//       this.logger.log('✅ Alerta enviado para o canal');
//     } catch (error) {
//       this.logger.error('❌ Erro ao enviar alerta no canal:', error);
//     }
//   }

//   private async enviarDMJogador(
//     client: any,
//     nickname: string,
//     item: string,
//     totalRetirado: number,
//     limite: number,
//   ) {
//     try {
//       // Busca userId pelo nickname usando LIKE (busca que contém)
//       const userId =
//         await this.syncUsersService.buscarUserIdPorNicknameLike(nickname);

//       if (!userId) {
//         this.logger.warn(
//           `❌ UserId não encontrado para nickname que contenha: ${nickname}`,
//         );

//         // Tenta busca exata como fallback
//         const userIdExato =
//           await this.syncUsersService.buscarUserIdPorNicknameLike(nickname);
//         if (!userIdExato) {
//           this.logger.warn(
//             `❌ UserId também não encontrado com busca exata: ${nickname}`,
//           );
//           return;
//         }

//         this.logger.log(`🔍 UserId encontrado com busca exata: ${userIdExato}`);
//         await this.enviarDMParaUser(
//           client,
//           userIdExato,
//           nickname,
//           item,
//           totalRetirado,
//           limite,
//         );
//         return;
//       }

//       this.logger.log(`🔍 UserId encontrado com busca LIKE: ${userId}`);
//       await this.enviarDMParaUser(
//         client,
//         userId,
//         nickname,
//         item,
//         totalRetirado,
//         limite,
//       );
//     } catch (error) {
//       this.logger.error(`❌ Erro ao enviar DM para ${nickname}:`, error);
//     }
//   }

//   private async enviarDMParaUser(
//     client: any,
//     userId: string,
//     nickname: string,
//     item: string,
//     totalRetirado: number,
//     limite: number,
//   ) {
//     try {
//       // Busca o usuário no Discord
//       const user = await client.users.fetch(userId);
//       if (!user) {
//         this.logger.error(`❌ Usuário não encontrado no Discord: ${userId}`);
//         return;
//       }

//       // Envia DM
//       const mensagemDM =
//         `⚠️ **Limite Diário Ultrapassado**\n\n` +
//         `Você retirou **${totalRetirado}x ${item}** nas últimas 24 horas.\n` +
//         `O limite diário é de **${limite}** unidades.\n\n` +
//         `Por favor, respeite os limites estabelecidos.`;

//       await user.send(mensagemDM);
//       this.logger.log(`✅ DM enviada para ${nickname} (${userId})`);
//     } catch (error) {
//       this.logger.error(`❌ Erro ao enviar DM para userId ${userId}:`, error);

//       // Log mais detalhado do erro
//       if (error.code === 50007) {
//         this.logger.warn(`⚠️ Usuário ${nickname} não aceita DMs de não-amigos`);
//       } else if (error.code === 10013) {
//         this.logger.warn(`⚠️ Usuário ${nickname} não encontrado no Discord`);
//       }
//     }
//   }
// }

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
      // Busca limite do item
      const limite = await this.prisma.itemLimit.findUnique({
        where: { itemSlug: item.toLowerCase() },
      });

      if (!limite) {
        this.logger.debug(`ℹ️ Item sem limite: ${item}`);
        return;
      }

      this.logger.log(
        `🔍 Verificando limite para ${item}: ${limite.quantidadeMax}`,
      );

      // Novo: início do dia atual (meia-noite)
      const inicioDoDia = new Date();
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
        `📊 ${nickname}: ${totalRetirado}/${limite.quantidadeMax} ${item}`,
      );

      if (totalRetirado <= limite.quantidadeMax) {
        this.logger.debug('✅ Dentro do limite');
        return;
      }

      const excessoRetirado = totalRetirado - limite.quantidadeMax;

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
        limite.quantidadeMax,
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
        limite.quantidadeMax,
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
      // Busca excessos pendentes para este jogador e item
      const excessosPendentes = await this.prisma.excessoItem.findMany({
        where: {
          nickname,
          itemSlug: item.toLowerCase(),
          status: { in: ['PENDENTE', 'DEVOLVIDO_PARCIAL'] },
        },
        orderBy: {
          dataHoraRetirada: 'asc', // Mais antigos primeiro
        },
      });

      if (excessosPendentes.length === 0) {
        this.logger.debug(
          `ℹ️ Nenhum excesso pendente para ${nickname} - ${item}`,
        );
        return;
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
          statusAnterior: excesso.status,
          novoStatus,
        });

        quantidadeParaDevolver -= quantidadeADevolver;

        this.logger.log(
          `✅ Devolução registrada: ${nickname} - ${item} - ${quantidadeADevolver} unidades (ID: ${excesso.id})`,
        );
      }

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
      }
    } catch (error) {
      this.logger.error('❌ Erro ao verificar devolução:', error);
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
        .setColor('#ff4444'); // Cor vermelha para alerta

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

      const transacoes = excessosAtualizados
        .map((ex) => `#${ex.id} (${ex.quantidadeDevolvida} unidades)`)
        .join(', ');

      const mensagem = new EmbedBuilder()
        .setTitle('📦 CONTROLE DO BAÚ')
        .setDescription('**ITEM DEVOLVIDO**')
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
            name: '🆔 Transações Atualizadas:',
            value: transacoes,
            inline: false,
          },
        )
        .setColor('#44ff44'); // Cor verde para devolução

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
        `Você retirou **${totalRetirado}x ${item}** nas últimas 24 horas.\n` +
        `O limite diário é de **${limite}** unidades.\n` +
        `**Excesso:** ${excesso} unidades\n\n` +
        `🆔 **ID da Transação:** #${transacaoId}\n\n` +
        `Por favor, devolva o excesso ou entre em contato com a corregedoria infrmando no id de transação.\n` +
        `Quando devolver, será enviada uma confirmação automática.`;

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
