import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsObject, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class ChatDto {
  @ApiPropertyOptional({ description: 'ID de sesión del chat', example: 'session-abc' })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiProperty({ description: 'Mensaje del usuario', example: '¿Qué clases hay mañana?' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  message: string;

  @ApiPropertyOptional({ description: 'Contexto adicional (gym, usuario, etc.)' })
  @IsOptional()
  @IsObject()
  context?: Record<string, any>;
}

export class AiGenerateRoutineDto {
  @ApiProperty({ description: 'ID del cliente' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Objetivo', example: 'gain_muscle' })
  @IsString()
  objective: string;

  @ApiProperty({ description: 'Días por semana', example: 4 })
  @IsNumber()
  daysPerWeek: number;

  @ApiPropertyOptional({ description: 'Dificultad 1-5', default: 3 })
  @IsOptional()
  @IsNumber()
  difficulty?: number;
}

export class AiRecommendationDto {
  @ApiProperty({ description: 'ID del usuario' })
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({ description: 'Contexto adicional' })
  @IsOptional()
  @IsObject()
  context?: Record<string, any>;
}