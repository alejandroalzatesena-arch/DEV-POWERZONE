import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';
import { GymClass } from './entities/gym-class.entity';
import { ClassBooking } from './entities/class-booking.entity';
import { User } from '../users/entities/user.entity';
import { UserMembership } from '../memberships/entities/user-membership.entity';

@Module({
  imports: [TypeOrmModule.forFeature([GymClass, ClassBooking, User, UserMembership])],
  controllers: [ClassesController],
  providers: [ClassesService],
  exports: [ClassesService],
})
export class ClassesModule {}