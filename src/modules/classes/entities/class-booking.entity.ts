import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/base.entity';
import { BookingStatus } from '../../../common/enums';
import { Gym } from '../../gyms/entities/gym.entity';
import { GymClass } from './gym-class.entity';
import { User } from '../../users/entities/user.entity';

@Entity('class_bookings')
@Index('idx_class_bookings_gym_id', ['gymId'])
@Index('idx_class_bookings_class_id', ['classId'])
@Index('idx_class_bookings_user_id', ['userId'])
@Index('idx_class_bookings_class_user', ['classId', 'userId'], { unique: true })
export class ClassBooking extends TenantBaseEntity {
  @ApiProperty({ description: 'ID del gimnasio (multi-tenancy)' })
  @Column({ name: 'gym_id', type: 'uuid' })
  gymId: string;

  @ManyToOne(() => Gym, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'gym_id' })
  gym: Gym;

  @Column({ name: 'class_id', type: 'uuid' })
  classId: string;

  @ManyToOne(() => GymClass, (gymClass) => gymClass.bookings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'class_id' })
  gymClass: GymClass;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ApiProperty({ description: 'Estado de la reserva', enum: BookingStatus, default: 'confirmed' })
  @Column({ length: 20, default: BookingStatus.CONFIRMED })
  status: BookingStatus;

  @ApiPropertyOptional({ description: 'Fecha de reserva' })
  @Column({ name: 'booked_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  bookedAt: Date;

  @ApiPropertyOptional({ description: 'Indica si asistió realmente' })
  @Column({ default: false })
  attended: boolean;
}
