import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ExerciseCategory } from '../../../common/enums';

@Entity('exercises')
@Index('idx_exercises_category', ['category'])
@Index('idx_exercises_name', ['name'])
export class Exercise extends BaseEntity {
  @ApiProperty({ description: 'Nombre del ejercicio', example: 'Press de banca' })
  @Column({ length: 150 })
  name: string;

  @ApiPropertyOptional({ description: 'Descripción / técnica' })
  @Column({ length: 2000, nullable: true })
  description: string;

  @ApiProperty({ description: 'Categoría / grupo muscular', enum: ExerciseCategory })
  @Column({ length: 30 })
  category: ExerciseCategory;

  @ApiProperty({ description: 'Grupo muscular principal', example: 'Pectoral' })
  @Column({ name: 'muscle_group', length: 60 })
  muscleGroup: string;

  @ApiPropertyOptional({ description: 'Equipo necesario', example: 'barra, disco 20kg' })
  @Column({ name: 'equipment_needed', length: 255, nullable: true })
  equipmentNeeded: string;

  @ApiPropertyOptional({ description: 'Dificultad 1-5', example: 2 })
  @Column({ type: 'int', nullable: true })
  difficulty: number;

  @ApiPropertyOptional({ description: 'Instrucciones paso a paso' })
  @Column({ type: 'jsonb', nullable: true })
  instructions: string[];

  @ApiPropertyOptional({ description: 'URL de video demostrativo' })
  @Column({ name: 'video_url', length: 500, nullable: true })
  videoUrl: string;

  @ApiPropertyOptional({ description: 'URL de imagen' })
  @Column({ name: 'image_url', length: 500, nullable: true })
  imageUrl: string;

  @ApiProperty({ description: 'Si está activo', default: true })
  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}