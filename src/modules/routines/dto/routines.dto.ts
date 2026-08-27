import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { RoutineObjective, RoutineStatus } from '../../../common/enums';

export class RoutineExerciseDto {
  @ApiProperty({ description: 'ID del ejercicio' })
  @IsUUID()
  exerciseId: string;

  @ApiProperty({ description: 'Día de la semana (1=lunes .. 7=domingo)', example: 1 })
  @IsInt()
  @Min(1)
  @Max(7)
  dayOfWeek: number;

  @ApiPropertyOptional({ description: 'Orden dentro del día', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  order?: number;

  @ApiProperty({ description: 'Series', example: 4 })
  @IsInt()
  @Min(1)
  sets: number;

  @ApiProperty({ description: 'Repeticiones', example: 10 })
  @IsInt()
  @Min(1)
  reps: number;

  @ApiPropertyOptional({ description: 'Descanso en segundos', example: 90 })
  @IsOptional()
  @IsInt()
  @Min(0)
  restSeconds?: number;

  @ApiPropertyOptional({ description: 'Peso sugerido (kg)', example: 60 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @ApiPropertyOptional({ description: 'Notas / técnica' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class CreateRoutineDto {
  @ApiProperty({ description: 'Título', example: 'Push Pull Legs' })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  title: string;

  @ApiPropertyOptional({ description: 'Descripción' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ description: 'Objetivo', enum: RoutineObjective, default: 'general' })
  @IsOptional()
  @IsEnum(RoutineObjective)
  objective?: RoutineObjective;

  @ApiPropertyOptional({ description: 'Dificultad 1-5', example: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  difficulty?: number;

  @ApiProperty({ description: 'Días por semana', example: 4 })
  @IsInt()
  @Min(1)
  @Max(7)
  daysPerWeek: number;

  @ApiPropertyOptional({ description: 'Duración en semanas', example: 8 })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationWeeks?: number;

  @ApiPropertyOptional({ description: 'Usar como plantilla', default: false })
  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean;

  @ApiPropertyOptional({ description: 'Cliente al que se asigna' })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional({ description: 'Ejercicios de la rutina', type: [RoutineExerciseDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoutineExerciseDto)
  exercises?: RoutineExerciseDto[];
}

export class GenerateRoutineDto {
  @ApiProperty({ description: 'ID del cliente', example: '3f2c4a1e-...' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Objetivo', enum: RoutineObjective })
  @IsEnum(RoutineObjective)
  objective: RoutineObjective;

  @ApiProperty({ description: 'Días por semana', example: 3 })
  @IsInt()
  @Min(1)
  @Max(7)
  daysPerWeek: number;

  @ApiPropertyOptional({ description: 'Dificultad 1-5', default: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  difficulty?: number;

  @ApiPropertyOptional({ description: '¿Usar el servicio de IA? (por defecto generación local)', default: false })
  @IsOptional()
  @IsBoolean()
  useAI?: boolean;
}

export class UpdateRoutineDto {
  @ApiPropertyOptional({ description: 'Título' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  title?: string;

  @ApiPropertyOptional({ description: 'Descripción' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ description: 'Objetivo', enum: RoutineObjective })
  @IsOptional()
  @IsEnum(RoutineObjective)
  objective?: RoutineObjective;

  @ApiPropertyOptional({ description: 'Dificultad 1-5' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  difficulty?: number;

  @ApiPropertyOptional({ description: 'Días por semana' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(7)
  daysPerWeek?: number;

  @ApiPropertyOptional({ description: 'Duración en semanas' })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationWeeks?: number;

  @ApiPropertyOptional({ description: 'Estado', enum: RoutineStatus })
  @IsOptional()
  @IsEnum(RoutineStatus)
  status?: RoutineStatus;

  @ApiPropertyOptional({ description: 'Usar como plantilla' })
  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean;

  @ApiPropertyOptional({ description: 'Ejercicios de la rutina (reemplaza los existentes)', type: [RoutineExerciseDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoutineExerciseDto)
  exercises?: RoutineExerciseDto[];
}

export class AssignRoutineDto {
  @ApiProperty({ description: 'ID del cliente' })
  @IsUUID()
  userId: string;
}

export class QueryRoutinesDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filtrar por objetivo', enum: RoutineObjective })
  @IsOptional()
  @IsEnum(RoutineObjective)
  objective?: RoutineObjective;

  @ApiPropertyOptional({ description: 'Filtrar por estado', enum: RoutineStatus })
  @IsOptional()
  @IsEnum(RoutineStatus)
  status?: RoutineStatus;

  @ApiPropertyOptional({ description: 'Solo plantillas' })
  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean;

  @ApiPropertyOptional({ description: 'Mis rutinas (cliente autenticado)' })
  @IsOptional()
  @IsBoolean()
  mine?: boolean;
}