import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MembershipsModule } from '../modules/memberships/memberships.module';
import { MarketingModule } from '../modules/marketing/marketing.module';
import { ScheduledJobsService } from './scheduled-jobs.service';

@Module({
  imports: [ScheduleModule.forRoot(), MembershipsModule, MarketingModule],
  providers: [ScheduledJobsService],
})
export class SchedulerModule {}
