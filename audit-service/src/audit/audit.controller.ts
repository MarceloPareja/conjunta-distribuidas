import { Controller, Get, Param, Query, Sse, MessageEvent } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Observable, map } from 'rxjs';
import { AuditService } from './audit.service';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';

@ApiTags('audit')
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Consultar historial de auditoría con paginación y filtros' })
  findAll(@Query() query: QueryAuditLogDto) {
    return this.auditService.findAll(query);
  }

  @Get('stream')
  @Sse()
  @ApiOperation({ summary: 'Stream en tiempo real (SSE) de nuevos registros de auditoría' })
  stream(): Observable<MessageEvent> {
    return this.auditService.auditLogCreated$.pipe(
      map((data) => ({
        data: JSON.stringify(data),
        type: 'audit-log',
      })),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un registro de auditoría específico por su ID' })
  findOne(@Param('id') id: string) {
    return this.auditService.findOne(id);
  }
}
