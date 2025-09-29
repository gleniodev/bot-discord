// src/bot/listeners/config/bot.config.ts
export const BOT_CONFIG = {
  CHANNELS: {
    ITEM_ALERT_CHANNEL_ID: '1422231036418326670',
    WEAPON_ALERT_CHANNEL_ID: '1389789894305644626',

    LOG_CHANNELS: [
      { id: '1357081317623201944', city: 'Valentine' },
      { id: '1361184008536326254', city: 'Tumbleweed' },
      { id: '1361183486760976464', city: 'Strawberry' },
      { id: '1361183042395439134', city: 'Annes' },
      { id: '1361183181482492105', city: 'Saint Denis' },
      { id: '1361183597045747853', city: 'Black Water' },
      { id: '1361183853749993472', city: 'Armadillo' },
      { id: '1368654877063909377', city: 'Rhodes' },
    ],
  },
  WEAPONS: {
    AUTHORIZED_RANKS: [
      'Capitão',
      'Sheriff',
      'Major',
      '!Superintendente',
      '!Coronel',
      '!Vice-Marshall',
      '!Marshall',
    ],
  },
  TIMING: {
    BOT_READY_DELAY: 2000, // 2 segundos
  },
  COLORS: {
    ALERT: 0xff4444,
    BLOCKED: 0xff0000,
    WEAPON_ALERT: 0xdc143c,
    SUCCESS: 0x44ff44,
    SUCCESS_COMPLETE: 0x00ff00,
    PARTIAL: 0xffaa00,
    WEAPON_SUCCESS: 0x228b22,
  },
  ITEM_FIELDS: ['item removido', 'item adicionado'],
  DATE_FORMAT: 'dd/LL/yyyy - HH:mm:ss',
  STATUS: {
    PENDING: 'PENDENTE',
    PARTIAL_RETURNED: 'DEVOLVIDO_PARCIAL',
    TOTAL_RETURNED: 'DEVOLVIDO_TOTAL',
    BLOCKED: 'BLOQUEADO',
    NO_PERMISSION: 'SEM_PERMISSAO',
  },
};
