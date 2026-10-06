import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { Gym } from './entities/gym.entity';
import { CreateGymDto, UpdateGymDto } from './dto/gym.dto';

@Injectable()
export class GymsService {
  constructor(@InjectRepository(Gym) private readonly gymsRepo: Repository<Gym>) {}

  slugify(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }

  async create(dto: CreateGymDto): Promise<Gym> {
    const slug = dto.slug || this.slugify(dto.name);
    const existing = await this.gymsRepo.findOne({ where: [{ name: dto.name }] });
    if (existing) {
      throw new ConflictException('Ya existe un gimnasio con ese nombre.');
    }

    const gym = this.gymsRepo.create({ ...dto, slug, maxCapacity: dto.maxCapacity ?? 100 });
    return this.gymsRepo.save(gym);
  }

  async findAll(): Promise<Gym[]> {
    return this.gymsRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<Gym> {
    const gym = await this.gymsRepo.findOne({ where: { id } });
    if (!gym) {
      throw new NotFoundException('Gimnasio no encontrado.');
    }
    return gym;
  }

  // Garantiza que el actor tenga acceso al gimnasio (multi-tenancy).
  async findByIdForActor(id: string, actor: JwtPayload): Promise<Gym> {
    const gym = await this.findById(id);
    if (actor.isSuperAdmin) {
      return gym;
    }
    if (!actor.gymId || actor.gymId !== id) {
      throw new BadRequestException('No tienes acceso a ese gimnasio.');
    }
    return gym;
  }

  async update(id: string, dto: UpdateGymDto): Promise<Gym> {
    const gym = await this.findById(id);
    Object.assign(gym, dto);
    if (dto.name && dto.name !== gym.name && !dto.slug) {
      gym.slug = this.slugify(dto.name);
    }
    return this.gymsRepo.save(gym);
  }

  async remove(id: string): Promise<void> {
    const gym = await this.findById(id);
    await this.gymsRepo.softDelete(gym.id);
  }
}
