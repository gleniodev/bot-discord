// src/bot/medals/scanners/onduty-history.scanner.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { TextChannel, Collection, Message } from 'discord.js';

interface OnDutyResult {
  nickname: string;
  lastOnDutyDate: Date | null;
  found: boolean;
}

@Injectable()
export class OnDutyHistoryScanner {
  private readonly logger = new Logger(OnDutyHistoryScanner.name);

  // Configure aqui o ID do seu canal de on-duty
  private readonly ONDUTY_CHANNEL_ID = '1362460139365339186';

  constructor(private readonly prisma: PrismaService) {}

  private limpar(valor: string): string {
    return (
      valor
        ?.replace(/```/g, '')
        ?.replace(/`/g, '')
        ?.replace(/\n/g, '')
        ?.replace(/\u200B/g, '')
        ?.trim() || ''
    );
  }

  private extrairNicknameDoEmbed(embed: any): string | null {
    if (!embed.fields || embed.fields.length === 0) {
      return null;
    }

    // Buscar campo que contém o nome do usuário
    const nameField = embed.fields.find(
      (field: any) =>
        field.name.toLowerCase().includes('nome') ||
        field.name.toLowerCase().includes('name') ||
        field.name.toLowerCase().includes('usuário') ||
        field.name.toLowerCase().includes('user'),
    );

    if (!nameField) {
      return null;
    }

    return this.limpar(nameField.value);
  }

  private extrairDataDoEmbed(embed: any): Date | null {
    if (!embed.fields || embed.fields.length === 0) {
      return null;
    }

    // Buscar campo que contém a data
    const dateField = embed.fields.find(
      (field: any) =>
        field.name.toLowerCase().includes('data') ||
        field.name.toLowerCase().includes('date') ||
        field.name.toLowerCase().includes('hora') ||
        field.name.toLowerCase().includes('time'),
    );

    if (!dateField) {
      return null;
    }

    const dataRaw = this.limpar(dateField.value);

    try {
      // Tentar diferentes formatos de data
      const formatosBR = [
        /(\d{1,2})\/(\d{1,2})\/(\d{4})\s*-\s*(\d{1,2}):(\d{2}):(\d{2})/,
        /(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})/,
        /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
      ];

      for (const formato of formatosBR) {
        const match = dataRaw.match(formato);
        if (match) {
          const [, dia, mes, ano, hora = '0', minuto = '0', segundo = '0'] =
            match;
          const data = new Date(
            parseInt(ano),
            parseInt(mes) - 1, // mês em JS é 0-based
            parseInt(dia),
            parseInt(hora),
            parseInt(minuto),
            parseInt(segundo),
          );

          if (!isNaN(data.getTime())) {
            return data;
          }
        }
      }

      // Fallback: tentar parsear diretamente
      const data = new Date(dataRaw);
      if (!isNaN(data.getTime())) {
        return data;
      }

      return null;
    } catch (error) {
      this.logger.error(`Erro ao parsear data: ${dataRaw}`, error);
      return null;
    }
  }

  private isOnDutyEmbed(embed: any): boolean {
    if (!embed.fields || embed.fields.length === 0) {
      return false;
    }

    // Verificar se é um embed de "ENTROU EM SERVIÇO"
    const actionField = embed.fields.find(
      (field: any) =>
        field.name.toLowerCase().includes('ação') ||
        field.name.toLowerCase().includes('action') ||
        field.value.toLowerCase().includes('entrou em serviço') ||
        field.value.toLowerCase().includes('entered service') ||
        field.value.toLowerCase().includes('on duty'),
    );

    if (!actionField) {
      return false;
    }

    const actionValue = this.limpar(actionField.value);
    return (
      actionValue.toLowerCase().includes('entrou em serviço') ||
      actionValue.toLowerCase().includes('entered service')
    );
  }

  async buscarUltimoOnDutyDoUsuario(
    canal: TextChannel,
    nickname: string,
  ): Promise<Date | null> {
    this.logger.debug(`🔍 Buscando último on-duty para: ${nickname}`);

    const LIMITE_MENSAGENS_TOTAL = 3000;
    const LIMITE_POR_REQUISICAO = 100;
    const PAUSA_ENTRE_REQUISICOES = 500;

    try {
      const todasMensagens = new Collection<string, Message>();
      let ultimaMensagemId: string | undefined;
      let requisicoes = 0;
      const maxRequisicoes = Math.ceil(
        LIMITE_MENSAGENS_TOTAL / LIMITE_POR_REQUISICAO,
      );

      while (
        todasMensagens.size < LIMITE_MENSAGENS_TOTAL &&
        requisicoes < maxRequisicoes
      ) {
        requisicoes++;

        const options = ultimaMensagemId
          ? { limit: LIMITE_POR_REQUISICAO, before: ultimaMensagemId }
          : { limit: LIMITE_POR_REQUISICAO };

        const lote = await canal.messages.fetch(options);

        if (lote.size === 0) {
          break; // Não há mais mensagens
        }

        // Processar mensagens em ordem cronológica reversa (mais recente primeiro)
        for (const [, message] of lote) {
          if (!message.embeds || message.embeds.length === 0) {
            continue;
          }

          const embed = message.embeds[0];

          if (!this.isOnDutyEmbed(embed)) {
            continue;
          }

          const embedNickname = this.extrairNicknameDoEmbed(embed);

          if (!embedNickname) {
            continue;
          }

          // Verificar se é o usuário que estamos procurando
          if (
            embedNickname.toLowerCase().includes(nickname.toLowerCase()) ||
            nickname.toLowerCase().includes(embedNickname.toLowerCase())
          ) {
            const dataOnDuty = this.extrairDataDoEmbed(embed);

            if (dataOnDuty) {
              this.logger.log(
                `✅ On-duty encontrado para ${nickname}: ${dataOnDuty.toISOString()}`,
              );
              return dataOnDuty; // PARA AQUI - encontrou o mais recente
            }
          }
        }

        // Preparar para próxima busca
        const mensagensArray = Array.from(lote.values());
        ultimaMensagemId = mensagensArray[mensagensArray.length - 1]?.id;

        // Pausa entre requisições
        if (
          requisicoes < maxRequisicoes &&
          todasMensagens.size < LIMITE_MENSAGENS_TOTAL
        ) {
          await new Promise((resolve) =>
            setTimeout(resolve, PAUSA_ENTRE_REQUISICOES),
          );
        }
      }

      this.logger.debug(`ℹ️ Nenhum on-duty encontrado para ${nickname}`);
      return null;
    } catch (error) {
      this.logger.error(`❌ Erro ao buscar on-duty para ${nickname}:`, error);
      return null;
    }
  }

  async buscarOnDutyParaUsuarios(
    client: any,
    nicknames: string[],
  ): Promise<Map<string, Date | null>> {
    this.logger.log(`🔍 Buscando on-duty para ${nicknames.length} usuários...`);

    const canal = client.channels.cache.get(
      this.ONDUTY_CHANNEL_ID,
    ) as TextChannel;
    if (!canal) {
      this.logger.error(
        `❌ Canal de on-duty não encontrado: ${this.ONDUTY_CHANNEL_ID}`,
      );
      return new Map();
    }

    const resultados = new Map<string, Date | null>();

    // Inicializar todos como null
    nicknames.forEach((nickname) => {
      resultados.set(nickname, null);
    });

    // Buscar on-duty para cada usuário
    for (let i = 0; i < nicknames.length; i++) {
      const nickname = nicknames[i];

      this.logger.log(
        `📍 Processando ${i + 1}/${nicknames.length}: ${nickname}`,
      );

      try {
        const ultimoOnDuty = await this.buscarUltimoOnDutyDoUsuario(
          canal,
          nickname,
        );
        resultados.set(nickname, ultimoOnDuty);

        // Pausa entre usuários para evitar rate limit
        if (i < nicknames.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      } catch (error) {
        this.logger.error(`❌ Erro ao processar ${nickname}:`, error);
        resultados.set(nickname, null);
      }
    }

    const encontrados = Array.from(resultados.values()).filter(
      (date) => date !== null,
    ).length;
    this.logger.log(
      `✅ Busca concluída: ${encontrados}/${nicknames.length} usuários com on-duty encontrado`,
    );

    return resultados;
  }

  async salvarOnDutyResults(
    resultados: Map<string, Date | null>,
  ): Promise<void> {
    this.logger.log(`💾 Salvando resultados de on-duty no banco...`);

    let salvos = 0;
    let erros = 0;

    for (const [nickname, onDutyDate] of resultados) {
      try {
        // Buscar usuário pelo nickname
        const user = await this.prisma.user.findFirst({
          where: {
            nickname: {
              contains: nickname,
              mode: 'insensitive',
            },
            isActive: true,
          },
        });

        if (!user) {
          this.logger.warn(`⚠️ Usuário não encontrado no banco: ${nickname}`);
          continue;
        }

        // Atualizar lastOnDutyDate
        await this.prisma.user.update({
          where: { userId: user.userId },
          data: { lastOnDutyDate: onDutyDate },
        });

        salvos++;
        this.logger.debug(
          `✅ On-duty salvo para ${nickname}: ${onDutyDate?.toISOString() || 'null'}`,
        );
      } catch (error) {
        erros++;
        this.logger.error(`❌ Erro ao salvar on-duty para ${nickname}:`, error);
      }
    }

    this.logger.log(
      `💾 Salvamento concluído: ${salvos} salvos, ${erros} erros`,
    );
  }
}
