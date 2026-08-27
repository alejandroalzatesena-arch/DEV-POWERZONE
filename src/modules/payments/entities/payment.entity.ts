import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/base.entity';
import { PaymentMethod, PaymentStatus } from '../../../common/enums';
import { Gym } from '../../gyms/entities/gym.entity';
import { User } from '../../users/entities/user.entity';
import { MembershipType } from '../../memberships/entities/membership-type.entity';

@Entity('payments')
@Index('idx_payments_gym_id', ['gymId'])
@Index('idx_payments_user_id', ['userId'])
@Index('idx_payments_status', ['status'])
@Index('idx_payments_paid_at', ['paidAt'])
export class Payment extends TenantBaseEntity {
  @ApiProperty({ description: 'ID del gimnasio (multi-tenancy)' })
  @Column({ name: 'gym_id', type: 'uuid' })
  gymId: string;

  @ManyToOne(() => Gym, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'gym_id' })
  gym: Gym;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ApiPropertyOptional({ description: 'Tipo de membresía comprada' })
  @Column({ name: 'membership_type_id', type: 'uuid', nullable: true })
  membershipTypeId: string;

  @ManyToOne(() => MembershipType, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'membership_type_id' })
  membershipType: MembershipType;

  @ApiProperty({ description: 'Monto', example: 49.99 })
  @Column({ type: 'numeric', precision: 10, scale: 2 })
  amount: number;

  @ApiProperty({ description: 'Divisa', example: 'usd' })
  @Column({ length: 3, default: 'usd' })
  currency: string;

  @ApiProperty({ description: 'Estado del pago', enum: PaymentStatus, default: 'pending' })
  @Column({ length: 20, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @ApiProperty({ description: 'Método de pago', enum: PaymentMethod, default: 'card' })
  @Column({ name: 'payment_method', length: 20, default: PaymentMethod.CARD })
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({ description: 'PaymentIntent de Stripe' })
  @Column({ name: 'stripe_payment_intent_id', length: 100, nullable: true })
  stripePaymentIntentId: string;

  @ApiPropertyOptional({ description: 'Checkout Session de Stripe' })
  @Column({ name: 'stripe_checkout_session_id', length: 100, nullable: true })
  stripeCheckoutSessionId: string;

  @ApiPropertyOptional({ description: 'Transacción de referencia interna' })
  @Column({ name: 'transaction_id', length: 100, nullable: true })
  transactionId: string;

  @ApiPropertyOptional({ description: 'Fecha de pago' })
  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt: Date;

  @ApiPropertyOptional({ description: 'Metadatos adicionales' })
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;
}