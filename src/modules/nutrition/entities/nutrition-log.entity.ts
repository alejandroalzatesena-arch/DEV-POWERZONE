import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/base.entity';
import { MealType } from '../../../common/enums';
import { Gym } from '../../gyms/entities/gym.entity';
import { User } from '../../users/entities/user.entity';
import { Food } from './food.entity';

@Entity('nutrition_logs')
@Index('idx_nutrition_logs_gym_id', ['gymId'])
@Index('idx_nutrition_logs_user_id', ['userId'])
@Index('idx_nutrition_logs_eaten_at', ['eatenAt'])
export class NutritionLog extends TenantBaseEntity {
  @ApiProperty({ description: 'ID del gimnasio (multi-tenancy)' })
  @Column({ name: 'gym_id', type: 'uuid' })
  gymId: string;

  @ManyToOne(() => Gym, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'gym_id' })
  gym: Gym;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'food_id', type: 'uuid' })
  foodId: string;

  @ManyToOne(() => Food, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'food_id' })
  food: Food;

  @ApiProperty({ description: 'Tipo de comida', enum: MealType })
  @Column({ name: 'meal_type', length: 30 })
  mealType: MealType;

  @ApiProperty({ description: 'Cantidad consumida en gramos', example: 150 })
  @Column({ type: 'numeric', precision: 8, scale: 1 })
  quantityG: number;

  @ApiProperty({ description: 'Fecha y hora en que se consumió' })
  @Column({ name: 'eaten_at', type: 'timestamptz' })
  eatenAt: Date;

  @ApiPropertyOptional({ description: 'Calorías calculadas (se llena automáticamente)' })
  @Column({ name: 'calculated_calories', type: 'numeric', precision: 8, scale: 1, nullable: true })
  calculatedCalories: number;
}