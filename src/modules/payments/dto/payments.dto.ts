import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { PaymentMethod, PaymentStatus } from '../../../common/enums';

export class CreatePaymentDto {
  @ApiProperty({ description: 'ID del usuario que paga' })
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({ description: 'ID del tipo de membresía comprado' })
  @IsOptional()
  @IsUUID()
  membershipTypeId?: string;

  @ApiProperty({ description: 'Monto', example: 49.99 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ description: 'Divisa (ISO 4217)', default: 'usd' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiProperty({ description: 'Método', enum: PaymentMethod, default: 'cash' })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ description: 'ID de referencia externa' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  transactionId?: string;

  @ApiPropertyOptional({ description: 'Metadatos adicionales' })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class CreateCheckoutDto {
  @ApiProperty({ description: 'ID del tipo de membresía a comprar' })
  @IsUUID()
  membershipTypeId: string;

  @ApiPropertyOptional({ description: 'ID del usuario que paga (obligatorio si lo hace admin/recepcionista)' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ description: 'URL de éxito (frontend)' })
  @IsOptional()
  @IsString()
  successUrl?: string;

  @ApiPropertyOptional({ description: 'URL de cancelación (frontend)' })
  @IsOptional()
  @IsString()
  cancelUrl?: string;
}

export class QueryPaymentsDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filtrar por estado', enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional({ description: 'Filtrar por usuario' })
  @IsOptional()
  @IsUUID()
  userId?: string;
}