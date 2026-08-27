import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Routine } from './routine.entity';
import { Exercise } from '../../exercises/entities/exercise.entity';

@Entity('routine_exercises')
@Index('idx_routine_exercises_routine_id', ['routineId'])
@Index('idx_routine_exercises_exercise_id', ['exerciseId'])
export class RoutineExercise extends BaseEntity {
  @Column({ name: 'routine_id', type: 'uuid' })
  routineId: string;

  @ManyToOne(() => Routine, routine => routine.exercises, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'routine_id' })
  routine: Routine;

  @Column({ name: 'exercise_id', type: 'uuid' })
  exerciseId: string;

  @ManyToOne(() => Exercise, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'exercise_id' })
  exercise: Exercise;

  @ApiProperty({ description: 'Día de la semana (1=lunes .. 7=domingo)', example: 1 })
  @Column({ name: 'day_of_week', type: 'int' })
  dayOfWeek: number;

  @ApiProperty({ description: 'Orden dentro del día', example: 1 })
  @Column({ type: 'int', default: 1 })
  order: number;

  @ApiProperty({ description: 'Número de series', example: 4 })
  @Column({ type: 'int' })
  sets: number;

  @ApiProperty({ description: 'Repeticiones', example: 10 })
  @Column({ type: 'int' })
  reps: number;

  @ApiPropertyOptional({ description: 'Descanso en segundos entre series', example: 90 })
  @Column({ name: 'rest_seconds', type: 'int', nullable: true })
  restSeconds: number;

  @ApiPropertyOptional({ description: 'Peso sugerido (kg)', example: 60 })
  @Column({ type: 'numeric', precision: 6, scale: 2, nullable: true })
  weight: number;

  @ApiPropertyOptional({ description: 'Notas / técnica' })
  @Column({ length: 500, nullable: true })
  notes: string;
}