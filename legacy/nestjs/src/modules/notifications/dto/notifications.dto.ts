import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { NotificationChannel, NotificationType } from '../../../common/enums';

export class CreateNotificationDto {
  @ApiProperty({ description: 'ID del usuario destinatario' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Tipo de notificación', enum: NotificationType, default: 'info' })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @ApiProperty({ description: 'Canal de entrega', enum: NotificationChannel, default: 'in_app' })
  @IsOptional()
  @IsEnum(NotificationChannel)
  channel?: NotificationChannel;

  @ApiProperty({ description: 'Título', example: 'Cita agendada' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ description: 'Cuerpo del mensaje' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  body?: string;

  @ApiPropertyOptional({ description: 'Datos adicionales (deep links, entidad relacionada)' })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Remitente (mensajería interna)' })
  @IsOptional()
  @IsUUID()
  senderId?: string;
}

export class SendMessageDto {
  @ApiProperty({ description: 'ID del destinatario' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Asunto', example: 'Consulta sobre mi rutina' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title: string;

  @ApiProperty({ description: 'Mensaje' })
  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  body: string;
}

export class QueryNotificationsDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Solo no leídas' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  unreadOnly?: boolean;

  @ApiPropertyOptional({ description: 'Filtrar por tipo', enum: NotificationType })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;
}
