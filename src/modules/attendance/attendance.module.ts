import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { AttendanceGateway } from './attendance.gateway';
import { AttendanceRecord } from './entities/attendance.entity';
import { UserMembership } from '../memberships/entities/user-membership.entity';
import { User } from '../users/entities/user.entity';
import { Gym } from '../gyms/entities/gym.entity';
import { GymClass } from '../classes/entities/gym-class.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AttendanceRecord, UserMembership, User, Gym, GymClass])],
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceGateway],
  exports: [AttendanceService],
})
export class AttendanceModule {}
