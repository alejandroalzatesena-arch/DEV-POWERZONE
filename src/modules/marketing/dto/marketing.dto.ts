import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { CampaignStatus, CampaignType } from '../../../common/enums';

export class CreateCampaignDto {
  @ApiProperty({ description: 'Nombre de la campaña', example: 'Renta de enero 20% OFF' })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional({ description: 'Asunto' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;

  @ApiPropertyOptional({ description: 'Contenido / mensaje' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  content?: string;

  @ApiProperty({ description: 'Canal', enum: CampaignType })
  @IsEnum(CampaignType)
  type: CampaignType;

  @ApiPropertyOptional({
    description: 'Segmento de audiencia',
    example: { roles: ['client'], activeMembership: true, goal: 'gain_muscle' },
  })
  @IsOptional()
  @IsObject()
  audience?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Programar envío (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

export class UpdateCampaignDto {
  @ApiPropertyOptional({ description: 'Nombre' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({ description: 'Asunto' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;

  @ApiPropertyOptional({ description: 'Contenido' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  content?: string;

  @ApiPropertyOptional({ description: 'Audiencia' })
  @IsOptional()
  @IsObject()
  audience?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Programación' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

export class SendCampaignDto {
  @ApiPropertyOptional({ description: 'Enviar ahora (ignora la programación)', default: true })
  @IsOptional()
  sendNow?: boolean;
}

export class QueryCampaignsDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filtrar por estado', enum: CampaignStatus })
  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;

  @ApiPropertyOptional({ description: 'Filtrar por tipo', enum: CampaignType })
  @IsOptional()
  @IsEnum(CampaignType)
  type?: CampaignType;
}