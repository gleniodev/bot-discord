import { Client, Events, GuildMember, Invite } from 'discord.js';
import { NotificationService } from './services/notification-invite.service';
import { InviteTrackerService } from './services/invite-tracker.service';

export class MemberListener {
  private readonly tracker: InviteTrackerService;
  private readonly notify: NotificationService;

  constructor(private readonly client: Client) {
    this.tracker = new InviteTrackerService(client);
    this.notify = new NotificationService();
    this.bind();
  }

  private bind() {
    // Ready -> prime de todos os guilds
    this.client.once(Events.ClientReady, async () => {
      for (const [, guild] of this.client.guilds.cache) {
        await this.tracker.primeGuild(guild);
      }
    });

    // Atualiza cache quando criar/deletar convite
    this.client.on(Events.InviteCreate, (invite: Invite) =>
      this.tracker.onInviteCreate(invite),
    );
    this.client.on(Events.InviteDelete, (invite: Invite) =>
      this.tracker.onInviteDelete(invite),
    );

    // Novo membro
    this.client.on(Events.GuildMemberAdd, async (member: GuildMember) => {
      const used = await this.tracker.findUsedInvite(member.guild);

      await this.notify.sendWelcomeEmbed({
        member,
        inviteUrl: used?.url,
        invitedByTag: used?.inviter ? `${used.inviter.tag}` : undefined,
        inviteCreatorTag: used?.inviter ? `${used.inviter.tag}` : undefined,
        inviteUses: used?.uses ?? undefined,
      });
    });

    // Membro saiu
    this.client.on(Events.GuildMemberRemove, async (member: GuildMember) => {
      await this.notify.sendGoodbyeEmbed(member);
    });
  }
}
