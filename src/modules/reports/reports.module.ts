import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { Payment } from '../payments/entities/payment.entity';
import { UserMembership } from '../memberships/entities/user-membership.entity';
import { MembershipType } from '../memberships/entities/membership-type.entity';
import { AttendanceRecord } from '../attendance/entities/attendance.entity';
import { ClassBooking } from '../classes/entities/class-booking.entity';
import { Gym } from '../gyms/entities/gym.entity';
import { User } from '../users/entities/user.entity';
import { UserProfile } from '../users/entities/user-profile.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Payment,
      UserMembership,
      MembershipType,
      AttendanceRecord,
      ClassBooking,
      Gym,
      User,
      UserProfile,
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
