import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { ExerciseCategory } from '../../../common/enums';

export class CreateExerciseDto {
  @ApiProperty({ description: 'Nombre del ejercicio', example: 'Press de banca' })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional({ description: 'Descripción / técnica' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ description: 'Categoría', enum: ExerciseCategory })
  @IsEnum(ExerciseCategory)
  category: ExerciseCategory;

  @ApiProperty({ description: 'Grupo muscular principal', example: 'Pectoral' })
  @IsString()
  @MaxLength(60)
  muscleGroup: string;

  @ApiPropertyOptional({ description: 'Equipo necesario' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  equipmentNeeded?: string;

  @ApiPropertyOptional({ description: 'Dificultad 1-5' })
  @IsOptional()
  @IsInt()
  @Max(5)
  difficulty?: number;

  @ApiPropertyOptional({ description: 'Instrucciones paso a paso', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  instructions?: string[];

  @ApiPropertyOptional({ description: 'URL de video demostrativo' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  videoUrl?: string;

  @ApiPropertyOptional({ description: 'URL de imagen' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;
}

export class UpdateExerciseDto {
  @ApiPropertyOptional({ description: 'Nombre' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({ description: 'Descripción' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ description: 'Categoría', enum: ExerciseCategory })
  @IsOptional()
  @IsEnum(ExerciseCategory)
  category?: ExerciseCategory;

  @ApiPropertyOptional({ description: 'Grupo muscular' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  muscleGroup?: string;

  @ApiPropertyOptional({ description: 'Equipo necesario' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  equipmentNeeded?: string;

  @ApiPropertyOptional({ description: 'Dificultad 1-5' })
  @IsOptional()
  @IsInt()
  @Max(5)
  difficulty?: number;

  @ApiPropertyOptional({ description: 'Instrucciones', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  instructions?: string[];

  @ApiPropertyOptional({ description: 'URL de video' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  videoUrl?: string;

  @ApiPropertyOptional({ description: 'URL de imagen' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Activo' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class QueryExercisesDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filtrar por categoría', enum: ExerciseCategory })
  @IsOptional()
  @IsEnum(ExerciseCategory)
  category?: ExerciseCategory;

  @ApiPropertyOptional({ description: 'Búsqueda por nombre o grupo muscular' })
  @IsOptional()
  @IsString()
  search?: string;
}
