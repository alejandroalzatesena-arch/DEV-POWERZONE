import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { FoodCategory } from '../../../common/enums';

@Entity('foods')
@Index('idx_foods_name', ['name'])
@Index('idx_foods_category', ['category'])
export class Food extends BaseEntity {
  @ApiProperty({ description: 'Nombre del alimento', example: 'Pechuga de pollo' })
  @Column({ length: 150 })
  name: string;

  @ApiProperty({ description: 'Categoría', enum: FoodCategory })
  @Column({ length: 30 })
  category: FoodCategory;

  @ApiProperty({ description: 'Tamaño de la porción base en gramos', example: 100 })
  @Column({ name: 'serving_size_g', type: 'numeric', precision: 7, scale: 1 })
  servingSizeG: number;

  @ApiProperty({ description: 'Calorías por porción', example: 165 })
  @Column({ type: 'numeric', precision: 7, scale: 1 })
  calories: number;

  @ApiProperty({ description: 'Proteínas (g) por porción', example: 31 })
  @Column({ type: 'numeric', precision: 7, scale: 1 })
  protein: number;

  @ApiProperty({ description: 'Carbohidratos (g) por porción', example: 0 })
  @Column({ type: 'numeric', precision: 7, scale: 1 })
  carbs: number;

  @ApiProperty({ description: 'Grasas (g) por porción', example: 3.6 })
  @Column({ type: 'numeric', precision: 7, scale: 1 })
  fats: number;

  @ApiPropertyOptional({ description: 'Fibra (g) por porción', example: 0 })
  @Column({ type: 'numeric', precision: 7, scale: 1, nullable: true })
  fiber: number;

  @ApiPropertyOptional({ description: 'Azúcares (g) por porción', example: 0 })
  @Column({ type: 'numeric', precision: 7, scale: 1, nullable: true })
  sugar: number;
}
