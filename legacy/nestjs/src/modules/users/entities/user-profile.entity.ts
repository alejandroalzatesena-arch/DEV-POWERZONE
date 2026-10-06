import { ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ActivityLevel, FitnessGoal } from '../../../common/enums';
import { User } from './user.entity';

@Entity('user_profiles')
@Index('idx_user_profiles_user_id', ['userId'])
export class UserProfile extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @OneToOne(() => User, (user) => user.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ApiPropertyOptional({ description: 'Altura en centímetros', example: 178 })
  @Column({ name: 'height_cm', type: 'numeric', precision: 5, scale: 2, nullable: true })
  heightCm: number;

  @ApiPropertyOptional({ description: 'Peso en kilogramos', example: 82.5 })
  @Column({ name: 'weight_kg', type: 'numeric', precision: 5, scale: 2, nullable: true })
  weightKg: number;

  @ApiPropertyOptional({ description: 'Porcentaje de grasa corporal', example: 18 })
  @Column({ name: 'body_fat_pct', type: 'numeric', precision: 5, scale: 2, nullable: true })
  bodyFatPct: number;

  @ApiPropertyOptional({ description: 'Objetivo fitness', enum: FitnessGoal })
  @Column({ length: 30, nullable: true })
  goal: FitnessGoal;

  @ApiPropertyOptional({ description: 'Nivel de actividad', enum: ActivityLevel })
  @Column({ name: 'activity_level', length: 30, nullable: true })
  activityLevel: ActivityLevel;

  @ApiPropertyOptional({ description: 'Condiciones médicas', example: ['alergia al polen'] })
  @Column({ type: 'jsonb', nullable: true })
  medicalConditions: string[];

  @ApiPropertyOptional({ description: 'Contacto de emergencia' })
  @Column({ name: 'emergency_contact_name', length: 120, nullable: true })
  emergencyContactName: string;

  @ApiPropertyOptional({ description: 'Teléfono de emergencia' })
  @Column({ name: 'emergency_contact_phone', length: 50, nullable: true })
  emergencyContactPhone: string;
}
