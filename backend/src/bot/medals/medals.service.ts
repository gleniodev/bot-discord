// src/bot/medals/medals.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { OnDutyHistoryScanner } from './scanners/onduty-history.scanner';
import { CavalryRoleScanner } from './scanners/cavalry-role.scanner';
import { MedalType } from '@prisma/client';

export interface EligibleUser {
  userId: string;
  nickname: string;
  patente: string;
  joinedServerAt: Date; // Mudança: usar data de entrada no servidor
  lastOnDutyDate: Date | null;
  serviceMonths: number;
  serviceDays: number;
  serviceTime: string; // "2 meses e 15 dias"
  eligibleMedals: Array<{
    type: MedalType;
    title: string;
    emoji: string;
    bonusAmount: number;
    monthsRequired: number;
  }>;
  onDutyStatus: string;
}

export interface MedalConfig {
  type: MedalType;
  monthsRequired: number;
  bonusAmount: number;
  emoji: string;
  title: string;
}

export interface MedalStats {
  totalMedals: number;
  medalsByType: Array<{
    type: MedalType;
    _count: number;
  }>;
  totalBonusPaid: number;
}

@Injectable()
export class MedalsService {
  private readonly logger = new Logger(MedalsService.name);

  private readonly MEDAL_CONFIGS: MedalConfig[] = [
    {
      type: MedalType.TEMPO_SERVICO_I,
      monthsRequired: 1,
      bonusAmount: 500,
      emoji: '🥉',
      title: 'TEMPO DE SERVIÇO I',
    },
    {
      type: MedalType.TEMPO_SERVICO_II,
      monthsRequired: 2,
      bonusAmount: 1000,
      emoji: '🥈',
      title: 'TEMPO DE SERVIÇO II',
    },
    {
      type: MedalType.TEMPO_SERVICO_III,
      monthsRequired: 3,
      bonusAmount: 1500,
      emoji: '🥇',
      title: 'TEMPO DE SERVIÇO III',
    },
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly onDutyScanner: OnDutyHistoryScanner,
    private readonly cavalryScanner: CavalryRoleScanner,
  ) {}

  private calculateServiceTime(joinedServerAt: Date): {
    months: number;
    days: number;
    totalDays: number;
    formattedTime: string;
  } {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - joinedServerAt.getTime());
    const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    const months = Math.floor(totalDays / 30);
    const remainingDays = totalDays % 30;

    let formattedTime = '';
    if (months > 0) {
      formattedTime += `${months} mês${months > 1 ? 'es' : ''}`;
      if (remainingDays > 0) {
        formattedTime += ` e ${remainingDays} dia${remainingDays > 1 ? 's' : ''}`;
      }
    } else {
      formattedTime = `${remainingDays} dia${remainingDays > 1 ? 's' : ''}`;
    }

    return {
      months,
      days: remainingDays,
      totalDays,
      formattedTime,
    };
  }

  private getEligibleMedals(serviceMonths: number): MedalConfig[] {
    return this.MEDAL_CONFIGS.filter(
      (config) => serviceMonths >= config.monthsRequired,
    ).sort((a, b) => b.monthsRequired - a.monthsRequired); // Maior para menor
  }

  private formatOnDutyStatus(lastOnDutyDate: Date | null): string {
    if (!lastOnDutyDate) {
      return 'nunca registrado';
    }

    const now = new Date();
    const diffTime = Math.abs(now.getTime() - lastOnDutyDate.getTime());
    const daysAgo = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (daysAgo === 0) return 'hoje';
    if (daysAgo === 1) return 'ontem';
    if (daysAgo <= 7) return `${daysAgo} dias atrás`;
    if (daysAgo <= 30) return `${Math.floor(daysAgo / 7)} semana(s) atrás`;
    return `${Math.floor(daysAgo / 30)} mês(es) atrás`;
  }

  async syncCavalryData(client: any): Promise<void> {
    this.logger.log('🔄 Sincronizando dados de cavalaria...');

    try {
      // 1. Buscar e salvar membros com cargo de cavalaria
      await this.cavalryScanner.executarScanCompleto(client);

      // 2. Buscar usuários com cavalryRoleDate no banco
      const cavalryUsers = await this.prisma.user.findMany({
        where: {
          cavalryRoleDate: { not: null },
          isActive: true,
        },
        select: {
          nickname: true,
        },
      });

      if (cavalryUsers.length === 0) {
        this.logger.warn('⚠️ Nenhum usuário com data de cavalaria encontrado');
        return;
      }

      // 3. Buscar histórico de on-duty para estes usuários
      const nicknames = cavalryUsers.map((user) => user.nickname);
      const onDutyResults = await this.onDutyScanner.buscarOnDutyParaUsuarios(
        client,
        nicknames,
      );

      // 4. Salvar resultados de on-duty
      await this.onDutyScanner.salvarOnDutyResults(onDutyResults);

      this.logger.log('✅ Sincronização de dados de cavalaria concluída');
    } catch (error) {
      this.logger.error('❌ Erro na sincronização de cavalaria:', error);
      throw error;
    }
  }

  async getEligibleUsers(client?: any): Promise<EligibleUser[]> {
    try {
      this.logger.log('🏅 Buscando usuários elegíveis para medalhas...');

      // Se cliente foi fornecido, sincronizar dados primeiro
      if (client) {
        await this.syncCavalryData(client);
      }

      // Buscar usuários com cargo de cavalaria que entraram no servidor
      const users = await this.prisma.user.findMany({
        where: {
          cavalryRoleDate: { not: null }, // Ainda precisa ter passado pela sincronização
          joinedServerAt: { not: null }, // E ter data de entrada no servidor
          isActive: true,
        },
        orderBy: {
          joinedServerAt: 'asc', // Mais antigos primeiro (por entrada no servidor)
        },
      });

      const eligibleUsers: EligibleUser[] = [];

      for (const user of users) {
        // Usar joinedServerAt ao invés de cavalryRoleDate para cálculo
        const serviceTime = this.calculateServiceTime(user.joinedServerAt!);
        const eligibleMedals = this.getEligibleMedals(serviceTime.months);

        // Só incluir se tiver pelo menos 1 mês de serviço
        if (serviceTime.months >= 1) {
          eligibleUsers.push({
            userId: user.userId,
            nickname: user.nickname,
            patente: user.patente || 'Sem Patente',
            joinedServerAt: user.joinedServerAt!, // Mudança: usar joinedServerAt
            lastOnDutyDate: user.lastOnDutyDate,
            serviceMonths: serviceTime.months,
            serviceDays: serviceTime.days,
            serviceTime: serviceTime.formattedTime,
            eligibleMedals,
            onDutyStatus: this.formatOnDutyStatus(user.lastOnDutyDate),
          });
        }
      }

      this.logger.log(
        `✅ Encontrados ${eligibleUsers.length} usuários elegíveis para medalhas`,
      );

      return eligibleUsers;
    } catch (error) {
      this.logger.error('❌ Erro ao buscar usuários elegíveis:', error);
      throw error;
    }
  }

  async awardMedal(
    userId: string,
    medalType: MedalType,
    awardedBy: string,
  ): Promise<boolean> {
    try {
      this.logger.log(
        `🏅 Concedendo medalha ${medalType} para usuário ${userId}`,
      );

      // Buscar configuração da medalha
      const medalConfig = this.MEDAL_CONFIGS.find(
        (config) => config.type === medalType,
      );
      if (!medalConfig) {
        throw new Error(`Configuração da medalha ${medalType} não encontrada`);
      }

      // Criar registro da medalha (permite duplicatas)
      await this.prisma.medal.create({
        data: {
          userId,
          type: medalType,
          awardedBy,
          bonusAmount: medalConfig.bonusAmount,
        },
      });

      this.logger.log(
        `✅ Medalha ${medalType} concedida com sucesso para ${userId}`,
      );
      return true;
    } catch (error) {
      this.logger.error(`❌ Erro ao conceder medalha:`, error);
      throw error;
    }
  }

  async updateCavalryRoleDate(userId: string, roleDate: Date): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { userId },
        data: { cavalryRoleDate: roleDate },
      });
      this.logger.log(
        `✅ Data do cargo de cavalaria atualizada para ${userId}`,
      );
    } catch (error) {
      this.logger.error(`❌ Erro ao atualizar data do cargo:`, error);
      throw error;
    }
  }

  async updateLastOnDutyDate(userId: string, onDutyDate: Date): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { userId },
        data: { lastOnDutyDate: onDutyDate },
      });

      // Registrar no log de on-duty
      await this.prisma.onDutyLog.create({
        data: {
          userId,
          actionType: 'ENTROU_EM_SERVICO',
          timestamp: onDutyDate,
        },
      });

      this.logger.log(`✅ Data de on-duty atualizada para ${userId}`);
    } catch (error) {
      this.logger.error(`❌ Erro ao atualizar data de on-duty:`, error);
      throw error;
    }
  }

  getMedalConfigs(): MedalConfig[] {
    return this.MEDAL_CONFIGS;
  }

  async getUserMedals(userId: string) {
    return await this.prisma.medal.findMany({
      where: { userId },
      orderBy: { awardedAt: 'desc' },
    });
  }

  async getMedalStats(): Promise<MedalStats> {
    const totalMedals = await this.prisma.medal.count();
    const medalsByType = await this.prisma.medal.groupBy({
      by: ['type'],
      _count: true,
    });

    const totalBonus = await this.prisma.medal.aggregate({
      _sum: { bonusAmount: true },
    });

    return {
      totalMedals,
      medalsByType: medalsByType.map((item) => ({
        type: item.type,
        _count: item._count,
      })),
      totalBonusPaid: totalBonus._sum.bonusAmount || 0,
    };
  }

  async getRecentMedals(limit: number = 10) {
    try {
      this.logger.log(`🔍 Buscando ${limit} medalhas mais recentes...`);

      const recentMedals = await this.prisma.medal.findMany({
        take: limit,
        orderBy: { awardedAt: 'desc' },
        include: {
          user: {
            select: {
              nickname: true,
              patente: true,
            },
          },
        },
      });

      this.logger.log(
        `✅ Encontradas ${recentMedals.length} medalhas recentes`,
      );
      return recentMedals;
    } catch (error) {
      this.logger.error('❌ Erro ao buscar medalhas recentes:', error);
      throw error;
    }
  }

  // Método para relatório completo
  async generateMedalsReport(client?: any): Promise<{
    summary: {
      totalEligible: number;
      totalWithOnDuty: number;
      avgServiceMonths: number;
    };
    eligibleUsers: EligibleUser[];
    medalDistribution: Record<string, number>;
  }> {
    try {
      const eligibleUsers = await this.getEligibleUsers(client);

      const totalWithOnDuty = eligibleUsers.filter(
        (user) => user.lastOnDutyDate !== null,
      ).length;

      const avgServiceMonths =
        eligibleUsers.length > 0
          ? eligibleUsers.reduce((sum, user) => sum + user.serviceMonths, 0) /
            eligibleUsers.length
          : 0;

      const medalDistribution: Record<string, number> = {};
      eligibleUsers.forEach((user) => {
        user.eligibleMedals.forEach((medal) => {
          medalDistribution[medal.type] =
            (medalDistribution[medal.type] || 0) + 1;
        });
      });

      return {
        summary: {
          totalEligible: eligibleUsers.length,
          totalWithOnDuty,
          avgServiceMonths: Math.round(avgServiceMonths * 100) / 100,
        },
        eligibleUsers,
        medalDistribution,
      };
    } catch (error) {
      this.logger.error('❌ Erro ao gerar relatório de medalhas:', error);
      throw error;
    }
  }
}
