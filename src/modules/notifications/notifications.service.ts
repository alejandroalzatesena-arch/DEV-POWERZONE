import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { PaginatedResult, paginate } from '../../common/dto/pagination.dto';
import { NotificationChannel, NotificationType, UserRole } from '../../common/enums';
import { User } from '../users/entities/user.entity';
import { AppNotification } from './entities/notification.entity';
import { CreateNotificationDto, QueryNotificationsDto, SendMessageDto } from './dto/notifications.dto';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(AppNotification) private readonly notificationsRepo: Repository<AppNotification>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    private readonly gateway: NotificationsGateway,
  ) {}

  async create(dto: CreateNotificationDto, actor: JwtPayload): Promise<AppNotification> {
    const target = await this.usersRepo.findOne({ where: { id: dto.userId } });
    if (!target) throw new NotFoundException('Destinatario no encontrado.');
    if (!actor.isSuperAdmin && target.gymId !== actor.gymId) {
      throw new ForbiddenException('El destinatario pertenece a otro gimnasio.');
    }

    const notification = this.notificationsRepo.create({
      userId: dto.userId,
      gymId: target.gymId,
      type: dto.type ?? NotificationType.INFO,
      channel: dto.channel ?? NotificationChannel.IN_APP,
      title: dto.title,
      body: dto.body,
      data: dto.data,
      senderId: dto.senderId ?? actor.sub,
      isRead: false,
    });
    const saved = await this.notificationsRepo.save(notification);

    this.gateway.emitTo(saved.userId, 'notification', saved);
    return saved;
  }

  async sendInternalMessage(dto: SendMessageDto, actor: JwtPayload): Promise<AppNotification> {
    const target = await this.usersRepo.findOne({ where: { id: dto.userId } });
    if (!target) throw new NotFoundException('Destinatario no encontrado.');
    if (!actor.isSuperAdmin && target.gymId !== actor.gymId) {
      throw new ForbiddenException('El destinatario pertenece a otro gimnasio.');
    }

    const notification = this.notificationsRepo.create({
      userId: dto.userId,
      gymId: target.gymId,
      type: NotificationType.MESSAGE,
      channel: NotificationChannel.IN_APP,
      title: dto.title,
      body: dto.body,
      senderId: actor.sub,
      data: { messageType: 'internal' },
      isRead: false,
    });
    const saved = await this.notificationsRepo.save(notification);
    this.gateway.emitTo(saved.userId, 'notification', saved);
    return saved;
  }

  async findMine(query: QueryNotificationsDto, actor: JwtPayload): Promise<PaginatedResult<AppNotification>> {
    const { page, limit, sortBy, sortOrder, unreadOnly, type } = query;
    const where: Record<string, any> = { userId: actor.sub };
    if (unreadOnly) where.isRead = false;
    if (type) where.type = type;

    const [items, total] = await this.notificationsRepo.findAndCount({
      where,
      order: { [sortBy || 'createdAt']: sortOrder || 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return paginate(items, total, page, limit);
  }

  async unreadCount(actor: JwtPayload): Promise<{ unread: number }> {
    const unread = await this.notificationsRepo.count({
      where: { userId: actor.sub, isRead: false },
    });
    return { unread };
  }

  async markAsRead(id: string, actor: JwtPayload): Promise<AppNotification> {
    const notification = await this.notificationsRepo.findOne({ where: { id } });
    if (!notification) throw new NotFoundException('Notificación no encontrada.');
    if (notification.userId !== actor.sub && actor.role !== UserRole.ADMIN && !actor.isSuperAdmin) {
      throw new ForbiddenException('No puedes marcar esta notificación.');
    }
    notification.isRead = true;
    notification.readAt = new Date();
    return this.notificationsRepo.save(notification);
  }

  async markAllAsRead(actor: JwtPayload): Promise<{ updated: number }> {
    const result = await this.notificationsRepo.update(
      { userId: actor.sub, isRead: false },
      { isRead: true, readAt: new Date() },
    );
    return { updated: result.affected ?? 0 };
  }

  async remove(id: string, actor: JwtPayload): Promise<void> {
    const notification = await this.notificationsRepo.findOne({ where: { id } });
    if (!notification) throw new NotFoundException('Notificación no encontrada.');
    if (notification.userId !== actor.sub && actor.role !== UserRole.ADMIN && !actor.isSuperAdmin) {
      throw new ForbiddenException('No puedes eliminar esta notificación.');
    }
    await this.notificationsRepo.softDelete(notification.id);
  }

  /**
   * Usado por el backend (scheduler/marketing): crea una notificación sin actor.
   */
  async systemNotify(dto: {
    userId: string;
    type: NotificationType;
    title: string;
    body?: string;
    data?: Record<string, any>;
    gymId?: string;
  }): Promise<void> {
    const notification = this.notificationsRepo.create({
      userId: dto.userId,
      gymId: dto.gymId ?? null,
      type: dto.type,
      channel: NotificationChannel.IN_APP,
      title: dto.title,
      body: dto.body,
      data: dto.data,
      isRead: false,
    });
    const saved = await this.notificationsRepo.save(notification);
    this.gateway.emitTo(saved.userId, 'notification', saved);
  }
}