import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QueryAuditLogDto {
  @ApiPropertyOptional({ description: 'Número de página', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Cantidad de elementos por página', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 20;

  @ApiPropertyOptional({ description: 'Filtrar por nombre de entidad (ej: Reservation, User, Review)' })
  @IsOptional()
  @IsString()
  entity?: string;

  @ApiPropertyOptional({ description: 'Filtrar por tipo de acción (ej: CREATE, UPDATE, PAY, CANCEL, LOGIN)' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ description: 'Filtrar por ID de usuario o correo electrónico' })
  @IsOptional()
  @IsString()
  user?: string;

  @ApiPropertyOptional({ description: 'Fecha de inicio (ISO String: YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Fecha de fin (ISO String: YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
