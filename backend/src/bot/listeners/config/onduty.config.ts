// src/bot/listeners/config/onduty.config.ts
export const ONDUTY_CONFIG = {
  // CONFIGURE AQUI O ID DO SEU CANAL DE ON-DUTY
  CHANNEL_ID: '1362460139365339186', // Substitua pelo ID real do canal

  // Configurações de busca
  SEARCH_LIMITS: {
    MAX_SEARCHES: 20, // Máximo de buscas por usuário
    MESSAGES_PER_SEARCH: 100, // Mensagens por busca
    MAX_BULK_SEARCHES: 30, // Máximo para busca em lote
  },

  // Palavras-chave para identificar entrada em serviço
  KEYWORDS: {
    ACTION_FIELD: ['ação', 'action'],
    NAME_FIELD: ['nome', 'name'],
    DATE_FIELD: ['data', 'date'],
    ENTRY_SERVICE: ['entrou em serviço', 'entered service', 'on duty'],
  },

  // Formatos de data aceitos
  DATE_FORMATS: [
    'dd/LL/yyyy - HH:mm:ss',
    'dd/MM/yyyy - HH:mm:ss',
    'yyyy-MM-dd HH:mm:ss',
    'dd/MM/yyyy HH:mm:ss',
  ],
};
