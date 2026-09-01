import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import Stripe from 'stripe';
import { Repository } from 'typeorm';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { PaginatedResult, paginate } from '../../common/dto/pagination.dto';
import { MembershipStatus, PaymentMethod, PaymentStatus, UserRole } from '../../common/enums';
import { User } from '../users/entities/user.entity';
import { MembershipType } from '../memberships/entities/membership-type.entity';
import { UserMembership } from '../memberships/entities/user-membership.entity';
import { Payment } from './entities/payment.entity';
import { CreateCheckoutDto, CreatePaymentDto, QueryPaymentsDto } from './dto/payments.dto';

export class StripeNotConfiguredError extends Error {
  constructor() {
    super('Stripe no está configurado. Define STRIPE_SECRET_KEY para usar pagos con tarjeta.');
  }
}

@Injectable()
export class PaymentsService {
  private stripe: Stripe | null = null;

  constructor(
    @InjectRepository(Payment) private readonly paymentsRepo: Repository<Payment>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(MembershipType) private readonly typesRepo: Repository<MembershipType>,
    @InjectRepository(UserMembership) private readonly membershipsRepo: Repository<UserMembership>,
    private readonly configService: ConfigService,
  ) {
    const key = this.configService.get<string>('payments.stripeSecretKey');
    if (key) {
      this.stripe = new Stripe(key, { apiVersion: '2024-06-20' as Stripe.LatestApiVersion });
    }
  }

  get isStripeConfigured(): boolean {
    return this.stripe !== null;
  }

  private tenantWhere(actor: JwtPayload): Record<string, any> {
    if (actor.isSuperAdmin) return {};
    if (!actor.gymId) throw new ForbiddenException('No perteneces a un gimnasio.');
    return { gymId: actor.gymId };
  }

  async create(dto: CreatePaymentDto, actor: JwtPayload): Promise<Payment> {
    const user = await this.usersRepo.findOne({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado.');
    if (!actor.isSuperAdmin && user.gymId !== actor.gymId) {
      throw new ForbiddenException('El usuario pertenece a otro gimnasio.');
    }

    const gymId = actor.isSuperAdmin ? (user.gymId as string) : actor.gymId;
    if (!gymId) throw new ForbiddenException('Se requiere un gimnasio.');

    const payment = this.paymentsRepo.create({
      gymId,
      userId: user.id,
      membershipTypeId: dto.membershipTypeId,
      amount: dto.amount,
      currency: dto.currency || this.configService.get<string>('payments.currency') || 'usd',
      status: PaymentStatus.SUCCEEDED,
      paymentMethod: dto.paymentMethod || PaymentMethod.CASH,
      transactionId: dto.transactionId,
      metadata: dto.metadata,
      paidAt: new Date(),
    });
    return this.paymentsRepo.save(payment);
  }

  async findAll(query: QueryPaymentsDto, actor: JwtPayload): Promise<PaginatedResult<Payment>> {
    const { page = 1, limit = 20, sortBy, sortOrder, status, userId } = query;
    const where: Record<string, any> = this.tenantWhere(actor);
    if (status) where.status = status;
    if (userId) where.userId = userId;

    const [items, total] = await this.paymentsRepo.findAndCount({
      where,
      relations: ['user'],
      order: { [sortBy || 'createdAt']: sortOrder || 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return paginate(items, total, page, limit);
  }

  async findById(id: string, actor: JwtPayload): Promise<Payment> {
    const payment = await this.paymentsRepo.findOne({
      where: { id, ...this.tenantWhere(actor) },
      relations: ['user'],
    });
    if (!payment) throw new NotFoundException('Pago no encontrado.');
    return payment;
  }

  /**
   * Crea una checkout session de Stripe. El usuario que paga es el autenticado
   * (si es cliente) o el indicado en `dto.userId` (admin/recepcionista).
   * Si Stripe no está configurado, crea un pago en estado `pending` y devuelve
   * una URL de pago "mock" para propósitos de desarrollo.
   */
  async createCheckout(
    dto: CreateCheckoutDto,
    actor: JwtPayload,
  ): Promise<{ url: string; paymentId: string }> {
    let payerId = actor.sub;
    if (actor.role !== UserRole.CLIENT && actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Solo clientes o administradores pueden iniciar un checkout.');
    }
    if (dto.userId && actor.role === UserRole.CLIENT && dto.userId !== actor.sub) {
      throw new ForbiddenException('Un cliente solo puede pagar su propia membresía.');
    }
    if (dto.userId) payerId = dto.userId;

    const user = await this.usersRepo.findOne({ where: { id: payerId } });
    if (!user) throw new NotFoundException('Usuario no encontrado.');
    if (!actor.isSuperAdmin && (actor.role !== UserRole.CLIENT || user.id !== actor.sub)) {
      if (user.gymId !== actor.gymId) {
        throw new ForbiddenException('El usuario pertenece a otro gimnasio.');
      }
    }

    const type = await this.typesRepo.findOne({
      where: { id: dto.membershipTypeId, ...this.tenantWhere(actor) },
    });
    if (!type) throw new NotFoundException('Tipo de membresía no encontrado.');

    const payment = await this.paymentsRepo.save(
      this.paymentsRepo.create({
        gymId: user.gymId as string,
        userId: user.id,
        membershipTypeId: type.id,
        amount: Number(type.price),
        currency: type.currency,
        status: PaymentStatus.PENDING,
        paymentMethod: this.stripe ? PaymentMethod.STRIPE : PaymentMethod.CASH,
        metadata: { checkout: true },
      }),
    );

    if (!this.stripe) {
      const port = this.configService.get<number>('app.port') ?? 3000;
      const url = `http://localhost:${port}/api/payments/mock-checkout/${payment.id}`;
      return { url, paymentId: payment.id };
    }

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: type.currency,
            product_data: { name: type.name },
            unit_amount: Math.round(Number(type.price) * 100),
          },
          quantity: 1,
        },
      ],
      customer_email: user.email,
      success_url: dto.successUrl || `http://localhost:3001/checkout/success?payment_id=${payment.id}`,
      cancel_url: dto.cancelUrl || `http://localhost:3001/checkout/cancel`,
      metadata: { paymentId: payment.id, gymId: user.gymId!, userId: user.id },
    });

    payment.stripeCheckoutSessionId = session.id;
    await this.paymentsRepo.save(payment);

    return { url: session.url || '', paymentId: payment.id };
  }

  /**
   * Simula la finalización de un checkout en desarrollo (marcar pago como pagado).
   */
  async mockConfirmCheckout(paymentId: string, actor: JwtPayload): Promise<Payment> {
    const payment = await this.findById(paymentId, actor);
    if (payment.status === PaymentStatus.SUCCEEDED) {
      return payment;
    }
    payment.status = PaymentStatus.SUCCEEDED;
    payment.paidAt = new Date();
    await this.paymentsRepo.save(payment);

    if (payment.membershipTypeId) {
      const type = await this.typesRepo.findOne({ where: { id: payment.membershipTypeId } });
      if (type) {
        await this.membershipsRepo.update(
          { userId: payment.userId, status: MembershipStatus.ACTIVE },
          { status: MembershipStatus.CANCELLED },
        );
        const today = new Date();
        const end = new Date();
        end.setDate(end.getDate() + type.durationDays);
        await this.membershipsRepo.save(
          this.membershipsRepo.create({
            gymId: payment.gymId,
            userId: payment.userId,
            membershipTypeId: type.id,
            startDate: today.toISOString().slice(0, 10),
            endDate: end.toISOString().slice(0, 10),
            status: MembershipStatus.ACTIVE,
            price: Number(type.price),
          }),
        );
      }
    }
    return payment;
  }

  /**
   * Procesa eventos de Stripe (webhook). Idempotente.
   */
  async handleStripeWebhook(payload: string, signature: string): Promise<{ received: boolean }> {
    if (!this.stripe) throw new StripeNotConfiguredError();
    const secret = this.configService.get<string>('payments.stripeWebhookSecret');
    if (!secret) throw new StripeNotConfiguredError();

    const event = this.stripe.webhooks.constructEvent(payload, signature, secret);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await this.confirmPaymentForSession(session);
        break;
      }
      case 'payment_intent.succeeded': {
        const intent = event.data.object as Stripe.PaymentIntent;
        await this.paymentsRepo.update(
          { stripePaymentIntentId: intent.id },
          { status: PaymentStatus.SUCCEEDED, paidAt: new Date() },
        );
        break;
      }
      default:
        break;
    }

    return { received: true };
  }

  private async confirmPaymentForSession(session: Stripe.Checkout.Session): Promise<void> {
    const paymentId = session.metadata?.paymentId;
    if (!paymentId) return;

    await this.validatePaymentSession(paymentId, session);
  }

  async validatePaymentSession(paymentId: string, session: Stripe.Checkout.Session): Promise<void> {
    const payment = await this.paymentsRepo.findOne({ where: { id: paymentId } });
    if (!payment || payment.status === PaymentStatus.SUCCEEDED) return;

    payment.status = PaymentStatus.SUCCEEDED;
    payment.paidAt = new Date();
    payment.stripeCheckoutSessionId = session.id;
    await this.paymentsRepo.save(payment);

    if (payment.membershipTypeId) {
      const type = await this.typesRepo.findOne({ where: { id: payment.membershipTypeId } });
      if (type) {
        await this.membershipsRepo.update(
          { userId: payment.userId, status: MembershipStatus.ACTIVE },
          { status: MembershipStatus.CANCELLED },
        );
        const today = new Date();
        const end = new Date();
        end.setDate(end.getDate() + type.durationDays);
        await this.membershipsRepo.save(
          this.membershipsRepo.create({
            gymId: payment.gymId,
            userId: payment.userId,
            membershipTypeId: type.id,
            startDate: today.toISOString().slice(0, 10),
            endDate: end.toISOString().slice(0, 10),
            status: MembershipStatus.ACTIVE,
            price: Number(type.price),
          }),
        );
      }
    }
  }
}
