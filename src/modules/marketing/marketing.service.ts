import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { PaginatedResult, paginate } from '../../common/dto/pagination.dto';
import { CampaignStatus, NotificationType, UserRole } from '../../common/enums';
import { Gym } from '../gyms/entities/gym.entity';
import { User } from '../users/entities/user.entity';
import { UserMembership } from '../memberships/entities/user-membership.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { Campaign } from './entities/campaign.entity';
import { CreateCampaignDto, QueryCampaignsDto, UpdateCampaignDto } from './dto/marketing.dto';

@Injectable()
export class MarketingService {
  constructor(
    @InjectRepository(Campaign) private readonly campaignsRepo: Repository<Campaign>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(UserMembership) private readonly membershipsRepo: Repository<UserMembership>,
    @InjectRepository(Gym) private readonly gymsRepo: Repository<Gym>,
    private readonly notificationsService: NotificationsService,
  ) {}

  private tenantWhere(actor: JwtPayload): Record<string, any> {
    if (actor.isSuperAdmin) return {};
    if (!actor.gymId) throw new ForbiddenException('No perteneces a un gimnasio.');
    return { gymId: actor.gymId };
  }

  async create(dto: CreateCampaignDto, actor: JwtPayload): Promise<Campaign> {
    if (!actor.gymId && !actor.isSuperAdmin) {
      throw new ForbiddenException('Se requiere un gimnasio.');
    }

    const campaign = this.campaignsRepo.create({
      gymId: actor.gymId as string,
      createdById: actor.sub,
      name: dto.name,
      subject: dto.subject,
      content: dto.content,
      type: dto.type,
      audience: dto.audience || { roles: [UserRole.CLIENT] },
      status: CampaignStatus.DRAFT,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
    });
    return this.campaignsRepo.save(campaign);
  }

  async findAll(query: QueryCampaignsDto, actor: JwtPayload): Promise<PaginatedResult<Campaign>> {
    const { page, limit, sortBy, sortOrder, status, type } = query;
    const where: Record<string, any> = this.tenantWhere(actor);
    if (status) where.status = status;
    if (type) where.type = type;

    const [items, total] = await this.campaignsRepo.findAndCount({
      where,
      relations: ['createdBy'],
      order: { [sortBy || 'createdAt']: sortOrder || 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return paginate(items, total, page, limit);
  }

  async findById(id: string, actor: JwtPayload): Promise<Campaign> {
    const campaign = await this.campaignsRepo.findOne({
      where: { id, ...this.tenantWhere(actor) },
      relations: ['createdBy'],
    });
    if (!campaign) throw new NotFoundException('Campaña no encontrada.');
    return campaign;
  }

  async update(id: string, dto: UpdateCampaignDto, actor: JwtPayload): Promise<Campaign> {
    const campaign = await this.findById(id, actor);
    if (campaign.status === CampaignStatus.SENT) {
      throw new BadRequestException('No se puede editar una campaña ya enviada.');
    }
    Object.assign(campaign, dto);
    if (dto.scheduledAt) campaign.scheduledAt = new Date(dto.scheduledAt);
    return this.campaignsRepo.save(campaign);
  }

  async remove(id: string, actor: JwtPayload): Promise<void> {
    const campaign = await this.findById(id, actor);
    await this.campaignsRepo.softDelete(campaign.id);
  }

  // ------------------------------------------------------------------
  // Segmentación y envío
  // ------------------------------------------------------------------
  private async resolveAudience(campaign: Campaign): Promise<User[]> {
    const audience = campaign.audience || {};
    const roles: UserRole[] = audience.roles || [UserRole.CLIENT];

    const qb = this.usersRepo
      .createQueryBuilder('u')
      .where('u.gym_id = :gymId', { gymId: campaign.gymId })
      .andWhere('u.role IN (:...roles)', { roles })
      .andWhere('u."isActive" = true');

    if (audience.activeMembership === true) {
      qb.andWhere(`EXISTS (
        SELECT 1 FROM user_memberships um
        WHERE um.user_id = u.id AND um.status = 'active' AND um.gym_id = u.gym_id
      )`);
    }
    if (audience.goal) {
      qb.andWhere(`EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.user_id = u.id AND up.goal = :goal
      )`, { goal: audience.goal });
    }
    if (audience.search) {
      qb.andWhere('(u."firstName" ILIKE :search OR u."lastName" ILIKE :search)', {
        search: `%${audience.search}%`,
      });
    }

    return qb.getMany();
  }

  async send(id: string, actor: JwtPayload, sendNow = true): Promise<Campaign> {
    const campaign = await this.findById(id, actor);
    if (campaign.status === CampaignStatus.SENT && sendNow) {
      throw new BadRequestException('La campaña ya fue enviada.');
    }

    if (campaign.status === CampaignStatus.DRAFT) {
      campaign.status = CampaignStatus.SENDING;
      await this.campaignsRepo.save(campaign);
    }

    if (sendNow || campaign.status === CampaignStatus.SCHEDULED) {
      const users = await this.resolveAudience(campaign);

      let sent = 0;
      let failed = 0;
      for (const user of users) {
        try {
          await this.notificationsService.systemNotify({
            userId: user.id,
            gymId: campaign.gymId,
            type: NotificationType.PROMOTION,
            title: campaign.subject || campaign.name,
            body: campaign.content,
            data: { campaignId: campaign.id, channel: campaign.type },
          });
          sent++;
        } catch {
          failed++;
        }
      }

      campaign.status = CampaignStatus.SENT;
      campaign.sentAt = new Date();
      campaign.stats = { ...campaign.stats, sent, failed, audienceSize: users.length };
      return this.campaignsRepo.save(campaign);
    }

    return campaign;
  }

  async cancelScheduled(id: string, actor: JwtPayload): Promise<Campaign> {
    const campaign = await this.findById(id, actor);
    if (campaign.status === CampaignStatus.SENT) {
      throw new BadRequestException('No se puede cancelar una campaña enviada.');
    }
    campaign.status = CampaignStatus.CANCELLED;
    return this.campaignsRepo.save(campaign);
  }

  /**
   * Scheduler: envía campañas programadas cuya fecha ya llegó.
   */
  async sendScheduledDue(): Promise<number> {
    const now = new Date();
    const due = await this.campaignsRepo.find({
      where: { status: CampaignStatus.SCHEDULED },
      relations: ['createdBy'],
    });

    let count = 0;
    for (const campaign of due) {
      if (campaign.scheduledAt && campaign.scheduledAt <= now) {
        const actor: JwtPayload = {
          sub: campaign.createdById,
          email: campaign.createdBy?.email || '',
          role: campaign.createdBy?.role || UserRole.ADMIN,
          gymId: campaign.gymId,
          isSuperAdmin: false,
        };
        await this.send(campaign.id, actor, true);
        count++;
      }
    }
    return count;
  }
}
