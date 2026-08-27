import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { FoodCategory, MealType } from '../../../common/enums';

export class CreateFoodDto {
  @ApiProperty({ description: 'Nombre del alimento', example: 'Pechuga de pollo' })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name: string;

  @ApiProperty({ description: 'Categoría', enum: FoodCategory })
  @IsEnum(FoodCategory)
  category: FoodCategory;

  @ApiProperty({ description: 'Porción base en gramos', example: 100 })
  @IsNumber()
  @Min(0)
  servingSizeG: number;

  @ApiProperty({ description: 'Calorías por porción', example: 165 })
  @IsNumber()
  @Min(0)
  calories: number;

  @ApiProperty({ description: 'Proteínas (g) por porción', example: 31 })
  @IsNumber()
  @Min(0)
  protein: number;

  @ApiProperty({ description: 'Carbohidratos (g) por porción', example: 0 })
  @IsNumber()
  @Min(0)
  carbs: number;

  @ApiProperty({ description: 'Grasas (g) por porción', example: 3.6 })
  @IsNumber()
  @Min(0)
  fats: number;

  @ApiPropertyOptional({ description: 'Fibra (g) por porción' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fiber?: number;

  @ApiPropertyOptional({ description: 'Azúcares (g) por porción' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sugar?: number;
}

export class UpdateFoodDto {
  @ApiPropertyOptional({ description: 'Nombre' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({ description: 'Categoría', enum: FoodCategory })
  @IsOptional()
  @IsEnum(FoodCategory)
  category?: FoodCategory;

  @ApiPropertyOptional({ description: 'Porción base en gramos' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  servingSizeG?: number;

  @ApiPropertyOptional({ description: 'Calorías por porción' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  calories?: number;

  @ApiPropertyOptional({ description: 'Proteínas (g)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  protein?: number;

  @ApiPropertyOptional({ description: 'Carbohidratos (g)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  carbs?: number;

  @ApiPropertyOptional({ description: 'Grasas (g)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fats?: number;

  @ApiPropertyOptional({ description: 'Fibra (g)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fiber?: number;

  @ApiPropertyOptional({ description: 'Azúcares (g)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sugar?: number;
}

export class QueryFoodsDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filtrar por categoría', enum: FoodCategory })
  @IsOptional()
  @IsEnum(FoodCategory)
  category?: FoodCategory;

  @ApiPropertyOptional({ description: 'Búsqueda por nombre' })
  @IsOptional()
  @IsString()
  search?: string;
}

export class CreateNutritionLogDto {
  @ApiProperty({ description: 'ID del alimento' })
  @IsUUID()
  foodId: string;

  @ApiProperty({ description: 'Tipo de comida', enum: MealType })
  @IsEnum(MealType)
  mealType: MealType;

  @ApiProperty({ description: 'Cantidad en gramos', example: 150 })
  @IsNumber()
  @Min(0)
  quantityG: number;

  @ApiPropertyOptional({ description: 'Fecha y hora de consumo (ISO 8601). Default: ahora.' })
  @IsOptional()
  @IsDateString()
  eatenAt?: string;
}

export class QueryNutritionLogsDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filtrar por tipo de comida', enum: MealType })
  @IsOptional()
  @IsEnum(MealType)
  mealType?: MealType;

  @ApiPropertyOptional({ description: 'Desde fecha (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Hasta fecha (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ description: 'Filtrar por usuario (solo admin/entrenador)' })
  @IsOptional()
  @IsUUID()
  userId?: string;
}