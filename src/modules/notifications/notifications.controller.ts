import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { UserRole } from '../../common/enums';
import {
  CreateNotificationDto,
  QueryNotificationsDto,
  SendMessageDto,
} from './dto/notifications.dto';
import { AppNotification } from './entities/notification.entity';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.TRAINER, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Crear notificación (staff)' })
  @ApiResponse({ status: 201, description: 'Notificación creada', type: AppNotification })
  create(
    @Body() dto: CreateNotificationDto,
    @CurrentUser() actor: JwtPayload,
  ): Promise<AppNotification> {
    return this.notificationsService.create(dto, actor);
  }

  @Post('message')
  @Roles(UserRole.ADMIN, UserRole.TRAINER, UserRole.CLIENT)
  @ApiOperation({ summary: 'Enviar mensaje interno (mensajería)' })
  @ApiResponse({ status: 201, description: 'Mensaje enviado', type: AppNotification })
  sendMessage(
    @Body() dto: SendMessageDto,
    @CurrentUser() actor: JwtPayload,
  ): Promise<AppNotification> {
    return this.notificationsService.sendInternalMessage(dto, actor);
  }

  @Get('mine')
  @ApiOperation({ summary: 'Mis notificaciones (paginado)' })
  @ApiResponse({ status: 200, description: 'Notificaciones del usuario' })
  mine(
    @Query() query: QueryNotificationsDto,
    @CurrentUser() actor: JwtPayload,
  ): Promise<PaginatedResult<AppNotification>> {
    return this.notificationsService.findMine(query, actor);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Conteo de no leídas' })
  @ApiResponse({ status: 200, description: 'Cantidad de no leídas' })
  unreadCount(@CurrentUser() actor: JwtPayload): Promise<{ unread: number }> {
    return this.notificationsService.unreadCount(actor);
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marcar todas como leídas' })
  @ApiResponse({ status: 200, description: 'Actualizadas' })
  markAllRead(@CurrentUser() actor: JwtPayload): Promise<{ updated: number }> {
    return this.notificationsService.markAllAsRead(actor);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marcar notificación como leída' })
  @ApiResponse({ status: 200, description: 'Notificación actualizada', type: AppNotification })
  markRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: JwtPayload,
  ): Promise<AppNotification> {
    return this.notificationsService.markAsRead(id, actor);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar notificación' })
  @ApiResponse({ status: 200, description: 'Notificación eliminada' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: JwtPayload,
  ): Promise<{ message: string }> {
    await this.notificationsService.remove(id, actor);
    return { message: 'Notificación eliminada.' };
  }
}
