import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { MaintenanceStatus } from '../../../common/enums';
import { InventoryItem } from './inventory-item.entity';

@Entity('inventory_maintenances')
@Index('idx_maintenance_item_id', ['itemId'])
@Index('idx_maintenance_status', ['status'])
export class InventoryMaintenance extends BaseEntity {
  @Column({ name: 'item_id', type: 'uuid' })
  itemId: string;

  @ManyToOne(() => InventoryItem, (item) => item.maintenances, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_id' })
  item: InventoryItem;

  @ApiProperty({ description: 'Descripción del mantenimiento' })
  @Column({ length: 1000 })
  description: string;

  @ApiProperty({ description: 'Fecha programada' })
  @Column({ name: 'scheduled_at', type: 'date' })
  scheduledAt: string;

  @ApiPropertyOptional({ description: 'Fecha de finalización' })
  @Column({ name: 'completed_at', type: 'date', nullable: true })
  completedAt: string;

  @ApiPropertyOptional({ description: 'Costo del mantenimiento', example: 80 })
  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  cost: number;

  @ApiPropertyOptional({ description: 'Técnico responsable' })
  @Column({ length: 150, nullable: true })
  technician: string;

  @ApiProperty({ description: 'Estado', enum: MaintenanceStatus, default: 'scheduled' })
  @Column({ length: 20, default: MaintenanceStatus.SCHEDULED })
  status: string;
}
