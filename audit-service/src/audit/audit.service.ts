import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';

export interface CreateAuditLogPayload {
  entity: string;
  action: string;
  userId?: string;
  userEmail?: string;
  timestamp?: string | Date;
  data?: any;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async createAuditLog(payload: CreateAuditLogPayload) {
    return this.prisma.auditLog.create({
      data: {
        entity: payload.entity,
        action: payload.action,
        userId: payload.userId || null,
        userEmail: payload.userEmail || null,
        timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
        data: payload.data ? payload.data : Prisma.JsonNull,
      },
    });
  }

  async findAll(query: QueryAuditLogDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const where: Prisma.AuditLogWhereInput = {};

    if (query.entity && query.entity.trim()) {
      where.entity = { contains: query.entity.trim(), mode: 'insensitive' };
    }

    if (query.action && query.action.trim()) {
      where.action = { contains: query.action.trim(), mode: 'insensitive' };
    }

    if (query.user && query.user.trim()) {
      const u = query.user.trim();
      where.OR = [
        { userId: { contains: u, mode: 'insensitive' } },
        { userEmail: { contains: u, mode: 'insensitive' } },
      ];
    }

    if (query.startDate || query.endDate) {
      const tsFilter: Prisma.DateTimeFilter = {};
      if (query.startDate && !isNaN(Date.parse(query.startDate))) {
        tsFilter.gte = new Date(query.startDate);
      }
      if (query.endDate && !isNaN(Date.parse(query.endDate))) {
        tsFilter.lte = new Date(query.endDate);
      }
      if (Object.keys(tsFilter).length > 0) {
        where.timestamp = tsFilter;
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return {
      items,
      meta: {
        total,
        page,
        pageSize,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async findOne(id: string) {
    const log = await this.prisma.auditLog.findUnique({ where: { id } });
    if (!log) {
      throw new NotFoundException(`Registro de auditoría con ID ${id} no fue encontrado.`);
    }
    return log;
  }
}
