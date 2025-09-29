import { Collection, Guild, Invite, Client } from 'discord.js';

export class InviteTrackerService {
  // guildId -> (inviteCode -> Invite)
  private cache = new Map<string, Collection<string, Invite>>();

  constructor(private readonly client: Client) {}

  /** Carrega todos os convites de um guild para o cache (chame no ready). */
  public async primeGuild(guild: Guild) {
    const invites = await guild.invites.fetch().catch(() => null);
    if (!invites) return;
    this.cache.set(guild.id, invites);
  }

  public async onInviteCreate(invite: Invite) {
    const guild = invite.guild;
    if (!guild) return;
    const col = this.cache.get(guild.id) ?? new Collection<string, Invite>();
    col.set(invite.code, invite);
    this.cache.set(guild.id, col);
  }

  public async onInviteDelete(invite: Invite) {
    const guild = invite.guild;
    if (!guild) return;
    const col = this.cache.get(guild.id);
    if (!col) return;
    col.delete(invite.code);
  }

  /**
   * Identifica o convite utilizado comparando com o cache anterior.
   * Atualiza o cache após a comparação.
   */
  public async findUsedInvite(guild: Guild): Promise<Invite | null> {
    const before = this.cache.get(guild.id) ?? new Collection<string, Invite>();
    const after = await guild.invites.fetch().catch(() => null);
    if (!after) return null;

    // Procura o invite cuja contagem de "uses" aumentou
    const used =
      after.find((inv) => {
        const old = before.get(inv.code);
        return old && inv.uses && old.uses !== undefined && inv.uses > old.uses;
      }) ?? null;

    // Atualiza cache
    this.cache.set(guild.id, after);
    return used ?? null;
  }
}
