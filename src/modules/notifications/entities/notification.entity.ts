import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { NotificationChannel, NotificationType } from '../../../common/enums';
import { User } from '../../users/entities/user.entity';

@Entity('notifications')
@Index('idx_notifications_user_id', ['userId'])
@Index('idx_notifications_gym_id', ['gymId'])
@Index('idx_notifications_read', ['isRead'])
export class AppNotification extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ApiPropertyOptional({ description: 'ID del gimnasio (multi-tenancy)' })
  @Column({ name: 'gym_id', type: 'uuid', nullable: true })
  gymId: string | null;

  @ApiProperty({ description: 'Tipo de notificación', enum: NotificationType })
  @Column({ length: 30, default: NotificationType.INFO })
  type: NotificationType;

  @ApiProperty({ description: 'Canal de entrega', enum: NotificationChannel, default: 'in_app' })
  @Column({ length: 20, default: NotificationChannel.IN_APP })
  channel: NotificationChannel;

  @ApiProperty({ description: 'Título', example: 'Cita agendada' })
  @Column({ length: 200 })
  title: string;

  @ApiPropertyOptional({ description: 'Cuerpo del mensaje' })
  @Column({ length: 2000, nullable: true })
  body: string;

  @ApiPropertyOptional({ description: 'Datos adicionales (deep link, objeto relacionado)' })
  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, any>;

  @ApiPropertyOptional({ description: 'Remitente (si es mensajería interna)' })
  @Column({ name: 'sender_id', type: 'uuid', nullable: true })
  senderId: string | null;

  @ApiProperty({ description: 'Si fue leída', default: false })
  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @ApiPropertyOptional({ description: 'Fecha de lectura' })
  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt: Date | null;
}