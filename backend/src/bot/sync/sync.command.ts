// src/bot/commands/sync.command.ts
import { Injectable, Logger } from '@nestjs/common';
import { BotService } from '../bot.service';
import { SyncUsersService } from './sync-users.service';
import { EmbedBuilder, Message, PermissionFlagsBits } from 'discord.js';

@Injectable()
export class SyncCommand {
  private readonly logger = new Logger(SyncCommand.name);

  constructor(
    private readonly botService: BotService,
    private readonly syncUsersService: SyncUsersService,
  ) {}

  async configurarComandos() {
    const client = this.botService.getClient();

    client.on('messageCreate', async (message: Message) => {
      // Ignorar mensagens de bots
      if (message.author.bot) return;

      // Verificar se é um comando
      if (!message.content.startsWith('!sync')) return;

      // Verificar permissões (apenas administradores)
      if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
        await message.reply(
          '❌ Você não tem permissão para usar este comando.',
        );
        return;
      }

      const args = message.content.split(' ');
      const subcommand = args[1];

      try {
        switch (subcommand) {
          case 'all':
            await this.executarSincronizacaoCompleta(message);
            break;
          case 'stats':
            await this.mostrarEstatisticas(message);
            break;
          case 'user':
            await this.sincronizarUsuarioEspecifico(message, args[2]);
            break;
          default:
            await this.mostrarAjuda(message);
            break;
        }
      } catch (error) {
        this.logger.error('❌ Erro ao executar comando de sync:', error);
        await message.reply('❌ Erro ao executar comando. Verifique os logs.');
      }
    });
  }

  private async executarSincronizacaoCompleta(message: Message) {
    const startEmbed = new EmbedBuilder()
      .setTitle('🔄 Sincronização de Usuários')
      .setDescription('Iniciando sincronização completa...')
      .setColor(0xffaa00)
      .setTimestamp();

    const statusMessage = await message.reply({ embeds: [startEmbed] });

    try {
      const client = this.botService.getClient();
      await this.syncUsersService.sincronizarTodosUsuarios(client);

      const stats = await this.syncUsersService.gerarRelatorioSincronizacao();

      const successEmbed = new EmbedBuilder()
        .setTitle('✅ Sincronização Concluída')
        .addFields(
          {
            name: 'Total de Usuários',
            value: `${stats?.totalUsuarios || 0}`,
            inline: true,
          },
          {
            name: 'Com Patente',
            value: `${stats?.usuariosComPatente || 0}`,
            inline: true,
          },
          {
            name: 'Novos (30 dias)',
            value: `${stats?.usuariosRecentes || 0}`,
            inline: true,
          },
        )
        .setColor(0x00ff00)
        .setTimestamp();

      await statusMessage.edit({ embeds: [successEmbed] });
    } catch (syncError) {
      this.logger.error('❌ Erro na sincronização completa:', syncError);

      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ Erro na Sincronização')
        .setDescription(
          'Ocorreu um erro durante a sincronização. Verifique os logs.',
        )
        .setColor(0xff0000)
        .setTimestamp();

      await statusMessage.edit({ embeds: [errorEmbed] });
    }
  }

  private async mostrarEstatisticas(message: Message) {
    const stats = await this.syncUsersService.gerarRelatorioSincronizacao();

    const embed = new EmbedBuilder()
      .setTitle('📊 Estatísticas de Usuários')
      .addFields(
        {
          name: 'Total de Usuários Ativos',
          value: `${stats?.totalUsuarios || 0}`,
          inline: true,
        },
        {
          name: 'Usuários com Patente',
          value: `${stats?.usuariosComPatente || 0}`,
          inline: true,
        },
        {
          name: 'Ingressaram (últimos 30 dias)',
          value: `${stats?.usuariosRecentes || 0}`,
          inline: true,
        },
      )
      .setColor(0x0099ff)
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }

  private async sincronizarUsuarioEspecifico(
    message: Message,
    userId?: string,
  ) {
    if (!userId) {
      await message.reply('❌ Forneça o ID do usuário: `!sync user <ID>`');
      return;
    }

    try {
      const guild = message.guild;
      if (!guild) {
        await message.reply('❌ Comando deve ser executado em um servidor.');
        return;
      }

      const member = await guild.members.fetch(userId);

      if (!member) {
        await message.reply('❌ Usuário não encontrado no servidor.');
        return;
      }

      await this.syncUsersService.sincronizarUsuario(member);

      const embed = new EmbedBuilder()
        .setTitle('✅ Usuário Sincronizado')
        .addFields(
          { name: 'Usuário', value: member.user.username, inline: true },
          { name: 'Nickname', value: member.displayName, inline: true },
          {
            name: 'Entrou em',
            value: member.joinedAt?.toLocaleDateString('pt-BR') || 'N/A',
            inline: true,
          },
        )
        .setColor(0x00ff00)
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (error) {
      this.logger.error('❌ Erro ao sincronizar usuário específico:', error);
      await message.reply('❌ Erro ao sincronizar usuário específico.');
    }
  }

  private async mostrarAjuda(message: Message) {
    const embed = new EmbedBuilder()
      .setTitle('🔧 Comandos de Sincronização')
      .setDescription('Comandos disponíveis para sincronização de usuários:')
      .addFields(
        {
          name: '`!sync all`',
          value: 'Sincroniza todos os usuários do servidor',
          inline: false,
        },
        {
          name: '`!sync stats`',
          value: 'Mostra estatísticas dos usuários',
          inline: false,
        },
        {
          name: '`!sync user <ID>`',
          value: 'Sincroniza um usuário específico',
          inline: false,
        },
      )
      .setColor(0x0099ff)
      .setFooter({ text: 'Apenas administradores podem usar estes comandos' })
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
}
