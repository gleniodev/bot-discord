import {
  ChannelType,
  EmbedBuilder,
  GuildMember,
  TextChannel,
  time,
  TimestampStyles,
} from "discord.js";

type WelcomeData = {
  member: GuildMember;
  inviteUrl?: string;
  invitedByTag?: string;
  inviteCreatorTag?: string;
  inviteUses?: number;
};

export class NotificationService {
  constructor() {}

  private getChannelByName(member: GuildMember, name: string): TextChannel | null {
    const channel = member.guild.channels.cache.find(
      ch => ch.type === ChannelType.GuildText && ch.name.toLowerCase() === name.toLowerCase()
    );
    return (channel as TextChannel) ?? null;
  }

  public async sendWelcomeEmbed(data: WelcomeData) {
    const { member, inviteUrl, invitedByTag, inviteCreatorTag, inviteUses } = data;
    const channel = this.getChannelByName(member, "entrou");
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(0x2ECC71)
      .setAuthor({ name: "🎉 Bem-vindo ao Servidor V!" })
      .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
      .setDescription(`Olá, ${member}! bem-vindo ao **Atlanta Cavalaria**`)
      .addFields(
        {
          name: "📌 Forma de entrada:",
          value: invitedByTag ? `Convidado por **${invitedByTag}**` : "Convite direto / indefinido",
        },
        {
          name: "📎 Informações do Convite:",
          value: [
            `Convite: ${inviteUrl ?? "—"}`,
            `Criado por: ${inviteCreatorTag ? `**${inviteCreatorTag}**` : "—"}`,
            `Um total de **${inviteUses ?? 0}** usaram este convite.`,
          ].join("\n"),
        },
      )
      .setFooter({ text: `Made with ♥ | ID: ${member.user.id} • ${new Date().toLocaleString("pt-BR")}` });

    await channel.send({ embeds: [embed] });
  }

  public async sendGoodbyeEmbed(member: GuildMember) {
    const channel = this.getChannelByName(member, "saiu");
    if (!channel) return;

    const roles = member.roles.cache
      .filter(r => r.name !== "@everyone")
      .map(r => r.name)
      .join(", ") || "—";

    const nickname = member.nickname ?? "—";
    const username = `${member.user.tag}`;
    const joinedAt = member.joinedAt
      ? `${time(member.joinedAt, TimestampStyles.LongDateTime)}`
      : "—";

    const embed = new EmbedBuilder()
      .setColor(0xE74C3C)
      .setAuthor({ name: "👋 Usuário saiu do servidor" })
      .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: "🧭 Apelido no servidor:", value: nickname, inline: true },
        { name: "🌐 Nome de usuário:", value: username, inline: true },
        { name: "🆔 ID:", value: `\`${member.id}\``, inline: false },
        { name: "🎖️ Cargos que possuía:", value: roles, inline: false },
        { name: "📅 Entrou no servidor em:", value: joinedAt, inline: false },
        { name: "⚠️ Motivo da saída:", value: "Saiu do servidor", inline: false },
      )
      .setFooter({ text: `Atlanta - Cavalaria • ${new Date().toLocaleString("pt-BR")}` });

    await channel.send({ embeds: [embed] });
  }
}
