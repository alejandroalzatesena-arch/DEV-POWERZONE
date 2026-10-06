import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/base.entity';
import { ClassStatus } from '../../../common/enums';
import { Gym } from '../../gyms/entities/gym.entity';
import { User } from '../../users/entities/user.entity';
import { ClassBooking } from './class-booking.entity';

@Entity('gym_classes')
@Index('idx_gym_classes_gym_id', ['gymId'])
@Index('idx_gym_classes_instructor_id', ['instructorId'])
@Index('idx_gym_classes_start_time', ['startTime'])
export class GymClass extends TenantBaseEntity {
  @ApiProperty({ description: 'ID del gimnasio (multi-tenancy)' })
  @Column({ name: 'gym_id', type: 'uuid' })
  gymId: string;

  @ManyToOne(() => Gym, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'gym_id' })
  gym: Gym;

  @ApiProperty({ description: 'Nombre de la clase', example: 'Cross Training' })
  @Column({ length: 120 })
  name: string;

  @ApiPropertyOptional({ description: 'Descripción' })
  @Column({ length: 1000, nullable: true })
  description: string;

  @ApiPropertyOptional({ description: 'Categoría', example: 'HIIT' })
  @Column({ length: 60, nullable: true })
  category: string;

  @Column({ name: 'instructor_id', type: 'uuid' })
  instructorId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'instructor_id' })
  instructor: User;

  @ApiProperty({ description: 'Capacidad máxima de la clase', example: 20 })
  @Column({ type: 'int', default: 20 })
  capacity: number;

  @ApiProperty({ description: 'Inicio (fecha y hora local ISO)', type: String })
  @Column({ name: 'start_time', type: 'timestamptz' })
  startTime: Date;

  @ApiProperty({ description: 'Fin (fecha y hora local ISO)', type: String })
  @Column({ name: 'end_time', type: 'timestamptz' })
  endTime: Date;

  @ApiPropertyOptional({ description: 'Salón / área', example: 'Sala 2' })
  @Column({ length: 100, nullable: true })
  room: string;

  @ApiPropertyOptional({ description: 'Color para calendario', example: '#00d26a' })
  @Column({ length: 9, nullable: true })
  color: string;

  @ApiProperty({ description: 'Estado de la clase', enum: ClassStatus, default: 'scheduled' })
  @Column({ length: 20, default: ClassStatus.SCHEDULED })
  status: ClassStatus;

  @ApiProperty({ description: 'Si está activa', default: true })
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => ClassBooking, (booking) => booking.gymClass)
  bookings: ClassBooking[];
}
