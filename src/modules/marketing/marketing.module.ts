import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketingController } from './marketing.controller';
import { MarketingService } from './marketing.service';
import { Campaign } from './entities/campaign.entity';
import { User } from '../users/entities/user.entity';
import { Gym } from '../gyms/entities/gym.entity';
import { UserMembership } from '../memberships/entities/user-membership.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([Campaign, User, Gym, UserMembership]), NotificationsModule],
  controllers: [MarketingController],
  providers: [MarketingService],
  exports: [MarketingService],
})
export class MarketingModule {}