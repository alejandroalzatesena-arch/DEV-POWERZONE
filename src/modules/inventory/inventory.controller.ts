import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { UserRole } from '../../common/enums';
import {
  CreateInventoryItemDto,
  CreateMaintenanceDto,
  QueryInventoryDto,
  UpdateInventoryItemDto,
  UpdateMaintenanceDto,
} from './dto/inventory.dto';
import { InventoryItem } from './entities/inventory-item.entity';
import { InventoryMaintenance } from './entities/inventory-maintenance.entity';

@ApiTags('inventory')
@ApiBearerAuth()
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Registrar equipo/artículo (admin)' })
  @ApiResponse({ status: 201, description: 'Equipo registrado', type: InventoryItem })
  create(@Body() dto: CreateInventoryItemDto, @CurrentUser() actor: JwtPayload): Promise<InventoryItem> {
    return this.inventoryService.create(dto, actor);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.TRAINER, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Listar inventario (paginado, filtros)' })
  @ApiResponse({ status: 200, description: 'Equipos paginados' })
  findAll(
    @Query() query: QueryInventoryDto,
    @CurrentUser() actor: JwtPayload,
  ): Promise<PaginatedResult<InventoryItem>> {
    return this.inventoryService.findAll(query, actor);
  }

  @Post(':id/maintenance')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Programar mantenimiento (admin)',
    description: 'Crea un registro de mantenimiento y cambia el equipo a estado "maintenance".',
  })
  @ApiResponse({ status: 201, description: 'Mantenimiento creado', type: InventoryMaintenance })
  createMaintenance(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateMaintenanceDto,
    @CurrentUser() actor: JwtPayload,
  ): Promise<InventoryMaintenance> {
    return this.inventoryService.createMaintenance(id, dto, actor);
  }

  @Get(':id/maintenance')
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @ApiOperation({ summary: 'Historial de mantenimiento de un equipo' })
  @ApiResponse({ status: 200, description: 'Mantenimientos', type: [InventoryMaintenance] })
  getMaintenances(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: JwtPayload,
  ): Promise<InventoryMaintenance[]> {
    return this.inventoryService.getMaintenances(id, actor);
  }

  @Patch('maintenance/:maintenanceId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Actualizar mantenimiento (admin)',
    description: 'Al marcar como "completed" el equipo vuelve a estar disponible.',
  })
  @ApiResponse({ status: 200, description: 'Mantenimiento actualizado', type: InventoryMaintenance })
  updateMaintenance(
    @Param('maintenanceId', ParseUUIDPipe) maintenanceId: string,
    @Body() dto: UpdateMaintenanceDto,
    @CurrentUser() actor: JwtPayload,
  ): Promise<InventoryMaintenance> {
    return this.inventoryService.updateMaintenance(maintenanceId, dto, actor);
  }

  @Delete('maintenance/:maintenanceId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Eliminar registro de mantenimiento (admin)' })
  @ApiResponse({ status: 200, description: 'Registro eliminado' })
  async deleteMaintenance(
    @Param('maintenanceId', ParseUUIDPipe) maintenanceId: string,
    @CurrentUser() actor: JwtPayload,
  ): Promise<{ message: string }> {
    await this.inventoryService.deleteMaintenance(maintenanceId, actor);
    return { message: 'Mantenimiento eliminado.' };
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.TRAINER, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Obtener equipo por ID' })
  @ApiResponse({ status: 200, description: 'Detalle del equipo', type: InventoryItem })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: JwtPayload): Promise<InventoryItem> {
    return this.inventoryService.findById(id, actor);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar equipo (admin)' })
  @ApiResponse({ status: 200, description: 'Equipo actualizado', type: InventoryItem })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInventoryItemDto,
    @CurrentUser() actor: JwtPayload,
  ): Promise<InventoryItem> {
    return this.inventoryService.update(id, dto, actor);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Eliminar equipo (soft delete, admin)' })
  @ApiResponse({ status: 200, description: 'Equipo eliminado' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: JwtPayload): Promise<{ message: string }> {
    await this.inventoryService.remove(id, actor);
    return { message: 'Equipo eliminado.' };
  }
}