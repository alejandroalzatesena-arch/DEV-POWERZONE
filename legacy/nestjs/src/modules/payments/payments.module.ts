import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { Payment } from './entities/payment.entity';
import { User } from '../users/entities/user.entity';
import { MembershipType } from '../memberships/entities/membership-type.entity';
import { UserMembership } from '../memberships/entities/user-membership.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, User, MembershipType, UserMembership])],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
