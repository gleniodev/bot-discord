import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { MedalsService } from './medals.service';
import { BotService } from '../bot.service';

@Controller('api/medals')
export class MedalsController {
  constructor(
    private readonly medalsService: MedalsService,
    private readonly botService: BotService,
  ) {}

  @Get('eligible')
  async getEligibleUsers() {
    try {
      const client = this.botService.getClient();
      return await this.medalsService.getEligibleUsers(client);
    } catch (error) {
      console.error('Erro ao buscar usuários elegíveis', error);
      throw new HttpException(
        'Erro ao buscar usuários elegíveis',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('configs')
  getMedalConfigs() {
    return this.medalsService.getMedalConfigs();
  }

  @Get('stats')
  async getMedalStats() {
    try {
      return await this.medalsService.getMedalStats();
    } catch (error) {
      console.error('Erro ao buscar estatísticas', error);
      throw new HttpException(
        'Erro ao buscar estatísticas',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('user/:userId')
  async getUserMedals(@Param('userId') userId: string) {
    try {
      return await this.medalsService.getUserMedals(userId);
    } catch (error) {
      console.error('Erro ao buscar medalhas do usuário', error);
      throw new HttpException(
        'Erro ao buscar medalhas do usuário',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('recent')
  async getRecentMedals(@Query('limit') limit?: string) {
    try {
      const limitNum = limit ? parseInt(limit) : 10;
      return await this.medalsService.getRecentMedals(limitNum);
    } catch (error) {
      console.error('Erro ao buscar medalhas recentes', error);
      throw new HttpException(
        'Erro ao buscar medalhas recentes',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('award/:userId')
  async awardMedal(@Param('userId') userId: string, @Body() body: any) {
    try {
      const success = await this.medalsService.awardMedal(
        userId,
        body.medalType,
        body.awardedBy,
      );

      if (!success) {
        throw new HttpException(
          'Medalha já foi concedida anteriormente',
          HttpStatus.CONFLICT,
        );
      }

      return { success: true, message: 'Medalha concedida com sucesso' };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Erro ao conceder medalha',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('update-cavalry-date/:userId')
  async updateCavalryRoleDate(
    @Param('userId') userId: string,
    @Body() body: any,
  ) {
    try {
      if (!body.roleDate) {
        throw new HttpException(
          'Data do cargo é obrigatória',
          HttpStatus.BAD_REQUEST,
        );
      }

      const roleDate = new Date(body.roleDate);
      if (isNaN(roleDate.getTime())) {
        throw new HttpException(
          'Data do cargo inválida',
          HttpStatus.BAD_REQUEST,
        );
      }

      await this.medalsService.updateCavalryRoleDate(userId, roleDate);
      return { success: true, message: 'Data do cargo atualizada' };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Erro ao atualizar data do cargo',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('update-onduty-date/:userId')
  async updateLastOnDutyDate(
    @Param('userId') userId: string,
    @Body() body: any,
  ) {
    try {
      if (!body.onDutyDate) {
        throw new HttpException(
          'Data de on-duty é obrigatória',
          HttpStatus.BAD_REQUEST,
        );
      }

      const onDutyDate = new Date(body.onDutyDate);
      if (isNaN(onDutyDate.getTime())) {
        throw new HttpException(
          'Data de on-duty inválida',
          HttpStatus.BAD_REQUEST,
        );
      }

      await this.medalsService.updateLastOnDutyDate(userId, onDutyDate);
      return { success: true, message: 'Data de on-duty atualizada' };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Erro ao atualizar data de on-duty',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
