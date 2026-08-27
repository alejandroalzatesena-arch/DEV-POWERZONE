import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { BookingStatus } from '../../../common/enums';

export class CreateClassDto {
  @ApiProperty({ description: 'Nombre de la clase', example: 'Cross Training' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({ description: 'Descripción' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ description: 'Categoría', example: 'HIIT' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string;

  @ApiProperty({ description: 'ID del entrenador (instructor)' })
  @IsUUID()
  instructorId: string;

  @ApiPropertyOptional({ description: 'Capacidad máxima', default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiProperty({ description: 'Inicio (ISO 8601)', example: '2026-08-28T09:00:00.000Z' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ description: 'Fin (ISO 8601)', example: '2026-08-28T10:00:00.000Z' })
  @IsDateString()
  endTime: string;

  @ApiPropertyOptional({ description: 'Salón / área' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  room?: string;

  @ApiPropertyOptional({ description: 'Color para calendario', example: '#00d26a' })
  @IsOptional()
  @IsString()
  @MaxLength(9)
  color?: string;
}

export class UpdateClassDto {
  @ApiPropertyOptional({ description: 'Nombre' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ description: 'Descripción' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ description: 'Categoría' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string;

  @ApiPropertyOptional({ description: 'Instructor' })
  @IsOptional()
  @IsUUID()
  instructorId?: string;

  @ApiPropertyOptional({ description: 'Capacidad máxima' })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional({ description: 'Inicio (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional({ description: 'Fin (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional({ description: 'Salón / área' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  room?: string;

  @ApiPropertyOptional({ description: 'Activa' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class QueryClassesDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filtrar por categoría' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Solo clases futuras', default: true })
  @IsOptional()
  @IsBoolean()
  upcoming?: boolean;

  @ApiPropertyOptional({ description: 'Desde una fecha (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  from?: string;
}

export class BookClassDto {
  @ApiPropertyOptional({ description: 'Modo lista de espera si está llena', default: true })
  @IsOptional()
  @IsBoolean()
  allowWaitlist?: boolean;
}

export class MarkAttendanceDto {
  @ApiProperty({ description: 'ID del cliente' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: '¿Asistió?', default: true })
  @IsOptional()
  @IsBoolean()
  attended?: boolean;
}

export class QueryBookingsDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filtrar por estado', enum: BookingStatus })
  @IsOptional()
  @IsString()
  status?: BookingStatus;
}