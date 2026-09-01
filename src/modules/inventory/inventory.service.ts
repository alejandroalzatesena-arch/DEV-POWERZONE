import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { PaginatedResult, paginate } from '../../common/dto/pagination.dto';
import { InventoryStatus, MaintenanceStatus } from '../../common/enums';
import { InventoryItem } from './entities/inventory-item.entity';
import { InventoryMaintenance } from './entities/inventory-maintenance.entity';
import {
  CreateInventoryItemDto,
  CreateMaintenanceDto,
  QueryInventoryDto,
  UpdateInventoryItemDto,
  UpdateMaintenanceDto,
} from './dto/inventory.dto';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(InventoryItem) private readonly itemsRepo: Repository<InventoryItem>,
    @InjectRepository(InventoryMaintenance)
    private readonly maintenanceRepo: Repository<InventoryMaintenance>,
  ) {}

  private tenantWhere(actor: JwtPayload): Record<string, any> {
    if (actor.isSuperAdmin) return {};
    if (!actor.gymId) throw new ForbiddenException('No perteneces a un gimnasio.');
    return { gymId: actor.gymId };
  }

  // ------------------------------------------------------------------
  // Equipos
  // ------------------------------------------------------------------
  async create(dto: CreateInventoryItemDto, actor: JwtPayload): Promise<InventoryItem> {
    if (!actor.gymId && !actor.isSuperAdmin) {
      throw new ForbiddenException('Se requiere un gimnasio.');
    }
    const item = this.itemsRepo.create({
      ...dto,
      gymId: actor.gymId as string,
      availableQuantity: dto.availableQuantity ?? dto.quantity,
    });
    return this.itemsRepo.save(item);
  }

  async findAll(query: QueryInventoryDto, actor: JwtPayload): Promise<PaginatedResult<InventoryItem>> {
    const { page, limit, sortBy, sortOrder, category, status, search } = query;

    const qb = this.itemsRepo
      .createQueryBuilder('i')
      .leftJoinAndSelect('i.maintenances', 'm');

    if (!actor.isSuperAdmin) {
      qb.andWhere('i.gym_id = :gymId', { gymId: actor.gymId });
    }
    if (category) qb.andWhere('i.category = :category', { category });
    if (status) qb.andWhere('i.status = :status', { status });
    if (search) qb.andWhere('i.name ILIKE :search', { search: `%${search}%` });

    qb.orderBy(`i.${sortBy || 'createdAt'}`, sortOrder || 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, page, limit);
  }

  async findById(id: string, actor: JwtPayload): Promise<InventoryItem> {
    const item = await this.itemsRepo.findOne({
      where: { id, ...this.tenantWhere(actor) },
      relations: ['maintenances'],
    });
    if (!item) throw new NotFoundException('Equipo no encontrado.');
    return item;
  }

  async update(id: string, dto: UpdateInventoryItemDto, actor: JwtPayload): Promise<InventoryItem> {
    const item = await this.findById(id, actor);
    Object.assign(item, dto);
    return this.itemsRepo.save(item);
  }

  async remove(id: string, actor: JwtPayload): Promise<void> {
    const item = await this.findById(id, actor);
    await this.itemsRepo.softDelete(item.id);
  }

  // ------------------------------------------------------------------
  // Mantenimiento
  // ------------------------------------------------------------------
  async createMaintenance(itemId: string, dto: CreateMaintenanceDto, actor: JwtPayload): Promise<InventoryMaintenance> {
    const item = await this.findById(itemId, actor);

    const maintenance = this.maintenanceRepo.create({
      itemId: item.id,
      item,
      description: dto.description,
      scheduledAt: dto.scheduledAt,
      cost: dto.cost,
      technician: dto.technician,
      status: MaintenanceStatus.SCHEDULED,
    });
    const saved = await this.maintenanceRepo.save(maintenance);

    // `findById` carga también los mantenimientos. Guardar de nuevo toda la
    // entidad hace que TypeORM sincronice ese arreglo desactualizado e intente
    // desvincular el mantenimiento recién creado (item_id = NULL).
    await this.itemsRepo.update(item.id, { status: InventoryStatus.MAINTENANCE });

    return saved;
  }

  async getMaintenances(itemId: string, actor: JwtPayload): Promise<InventoryMaintenance[]> {
    const item = await this.findById(itemId, actor);
    return this.maintenanceRepo.find({
      where: { itemId: item.id },
      order: { scheduledAt: 'ASC' },
    });
  }

  async updateMaintenance(
    maintenanceId: string,
    dto: UpdateMaintenanceDto,
    actor: JwtPayload,
  ): Promise<InventoryMaintenance> {
    const maintenance = await this.maintenanceRepo.findOne({
      where: { id: maintenanceId },
      relations: ['item'],
    });
    if (!maintenance) throw new NotFoundException('Mantenimiento no encontrado.');
    if (!actor.isSuperAdmin && maintenance.item.gymId !== actor.gymId) {
      throw new ForbiddenException('No tienes acceso a este equipo.');
    }

    Object.assign(maintenance, dto);
    if (dto.status === MaintenanceStatus.COMPLETED && !maintenance.completedAt) {
      maintenance.completedAt = new Date().toISOString().slice(0, 10);
    }
    const saved = await this.maintenanceRepo.save(maintenance);

    if (saved.status === MaintenanceStatus.COMPLETED) {
      const item = await this.itemsRepo.findOne({ where: { id: maintenance.itemId } });
      if (item) {
        item.status = InventoryStatus.AVAILABLE;
        item.availableQuantity = Math.max(0, item.availableQuantity);
        await this.itemsRepo.save(item);
      }
    }

    return saved;
  }

  async deleteMaintenance(maintenanceId: string, actor: JwtPayload): Promise<void> {
    const maintenance = await this.maintenanceRepo.findOne({
      where: { id: maintenanceId },
      relations: ['item'],
    });
    if (!maintenance) throw new NotFoundException('Mantenimiento no encontrado.');
    if (!actor.isSuperAdmin && maintenance.item.gymId !== actor.gymId) {
      throw new ForbiddenException('No tienes acceso a este equipo.');
    }
    await this.maintenanceRepo.softDelete(maintenance.id);
  }
}
