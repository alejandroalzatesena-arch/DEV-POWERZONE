import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/base.entity';
import { MembershipStatus } from '../../../common/enums';
import { Gym } from '../../gyms/entities/gym.entity';
import { MembershipType } from './membership-type.entity';
import { User } from '../../users/entities/user.entity';

@Entity('user_memberships')
@Index('idx_user_memberships_gym_id', ['gymId'])
@Index('idx_user_memberships_user_id', ['userId'])
@Index('idx_user_memberships_status', ['status'])
export class UserMembership extends TenantBaseEntity {
  @ApiProperty({ description: 'ID del gimnasio (multi-tenancy)' })
  @Column({ name: 'gym_id', type: 'uuid' })
  gymId: string;

  @ManyToOne(() => Gym, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'gym_id' })
  gym: Gym;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'membership_type_id', type: 'uuid' })
  membershipTypeId: string;

  @ManyToOne(() => MembershipType, mt => mt.userMemberships, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'membership_type_id' })
  membershipType: MembershipType;

  @ApiProperty({ description: 'Fecha de inicio' })
  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @ApiProperty({ description: 'Fecha de fin' })
  @Column({ name: 'end_date', type: 'date' })
  endDate: string;

  @ApiProperty({ description: 'Estado de la membresía', enum: MembershipStatus, default: 'active' })
  @Column({ length: 20, default: MembershipStatus.ACTIVE })
  status: MembershipStatus;

  @ApiProperty({ description: 'Renovación automática', default: false })
  @Column({ name: 'auto_renew', default: false })
  autoRenew: boolean;

  @ApiPropertyOptional({ description: 'Precio pagado (puede diferir del tipo si hubo descuento)' })
  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  price: number;

  @ApiPropertyOptional({ description: 'Notas internas' })
  @Column({ type: 'varchar', length: 500, nullable: true })
  notes: string | null;
}
