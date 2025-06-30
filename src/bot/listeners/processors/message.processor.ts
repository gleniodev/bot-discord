// src/bot/listeners/processors/message.processor.ts
import { Injectable, Logger } from '@nestjs/common';
import { Message } from 'discord.js';
import { DateTime } from 'luxon';
import { BOT_CONFIG } from '../config/bot.config';

export interface ProcessedMessageData {
  nickname: string;
  fixo: string;
  item: string;
  quantidade: number;
  acao: string;
  city: string;
  dataHora: Date;
}

@Injectable()
export class MessageProcessor {
  private readonly logger = new Logger(MessageProcessor.name);

  async processMessage(message: Message): Promise<ProcessedMessageData | null> {
    // Verifica se o canal é monitorado
    const canalLog = BOT_CONFIG.CHANNELS.LOG_CHANNELS.find(
      (canal) => canal.id === message.channel.id,
    );
    if (!canalLog) {
      return null;
    }

    this.logger.log(`🎯 Processando mensagem do canal: ${canalLog.city}`);

    // Verifica se a mensagem tem embeds
    if (!message.embeds || message.embeds.length === 0) {
      this.logger.debug('❌ Mensagem sem embeds');
      return null;
    }

    const embed = message.embeds[0];
    if (!embed.fields || embed.fields.length === 0) {
      this.logger.debug('❌ Embed sem campos');
      return null;
    }

    this.logger.debug(`📋 Embed com ${embed.fields.length} campos`);

    // Procura pelo campo de item
    const itemField = embed.fields.find((field) =>
      BOT_CONFIG.ITEM_FIELDS.some((termo) =>
        field.name.toLowerCase().includes(termo),
      ),
    );

    if (!itemField) {
      this.logger.debug('❌ Campo de item não encontrado');
      return null;
    }

    const nomeItem = itemField.value || '';
    const acao = this.limpar(itemField.name).replace(/:/g, '');

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
      return null;
    }

    // Extrai item e quantidade
    const matchItem = nomeItem.match(/(.+?)\s*x(\d+)/i);
    const item = matchItem?.[1]?.trim() || nomeItem.trim();
    const quantidade = Number(matchItem?.[2]) || 1;

    // Extrai nickname e fixo
    const [nicknameRaw, fixoRaw] = autorRaw.split('|');
    const nickname = this.limpar(nicknameRaw || autorRaw);
    const fixo = this.limpar(fixoRaw || 'n/a');

    if (!nickname) {
      this.logger.warn('⚠️ Nickname não encontrado');
      return null;
    }

    // Converte data
    let dataHora: Date;
    try {
      dataHora = DateTime.fromFormat(
        this.limpar(dataRaw),
        BOT_CONFIG.DATE_FORMAT,
      ).toJSDate();
    } catch (error) {
      this.logger.error('❌ Erro ao converter data:', dataRaw, error);
      dataHora = new Date(); // Usar data atual como fallback
    }

    return {
      nickname,
      fixo,
      item,
      quantidade,
      acao,
      city: canalLog.city,
      dataHora,
    };
  }

  private limpar(valor: string): string {
    return (
      valor
        ?.replace(/```/g, '')
        ?.replace(/`/g, '')
        ?.replace(/\n/g, '')
        ?.replace(/\u200B/g, '')
        ?.replace(/prolog/gi, '')
        ?.replace(/fixo:/gi, '')
        ?.trim() || ''
    );
  }
}
