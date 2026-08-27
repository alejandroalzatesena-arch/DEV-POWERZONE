import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GymsService } from './gyms.service';
import { CreateGymDto, UpdateGymDto } from './dto/gym.dto';
import { Gym } from './entities/gym.entity';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';

@ApiTags('gyms')
@ApiBearerAuth()
@Controller('gyms')
export class GymsController {
  constructor(private readonly gymsService: GymsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Crear gimnasio (admin)',
    description: 'Crea un nuevo gimnasio. Requiere rol admin y propósitos de multi-tenancy.',
  })
  @ApiResponse({ status: 201, description: 'Gimnasio creado', type: Gym })
  create(@Body() dto: CreateGymDto): Promise<Gym> {
    return this.gymsService.create(dto);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Listar gimnasios (admin)' })
  @ApiResponse({ status: 200, description: 'Lista de gimnasios', type: [Gym] })
  findAll(): Promise<Gym[]> {
    return this.gymsService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.TRAINER, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Obtener gimnasio por ID' })
  @ApiResponse({ status: 200, description: 'Datos del gimnasio', type: Gym })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Gym> {
    return this.gymsService.findById(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar gimnasio (admin)' })
  @ApiResponse({ status: 200, description: 'Gimnasio actualizado', type: Gym })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateGymDto): Promise<Gym> {
    return this.gymsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Eliminar gimnasio (soft delete, admin)' })
  @ApiResponse({ status: 200, description: 'Gimnasio eliminado' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<{ message: string }> {
    await this.gymsService.remove(id);
    return { message: 'Gimnasio eliminado.' };
  }
}