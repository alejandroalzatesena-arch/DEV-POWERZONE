import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, MoreThanOrEqual, Repository } from 'typeorm';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { AttendanceType, MembershipStatus, PaymentStatus, UserRole } from '../../common/enums';
import { Gym } from '../gyms/entities/gym.entity';
import { User } from '../users/entities/user.entity';
import { UserProfile } from '../users/entities/user-profile.entity';
import { MembershipType } from '../memberships/entities/membership-type.entity';
import { UserMembership } from '../memberships/entities/user-membership.entity';
import { Payment } from '../payments/entities/payment.entity';
import { AttendanceRecord } from '../attendance/entities/attendance.entity';
import { ClassBooking } from '../classes/entities/class-booking.entity';
import { ReportQueryDto } from './dto/reports.dto';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Payment) private readonly paymentsRepo: Repository<Payment>,
    @InjectRepository(UserMembership) private readonly membershipsRepo: Repository<UserMembership>,
    @InjectRepository(MembershipType) private readonly typesRepo: Repository<MembershipType>,
    @InjectRepository(AttendanceRecord) private readonly attendanceRepo: Repository<AttendanceRecord>,
    @InjectRepository(ClassBooking) private readonly bookingsRepo: Repository<ClassBooking>,
    @InjectRepository(Gym) private readonly gymsRepo: Repository<Gym>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(UserProfile) private readonly profilesRepo: Repository<UserProfile>,
  ) {}

  private assertGymAccess(actor: JwtPayload): string {
    if (actor.isSuperAdmin) {
      // Revisar el gym indicado vía actor.gymId; si super admin sin gym, usar el primero.
      throw new ForbiddenException('Para reportes debes indicar un gimnasio (multi-tenancy).');
    }
    if (!actor.gymId) throw new ForbiddenException('No perteneces a un gimnasio.');
    return actor.gymId;
  }

  private dateRange(query: ReportQueryDto): { from: Date; to: Date } {
    const to = query.to ? new Date(`${query.to}T23:59:59.999`) : new Date();
    const from = query.from
      ? new Date(`${query.from}T00:00:00`)
      : new Date(to.getFullYear(), to.getMonth(), 1);
    return { from, to };
  }

  // ------------------------------------------------------------------
  // Reporte financiero
  // ------------------------------------------------------------------
  async financial(query: ReportQueryDto, actor: JwtPayload): Promise<Record<string, any>> {
    const gymId = this.assertGymAccess(actor);
    const { from, to } = this.dateRange(query);

    const payments = await this.paymentsRepo.find({
      where: { gymId, paidAt: Between(from, to) },
    });

    const succeeded = payments.filter(p => p.status === PaymentStatus.SUCCEEDED);
    const totalRevenue = succeeded.reduce((sum, p) => sum + Number(p.amount), 0);

    const byMethod = new Map<string, number>();
    const daily: Record<string, number> = {};
    for (const payment of succeeded) {
      byMethod.set(payment.paymentMethod, (byMethod.get(payment.paymentMethod) ?? 0) + Number(payment.amount));
      const day = payment.paidAt?.toISOString().slice(0, 10) ?? 'sin-fecha';
      daily[day] = (daily[day] ?? 0) + Number(payment.amount);
    }

    return {
      period: { from: from.toISOString(), to: to.toISOString() },
      totalRevenue,
      totalPayments: payments.length,
      successfulPayments: succeeded.length,
      failedPayments: payments.filter(p => p.status === PaymentStatus.FAILED).length,
      pendingPayments: payments.filter(p => p.status === PaymentStatus.PENDING).length,
      refunded: payments.filter(p => p.status === PaymentStatus.REFUNDED).length,
      revenueByMethod: Object.fromEntries(byMethod),
      dailyRevenue: daily,
    };
  }

  // ------------------------------------------------------------------
  // Reporte operativo
  // ------------------------------------------------------------------
  async operational(actor: JwtPayload): Promise<Record<string, any>> {
    const gymId = this.assertGymAccess(actor);
    const today = new Date();
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);

    const activeMemberships = await this.membershipsRepo.count({
      where: { gymId, status: MembershipStatus.ACTIVE },
    });
    const totalUsers = await this.usersRepo.count({ where: { gymId } });
    const clients = await this.usersRepo.count({ where: { gymId, role: UserRole.CLIENT } });

    const todayRows = await this.attendanceRepo
      .createQueryBuilder('a')
      .select('a.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('a.gym_id = :gymId', { gymId })
      .andWhere('a.timestamp >= :today', { today: todayStart })
      .groupBy('a.type')
      .getRawMany<{ type: string; count: string }>();

    let inside = 0;
    for (const row of todayRows) {
      if (row.type === AttendanceType.CHECK_IN) inside += parseInt(row.count, 10);
      if (row.type === AttendanceType.CHECK_OUT) inside -= parseInt(row.count, 10);
    }

    return {
      gymId,
      totalUsers,
      clients,
      activeMemberships,
      attendanceToday: todayRows.reduce((acc, r) => ({ ...acc, [r.type]: parseInt(r.count, 10) }), {}),
      estimatedCurrentOccupancy: Math.max(0, inside),
      reportedAt: new Date().toISOString(),
    };
  }

  // ------------------------------------------------------------------
  // Reporte de membresías
  // ------------------------------------------------------------------
  async memberships(actor: JwtPayload): Promise<Record<string, any>> {
    const gymId = this.assertGymAccess(actor);

    const types = await this.typesRepo.find({ where: { gymId } });
    const byType: Record<string, { total: number; active: number }> = {};

    for (const type of types) {
      const total = await this.membershipsRepo.count({
        where: { gymId, membershipTypeId: type.id },
      });
      const active = await this.membershipsRepo.count({
        where: { gymId, membershipTypeId: type.id, status: MembershipStatus.ACTIVE },
      });
      byType[type.name] = { total, active };
    }

    const statuses = await this.membershipsRepo
      .createQueryBuilder('um')
      .select('um.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('um.gym_id = :gymId', { gymId })
      .groupBy('um.status')
      .getRawMany<{ status: string; count: string }>();

    const expiringSoon = await this.membershipsRepo
      .createQueryBuilder('um')
      .leftJoinAndSelect('um.user', 'user')
      .leftJoinAndSelect('um.membershipType', 'membership_type')
      .where('um.gym_id = :gymId', { gymId })
      .andWhere('um.status = :status', { status: MembershipStatus.ACTIVE })
      .andWhere('um.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL \'7 days\'')
      .getMany();

    return {
      byType,
      byStatus: statuses.reduce((acc, r) => ({ ...acc, [r.status]: parseInt(r.count, 10) }), {}),
      expiringWithin7Days: expiringSoon.map(um => ({
        id: um.id,
        member: `${um.user?.firstName ?? ''} ${um.user?.lastName ?? ''}`,
        membershipType: um.membershipType?.name,
        endDate: um.endDate,
      })),
    };
  }

  // ------------------------------------------------------------------
  // Reporte de asistencia
  // ------------------------------------------------------------------
  async attendance(query: ReportQueryDto, actor: JwtPayload): Promise<Record<string, any>> {
    const gymId = this.assertGymAccess(actor);
    const { from, to } = this.dateRange(query);

    const rows = await this.attendanceRepo
      .createQueryBuilder('a')
      .select("DATE(a.timestamp)", 'day')
      .addSelect('a.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('a.gym_id = :gymId', { gymId })
      .andWhere('a.timestamp BETWEEN :from AND :to', { from, to })
      .groupBy('DATE(a.timestamp)')
      .addGroupBy('a.type')
      .orderBy('"day"', 'ASC')
      .getRawMany<{ day: string; type: string; count: string }>();

    const daily = new Map<string, { check_in: number; check_out: number; class: number }>();
    for (const row of rows) {
      const key = new Date(row.day).toISOString().slice(0, 10);
      const entry = daily.get(key) ?? { check_in: 0, check_out: 0, class: 0 };
      entry[row.type as keyof typeof entry] = parseInt(row.count, 10);
      daily.set(key, entry);
    }

    return {
      period: { from: from.toISOString(), to: to.toISOString() },
      daily: Object.fromEntries(daily),
      totalRecords: rows.reduce((sum, r) => sum + parseInt(r.count, 10), 0),
    };
  }

  // ------------------------------------------------------------------
  // Progreso de un cliente
  // ------------------------------------------------------------------
  async progress(userId: string, actor: JwtPayload): Promise<Record<string, any>> {
    const gymId = this.assertGymAccess(actor);
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new ForbiddenException('Usuario no encontrado.');
    if (!actor.isSuperAdmin && user.gymId !== gymId) {
      throw new ForbiddenException('El usuario pertenece a otro gimnasio.');
    }

    const profile = await this.profilesRepo.findOne({ where: { userId } });
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const checkIns = await this.attendanceRepo.count({
      where: { userId, type: AttendanceType.CHECK_IN, timestamp: MoreThanOrEqual(last30Days) },
    });

    const classesAttended = await this.bookingsRepo.count({
      where: { userId, attended: true },
    });

    const memberships = await this.membershipsRepo.find({
      where: { userId },
      relations: ['membershipType'],
      order: { createdAt: 'DESC' },
      take: 6,
    });

    const currentMembership = memberships.find(m => m.status === MembershipStatus.ACTIVE) ?? null;

    const paymentHistory = await this.paymentsRepo.find({
      where: { userId, status: PaymentStatus.SUCCEEDED },
      order: { paidAt: 'DESC' },
      take: 10,
    });

    return {
      user: { id: user.id, firstName: user.firstName, lastName: user.lastName, role: user.role },
      profile: profile ?? null,
      metrics: {
        checkInsLast30Days: checkIns,
        classesAttended: classesAttended,
      },
      currentMembership,
      membershipHistory: memberships,
      paymentHistory,
    };
  }
}
