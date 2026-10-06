import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MembershipsService } from '../modules/memberships/memberships.service';
import { MarketingService } from '../modules/marketing/marketing.service';

@Injectable()
export class ScheduledJobsService {
  private readonly logger = new Logger(ScheduledJobsService.name);

  constructor(
    private readonly membershipsService: MembershipsService,
    private readonly marketingService: MarketingService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async expireOverdueMemberships(): Promise<void> {
    try {
      const count = await this.membershipsService.expireOverdue();
      if (count > 0) {
        this.logger.log(`Membresías expiradas automáticamente: ${count}`);
      }
    } catch (error) {
      this.logger.warn(`No se pudieron expirar membresías: ${(error as Error).message}`);
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async sendScheduledCampaigns(): Promise<void> {
    try {
      const count = await this.marketingService.sendScheduledDue();
      if (count > 0) {
        this.logger.log(`Campañas programadas enviadas: ${count}`);
      }
    } catch (error) {
      this.logger.warn(`No se pudieron enviar campañas programadas: ${(error as Error).message}`);
    }
  }
}
