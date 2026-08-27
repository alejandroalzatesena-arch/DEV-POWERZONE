import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/base.entity';
import { RoutineObjective, RoutineStatus } from '../../../common/enums';
import { Gym } from '../../gyms/entities/gym.entity';
import { User } from '../../users/entities/user.entity';
import { RoutineExercise } from './routine-exercise.entity';

@Entity('routines')
@Index('idx_routines_gym_id', ['gymId'])
@Index('idx_routines_assignee_id', ['assigneeId'])
@Index('idx_routines_status', ['status'])
export class Routine extends TenantBaseEntity {
  @ApiProperty({ description: 'ID del gimnasio (multi-tenancy)' })
  @Column({ name: 'gym_id', type: 'uuid' })
  gymId: string;

  @ManyToOne(() => Gym, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'gym_id' })
  gym: Gym;

  @ApiProperty({ description: 'Título de la rutina', example: 'Push Pull Legs' })
  @Column({ length: 150 })
  title: string;

  @ApiPropertyOptional({ description: 'Descripción' })
  @Column({ length: 1000, nullable: true })
  description: string;

  @ApiProperty({ description: 'Objetivo', enum: RoutineObjective })
  @Column({ length: 30, default: RoutineObjective.GENERAL })
  objective: RoutineObjective;

  @ApiPropertyOptional({ description: 'Dificultad 1-5', example: 3 })
  @Column({ type: 'int', nullable: true })
  difficulty: number;

  @ApiProperty({ description: 'Días por semana', example: 4 })
  @Column({ name: 'days_per_week', type: 'int', default: 3 })
  daysPerWeek: number;

  @ApiPropertyOptional({ description: 'Duración en semanas', example: 8 })
  @Column({ name: 'duration_weeks', type: 'int', nullable: true })
  durationWeeks: number;

  @ApiProperty({ description: 'Estado', enum: RoutineStatus, default: 'draft' })
  @Column({ length: 20, default: RoutineStatus.DRAFT })
  status: RoutineStatus;

  @ApiProperty({ description: 'Si es una plantilla reutilizable', default: false })
  @Column({ name: 'is_template', default: false })
  isTemplate: boolean;

  @ApiPropertyOptional({ description: 'Cliente al que está asignada' })
  @Column({ name: 'assignee_id', type: 'uuid', nullable: true })
  assigneeId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assignee_id' })
  assignee: User;

  @Column({ name: 'created_by_id', type: 'uuid' })
  createdById: string;

  @ManyToOne(() => User, user => user.routinesCreated, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @OneToMany(() => RoutineExercise, re => re.routine, { cascade: true })
  exercises: RoutineExercise[];
}