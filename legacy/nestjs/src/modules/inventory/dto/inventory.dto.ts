import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import {
  InventoryCategory,
  InventoryCondition,
  InventoryStatus,
  MaintenanceStatus,
} from '../../../common/enums';

export class CreateInventoryItemDto {
  @ApiProperty({ description: 'Nombre del equipo/artículo', example: 'Banco de press' })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional({ description: 'Descripción' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ description: 'Categoría', enum: InventoryCategory })
  @IsEnum(InventoryCategory)
  category: InventoryCategory;

  @ApiProperty({ description: 'Cantidad total', example: 4 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ description: 'Cantidad disponible', example: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  availableQuantity?: number;

  @ApiPropertyOptional({ description: 'Condición', enum: InventoryCondition, default: 'good' })
  @IsOptional()
  @IsEnum(InventoryCondition)
  condition?: InventoryCondition;

  @ApiPropertyOptional({ description: 'Estado', enum: InventoryStatus, default: 'available' })
  @IsOptional()
  @IsEnum(InventoryStatus)
  status?: InventoryStatus;

  @ApiPropertyOptional({ description: 'Costo de reposición', example: 499.99 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  replacementCost?: number;

  @ApiPropertyOptional({ description: 'Fecha de compra (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  purchasedAt?: string;

  @ApiPropertyOptional({ description: 'Proveedor' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  supplier?: string;

  @ApiPropertyOptional({ description: 'Ubicación' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;
}

export class UpdateInventoryItemDto {
  @ApiPropertyOptional({ description: 'Nombre' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({ description: 'Descripción' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ description: 'Categoría', enum: InventoryCategory })
  @IsOptional()
  @IsEnum(InventoryCategory)
  category?: InventoryCategory;

  @ApiPropertyOptional({ description: 'Cantidad total' })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({ description: 'Cantidad disponible' })
  @IsOptional()
  @IsInt()
  @Min(0)
  availableQuantity?: number;

  @ApiPropertyOptional({ description: 'Condición', enum: InventoryCondition })
  @IsOptional()
  @IsEnum(InventoryCondition)
  condition?: InventoryCondition;

  @ApiPropertyOptional({ description: 'Estado', enum: InventoryStatus })
  @IsOptional()
  @IsEnum(InventoryStatus)
  status?: InventoryStatus;

  @ApiPropertyOptional({ description: 'Costo de reposición' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  replacementCost?: number;

  @ApiPropertyOptional({ description: 'Ubicación' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;
}

export class QueryInventoryDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filtrar por categoría', enum: InventoryCategory })
  @IsOptional()
  @IsEnum(InventoryCategory)
  category?: InventoryCategory;

  @ApiPropertyOptional({ description: 'Filtrar por estado', enum: InventoryStatus })
  @IsOptional()
  @IsEnum(InventoryStatus)
  status?: InventoryStatus;

  @ApiPropertyOptional({ description: 'Búsqueda por nombre' })
  @IsOptional()
  @IsString()
  search?: string;
}

export class CreateMaintenanceDto {
  @ApiProperty({ description: 'ID del equipo' })
  @IsOptional()
  @IsUUID()
  itemId?: string;

  @ApiProperty({ description: 'Descripción del mantenimiento' })
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  description: string;

  @ApiProperty({ description: 'Fecha programada (YYYY-MM-DD)' })
  @IsDateString()
  scheduledAt: string;

  @ApiPropertyOptional({ description: 'Costo estimado' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @ApiPropertyOptional({ description: 'Técnico responsable' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  technician?: string;
}

export class UpdateMaintenanceDto {
  @ApiPropertyOptional({ description: 'Cambiar estado', enum: MaintenanceStatus })
  @IsOptional()
  @IsEnum(MaintenanceStatus)
  status?: MaintenanceStatus;

  @ApiPropertyOptional({ description: 'Fecha de finalización (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  completedAt?: string;

  @ApiPropertyOptional({ description: 'Costo real' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @ApiPropertyOptional({ description: 'Técnico responsable' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  technician?: string;

  @ApiPropertyOptional({ description: 'Descripción' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
