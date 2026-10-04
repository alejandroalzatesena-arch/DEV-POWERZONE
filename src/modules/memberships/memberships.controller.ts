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
import { MembershipsService } from './memberships.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { UserRole } from '../../common/enums';
import {
  AssignMembershipDto,
  CreateMembershipTypeDto,
  QueryMembershipsDto,
  UpdateMembershipTypeDto,
} from './dto/memberships.dto';
import { MembershipType } from './entities/membership-type.entity';
import { UserMembership } from './entities/user-membership.entity';

@ApiTags('memberships')
@ApiBearerAuth()
@Controller('memberships')
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  // ---------------- Tipos de membresía ----------------
  @Post('types')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Crear tipo de membresía (admin)' })
  @ApiResponse({ status: 201, description: 'Tipo creado', type: MembershipType })
  createType(
    @Body() dto: CreateMembershipTypeDto,
    @CurrentUser() actor: JwtPayload,
  ): Promise<MembershipType> {
    return this.membershipsService.createType(dto, actor);
  }

  @Get('types')
  @Roles(UserRole.ADMIN, UserRole.TRAINER, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Listar tipos de membresía' })
  @ApiResponse({ status: 200, description: 'Tipos disponibles', type: [MembershipType] })
  getTypes(@CurrentUser() actor: JwtPayload): Promise<MembershipType[]> {
    return this.membershipsService.getTypes(actor, true);
  }

  @Patch('types/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar tipo de membresía (admin)' })
  @ApiResponse({ status: 200, description: 'Tipo actualizado', type: MembershipType })
  updateType(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMembershipTypeDto,
    @CurrentUser() actor: JwtPayload,
  ): Promise<MembershipType> {
    return this.membershipsService.updateType(id, dto, actor);
  }

  @Delete('types/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Eliminar tipo de membresía (soft delete, admin)' })
  @ApiResponse({ status: 200, description: 'Tipo eliminado' })
  async removeType(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: JwtPayload,
  ): Promise<{ message: string }> {
    await this.membershipsService.removeType(id, actor);
    return { message: 'Tipo de membresía eliminado.' };
  }

  // ---------------- Membresías asignadas ----------------
  @Post('assign')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({
    summary: 'Asignar membresía a un cliente',
    description:
      'Crea la membresía activa del cliente y registra un pago en efectivo/transferencia.',
  })
  @ApiResponse({ status: 201, description: 'Membresía asignada', type: UserMembership })
  assign(
    @Body() dto: AssignMembershipDto,
    @CurrentUser() actor: JwtPayload,
  ): Promise<UserMembership> {
    return this.membershipsService.assign(dto, actor);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.TRAINER, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Listar membresías (paginado)' })
  @ApiResponse({ status: 200, description: 'Membresías paginadas' })
  findAll(
    @Query() query: QueryMembershipsDto,
    @CurrentUser() actor: JwtPayload,
  ): Promise<PaginatedResult<UserMembership>> {
    return this.membershipsService.findAll(query, actor);
  }

  @Get('my')
  @ApiOperation({ summary: 'Mi membresía activa (cliente)' })
  @ApiResponse({
    status: 200,
    description: 'Membresía activa del cliente autenticado',
    type: UserMembership,
  })
  myMembership(@CurrentUser() actor: JwtPayload): Promise<UserMembership | null> {
    return this.membershipsService.findActiveForUser(actor.sub, actor);
  }

  @Patch('assign/:id/renew')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Renovar membresía (admin/recepcionista)' })
  @ApiResponse({ status: 200, description: 'Membresía renovada', type: UserMembership })
  renew(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: JwtPayload,
  ): Promise<UserMembership> {
    return this.membershipsService.renew(id, actor);
  }

  @Patch('assign/:id/cancel')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Cancelar membresía (admin/recepcionista)' })
  @ApiResponse({ status: 200, description: 'Membresía cancelada', type: UserMembership })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: JwtPayload,
  ): Promise<UserMembership> {
    return this.membershipsService.cancel(id, actor);
  }
}
