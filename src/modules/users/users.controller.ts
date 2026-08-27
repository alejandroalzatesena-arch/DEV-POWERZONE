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
import { UsersService } from './users.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { UserRole } from '../../common/enums';
import { CreateUserDto, QueryUsersDto, UpdateProfileDto, UpdateUserDto } from './dto/users.dto';
import { User } from './entities/user.entity';
import { UserProfile } from './entities/user-profile.entity';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Crear usuario (admin)',
    description: 'Crea usuarios con cualquier rol requerido (entrenador, recepcionista, cliente).',
  })
  @ApiResponse({ status: 201, description: 'Usuario creado', type: User })
  create(@Body() dto: CreateUserDto, @CurrentUser() actor: JwtPayload): Promise<User> {
    return this.usersService.create(dto, actor);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.TRAINER, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Listar usuarios (paginado, filtros y búsqueda)' })
  @ApiResponse({ status: 200, description: 'Usuarios paginados' })
  findAll(
    @Query() query: QueryUsersDto,
    @CurrentUser() actor: JwtPayload,
  ): Promise<PaginatedResult<User>> {
    return this.usersService.findAll(query, actor);
  }

  @Get('me/profile')
  @ApiOperation({ summary: 'Mi perfil corporal' })
  @ApiResponse({ status: 200, description: 'Perfil corporal del usuario autenticado', type: UserProfile })
  getMyProfile(@CurrentUser() actor: JwtPayload): Promise<UserProfile> {
    return this.usersService.getProfile(actor.sub, actor);
  }

  @Patch('me/profile')
  @ApiOperation({ summary: 'Actualizar mi perfil corporal' })
  @ApiResponse({ status: 200, description: 'Perfil actualizado', type: UserProfile })
  updateMyProfile(
    @Body() dto: UpdateProfileDto,
    @CurrentUser() actor: JwtPayload,
  ): Promise<UserProfile> {
    return this.usersService.updateProfile(actor.sub, dto, actor);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.TRAINER, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Obtener usuario por ID' })
  @ApiResponse({ status: 200, description: 'Datos del usuario', type: User })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: JwtPayload): Promise<User> {
    return this.usersService.findById(id, actor, true);
  }

  @Get(':id/profile')
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @ApiOperation({ summary: 'Obtener perfil corporal de un usuario' })
  @ApiResponse({ status: 200, description: 'Perfil corporal', type: UserProfile })
  getProfile(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: JwtPayload,
  ): Promise<UserProfile> {
    return this.usersService.getProfile(id, actor);
  }

  @Patch(':id/profile')
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @ApiOperation({ summary: 'Actualizar perfil corporal de un usuario (admin/entrenador)' })
  @ApiResponse({ status: 200, description: 'Perfil actualizado', type: UserProfile })
  updateProfile(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProfileDto,
    @CurrentUser() actor: JwtPayload,
  ): Promise<UserProfile> {
    return this.usersService.updateProfile(id, dto, actor);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar usuario (admin)' })
  @ApiResponse({ status: 200, description: 'Usuario actualizado', type: User })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: JwtPayload,
  ): Promise<User> {
    return this.usersService.update(id, dto, actor);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Eliminar usuario (soft delete, admin)' })
  @ApiResponse({ status: 200, description: 'Usuario eliminado' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: JwtPayload,
  ): Promise<{ message: string }> {
    await this.usersService.remove(id, actor);
    return { message: 'Usuario eliminado.' };
  }
}