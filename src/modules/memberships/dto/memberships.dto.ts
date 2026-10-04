import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { MembershipStatus } from '../../../common/enums';

export class CreateMembershipTypeDto {
  @ApiProperty({ description: 'Nombre del tipo de membresía', example: 'Mensual Premium' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({ description: 'Descripción' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ description: 'Duración en días', example: 30 })
  @IsInt()
  @Min(1)
  durationDays: number;

  @ApiProperty({ description: 'Precio', example: 49.99 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ description: 'Divisa (ISO 4217)', default: 'usd' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiPropertyOptional({
    description: 'Características incluidas',
    type: [String],
    example: ['Sauna', '1 clase grupal/semana'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiPropertyOptional({ description: 'Máximo de clases grupales por semana', example: 4 })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxClassesPerWeek?: number;

  @ApiPropertyOptional({ description: 'Orden de visualización', default: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateMembershipTypeDto {
  @ApiPropertyOptional({ description: 'Nombre' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ description: 'Descripción' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Duración en días' })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationDays?: number;

  @ApiPropertyOptional({ description: 'Precio' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ description: 'Divisa (ISO 4217)' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiPropertyOptional({ description: 'Características incluidas', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @ApiPropertyOptional({ description: 'Máximo de clases grupales por semana' })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxClassesPerWeek?: number;

  @ApiPropertyOptional({ description: 'Activo' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AssignMembershipDto {
  @ApiProperty({ description: 'ID del usuario (cliente)' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'ID del tipo de membresía' })
  @IsUUID()
  membershipTypeId: string;

  @ApiPropertyOptional({ description: 'Precio pagado (si difiere del tipo)', example: 45 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ description: 'Renovación automática', default: false })
  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;

  @ApiPropertyOptional({ description: 'Notas internas' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class QueryMembershipsDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filtrar por estado', enum: MembershipStatus })
  @IsOptional()
  @IsString()
  status?: MembershipStatus;

  @ApiPropertyOptional({ description: 'ID del usuario' })
  @IsOptional()
  @IsUUID()
  userId?: string;
}
