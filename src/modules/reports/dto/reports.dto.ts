import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional } from 'class-validator';

export class ReportQueryDto {
  @ApiPropertyOptional({ description: 'Desde fecha (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Hasta fecha (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ description: 'Formato de salida', enum: ['json', 'csv'], default: 'json' })
  @IsOptional()
  @IsIn(['json', 'csv'])
  format?: 'json' | 'csv';
}

export class UserProgressDto {
  @ApiPropertyOptional({ description: 'Formato de salida', enum: ['json', 'csv'], default: 'json' })
  @IsOptional()
  @IsIn(['json', 'csv'])
  format?: 'json' | 'csv';
}