import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { PaginatedResult, paginate } from '../../common/dto/pagination.dto';
import { MembershipStatus, PaymentMethod, PaymentStatus, UserRole } from '../../common/enums';
import { User } from '../users/entities/user.entity';
import { MembershipType } from './entities/membership-type.entity';
import { UserMembership } from './entities/user-membership.entity';
import { Payment } from '../payments/entities/payment.entity';
import {
  AssignMembershipDto,
  CreateMembershipTypeDto,
  QueryMembershipsDto,
  UpdateMembershipTypeDto,
} from './dto/memberships.dto';

@Injectable()
export class MembershipsService {
  constructor(
    @InjectRepository(MembershipType) private readonly typesRepo: Repository<MembershipType>,
    @InjectRepository(UserMembership) private readonly membershipsRepo: Repository<UserMembership>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Payment) private readonly paymentsRepo: Repository<Payment>,
  ) {}

  private tenantWhere(actor: JwtPayload): Record<string, any> {
    if (actor.isSuperAdmin) return {};
    if (!actor.gymId) throw new ForbiddenException('No perteneces a un gimnasio.');
    return { gymId: actor.gymId };
  }

  // ------------------------------------------------------------------
  // Tipos de membresía
  // ------------------------------------------------------------------
  async createType(dto: CreateMembershipTypeDto, actor: JwtPayload): Promise<MembershipType> {
    if (!actor.gymId && !actor.isSuperAdmin) {
      throw new ForbiddenException('Se requiere un gimnasio.');
    }
    const type = this.typesRepo.create({
      ...dto,
      gymId: actor.gymId as string,
      currency: dto.currency || 'usd',
    });
    return this.typesRepo.save(type);
  }

  async getTypes(actor: JwtPayload, onlyActive = false): Promise<MembershipType[]> {
    const where = this.tenantWhere(actor);
    if (onlyActive) where.isActive = true;
    return this.typesRepo.find({ where, order: { sortOrder: 'ASC' } });
  }

  async getTypeById(id: string, actor: JwtPayload): Promise<MembershipType> {
    const type = await this.typesRepo.findOne({ where: { id, ...this.tenantWhere(actor) } });
    if (!type) throw new NotFoundException('Tipo de membresía no encontrado.');
    return type;
  }

  async updateType(id: string, dto: UpdateMembershipTypeDto, actor: JwtPayload): Promise<MembershipType> {
    const type = await this.getTypeById(id, actor);
    Object.assign(type, dto);
    return this.typesRepo.save(type);
  }

  async removeType(id: string, actor: JwtPayload): Promise<void> {
    const type = await this.getTypeById(id, actor);
    await this.typesRepo.softDelete(type.id);
  }

  // ------------------------------------------------------------------
  // Membresías de usuarios
  // ------------------------------------------------------------------
  async assign(dto: AssignMembershipDto, actor: JwtPayload): Promise<UserMembership> {
    const user = await this.usersRepo.findOne({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado.');
    if (!actor.isSuperAdmin && user.gymId !== actor.gymId) {
      throw new ForbiddenException('El usuario pertenece a otro gimnasio.');
    }
    if (user.role !== UserRole.CLIENT) {
      throw new BadRequestException('Solo se pueden asignar membresías a clientes.');
    }

    const type = await this.getTypeById(dto.membershipTypeId, actor);
    const gymId: string =
      (actor.isSuperAdmin ? (user.gymId as string) : actor.gymId) as string;
    if (!gymId) {
      throw new ForbiddenException('Se requiere un gimnasio para asignar la membresía.');
    }

    const today = new Date();
    const startDate = new Date(today).toISOString().slice(0, 10);
    const end = new Date(today);
    end.setDate(end.getDate() + type.durationDays);
    const endDate = end.toISOString().slice(0, 10);

    // Cancela membresías activas anteriores del mismo cliente.
    await this.membershipsRepo.update(
      { userId: user.id, status: MembershipStatus.ACTIVE },
      { status: MembershipStatus.CANCELLED },
    );

    const membership = new UserMembership();
    membership.gymId = gymId;
    membership.userId = user.id;
    membership.membershipTypeId = type.id;
    membership.startDate = startDate;
    membership.endDate = endDate;
    membership.status = MembershipStatus.ACTIVE;
    membership.autoRenew = dto.autoRenew ?? false;
    membership.price = dto.price ?? type.price;
    membership.notes = dto.notes ?? null;
    const saved = await this.membershipsRepo.save(membership);

    const payment = new Payment();
    payment.gymId = gymId;
    payment.userId = user.id;
    payment.membershipTypeId = type.id;
    payment.amount = Number(dto.price ?? type.price);
    payment.currency = type.currency;
    payment.status = PaymentStatus.SUCCEEDED;
    payment.paymentMethod = PaymentMethod.CASH;
    payment.paidAt = new Date();
    payment.metadata = { membershipId: saved.id };
    await this.paymentsRepo.save(payment);

    return saved;
  }

  async findAll(query: QueryMembershipsDto, actor: JwtPayload): Promise<PaginatedResult<UserMembership>> {
    const { page, limit, sortBy, sortOrder, status, userId } = query;
    const where: Record<string, any> = this.tenantWhere(actor);
    if (status) where.status = status;
    if (userId) where.userId = userId;

    const [items, total] = await this.membershipsRepo.findAndCount({
      where,
      relations: ['membershipType', 'user'],
      order: { [sortBy || 'createdAt']: sortOrder || 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return paginate(items, total, page, limit);
  }

  async findActiveForUser(userId: string, actor: JwtPayload): Promise<UserMembership | null> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado.');
    if (!actor.isSuperAdmin && user.gymId !== actor.gymId) {
      throw new ForbiddenException('Usuario de otro gimnasio.');
    }
    return this.membershipsRepo.findOne({
      where: { userId, status: MembershipStatus.ACTIVE },
      relations: ['membershipType'],
      order: { createdAt: 'DESC' },
    });
  }

  async renew(id: string, actor: JwtPayload): Promise<UserMembership> {
    const membership = await this.membershipsRepo.findOne({
      where: { id, ...this.tenantWhere(actor) },
      relations: ['membershipType'],
    });
    if (!membership) throw new NotFoundException('Membresía no encontrada.');

    const today = new Date();
    const end = new Date();
    const durationDays = membership.membershipType?.durationDays ?? 30;
    end.setDate(end.getDate() + durationDays);

    membership.startDate = today.toISOString().slice(0, 10);
    membership.endDate = end.toISOString().slice(0, 10);
    membership.status = MembershipStatus.ACTIVE;
    membership.autoRenew = true;

    await this.paymentsRepo.save(
      this.paymentsRepo.create({
        gymId: membership.gymId,
        userId: membership.userId,
        membershipTypeId: membership.membershipTypeId,
        amount: Number(membership.price),
        currency: membership.membershipType?.currency ?? 'usd',
        status: PaymentStatus.SUCCEEDED,
        paymentMethod: PaymentMethod.CASH,
        paidAt: new Date(),
        metadata: { membershipId: membership.id, renewal: true },
      }),
    );

    return this.membershipsRepo.save(membership);
  }

  async cancel(id: string, actor: JwtPayload): Promise<UserMembership> {
    const membership = await this.membershipsRepo.findOne({
      where: { id, ...this.tenantWhere(actor) },
    });
    if (!membership) throw new NotFoundException('Membresía no encontrada.');
    membership.status = MembershipStatus.CANCELLED;
    membership.autoRenew = false;
    return this.membershipsRepo.save(membership);
  }

  // Expira membresías vencidas (usado por el scheduler).
  async expireOverdue(): Promise<number> {
    const today = new Date().toISOString().slice(0, 10);
    const qb = this.membershipsRepo
      .createQueryBuilder()
      .update()
      .set({ status: MembershipStatus.EXPIRED })
      .where('status = :status', { status: MembershipStatus.ACTIVE })
      .andWhere('end_date < :today', { today });
    const executed = await qb.execute();
    return executed.affected ?? 0;
  }
}