import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/base.entity';
import { InventoryCategory, InventoryCondition, InventoryStatus } from '../../../common/enums';
import { Gym } from '../../gyms/entities/gym.entity';
import { InventoryMaintenance } from './inventory-maintenance.entity';

@Entity('inventory_items')
@Index('idx_inventory_gym_id', ['gymId'])
@Index('idx_inventory_category', ['category'])
@Index('idx_inventory_status', ['status'])
export class InventoryItem extends TenantBaseEntity {
  @ApiProperty({ description: 'ID del gimnasio (multi-tenancy)' })
  @Column({ name: 'gym_id', type: 'uuid' })
  gymId: string;

  @ManyToOne(() => Gym, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'gym_id' })
  gym: Gym;

  @ApiProperty({ description: 'Nombre del equipo/artículo', example: 'Banco de press' })
  @Column({ length: 150 })
  name: string;

  @ApiPropertyOptional({ description: 'Descripción' })
  @Column({ length: 1000, nullable: true })
  description: string;

  @ApiProperty({ description: 'Categoría', enum: InventoryCategory })
  @Column({ length: 30 })
  category: string;

  @ApiProperty({ description: 'Cantidad total registrada', example: 4 })
  @Column({ type: 'int' })
  quantity: number;

  @ApiProperty({ description: 'Cantidad disponible (no dañada / no en mantenimiento)', example: 3 })
  @Column({ type: 'int', default: 0 })
  availableQuantity: number;

  @ApiProperty({ description: 'Condición', enum: InventoryCondition, default: 'good' })
  @Column({ length: 20, default: InventoryCondition.GOOD })
  condition: string;

  @ApiProperty({ description: 'Estado actual', enum: InventoryStatus, default: 'available' })
  @Column({ length: 30, default: InventoryStatus.AVAILABLE })
  status: string;

  @ApiPropertyOptional({ description: 'Precio de reposición', example: 499.99 })
  @Column({ name: 'replacement_cost', type: 'numeric', precision: 12, scale: 2, nullable: true })
  replacementCost: number;

  @ApiPropertyOptional({ description: 'Fecha de compra' })
  @Column({ name: 'purchased_at', type: 'date', nullable: true })
  purchasedAt: string;

  @ApiPropertyOptional({ description: 'Proveedor', example: 'Spartan Fitness' })
  @Column({ length: 150, nullable: true })
  supplier: string;

  @ApiPropertyOptional({ description: 'Ubicación', example: 'Área de pesas' })
  @Column({ length: 100, nullable: true })
  location: string;

  @OneToMany(() => InventoryMaintenance, (m) => m.item)
  maintenances: InventoryMaintenance[];
}
