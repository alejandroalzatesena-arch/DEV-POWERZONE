import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/base.entity';
import { AttendanceMethod, AttendanceType } from '../../../common/enums';
import { Gym } from '../../gyms/entities/gym.entity';
import { User } from '../../users/entities/user.entity';
import { GymClass } from '../../classes/entities/gym-class.entity';

@Entity('attendance_records')
@Index('idx_attendance_gym_id', ['gymId'])
@Index('idx_attendance_user_id', ['userId'])
@Index('idx_attendance_timestamp', ['timestamp'])
export class AttendanceRecord extends TenantBaseEntity {
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

  @ApiProperty({ description: 'Tipo de registro', enum: AttendanceType })
  @Column({ length: 20 })
  type: AttendanceType;

  @ApiPropertyOptional({ description: 'Clase asociada (si aplica)' })
  @Column({ name: 'class_id', type: 'uuid', nullable: true })
  classId: string;

  @ManyToOne(() => GymClass, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'class_id' })
  gymClass: GymClass;

  @ApiProperty({ description: 'Método de registro', enum: AttendanceMethod, default: 'member_card' })
  @Column({ length: 20, default: AttendanceMethod.MEMBER_CARD })
  method: AttendanceMethod;

  @ApiProperty({ description: 'Fecha y hora del evento' })
  @Column({ type: 'timestamptz' })
  timestamp: Date;
}