import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { AttendanceMethod, AttendanceType } from '../../../common/enums';

export class CheckInDto {
  @ApiPropertyOptional({
    description: 'Método de registro',
    enum: AttendanceMethod,
    default: 'member_card',
  })
  @IsOptional()
  @IsEnum(AttendanceMethod)
  method?: AttendanceMethod;
}

export class CheckOutDto {
  @ApiPropertyOptional({
    description: 'Método de registro',
    enum: AttendanceMethod,
    default: 'member_card',
  })
  @IsOptional()
  @IsEnum(AttendanceMethod)
  method?: AttendanceMethod;
}

export class RecordClassAttendanceDto {
  @ApiProperty({ description: 'ID de la clase' })
  @IsUUID()
  classId: string;

  @ApiProperty({ description: 'Método de registro', enum: AttendanceMethod, default: 'manual' })
  @IsOptional()
  @IsEnum(AttendanceMethod)
  method?: AttendanceMethod;
}

export class QueryAttendanceDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filtrar por tipo', enum: AttendanceType })
  @IsOptional()
  @IsEnum(AttendanceType)
  type?: AttendanceType;

  @ApiPropertyOptional({ description: 'Filtrar por usuario' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ description: 'Desde fecha (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Hasta fecha (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
