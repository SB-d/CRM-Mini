import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(
    userId: string | null,
    action: string,
    entity: string,
    entityId: string | null,
    details?: Record<string, any>,
  ) {
    await this.prisma.auditLog.create({
      data: {
        userId: userId && userId !== 'system' ? userId : null,
        action,
        entity,
        entityId,
        details: details ? JSON.stringify(details) : null,
      },
    });
  }

  async findAll(filters?: { entity?: string; userId?: string }) {
    const where: any = {};
    if (filters?.entity) where.entity = filters.entity;
    if (filters?.userId) where.userId = filters.userId;

    return this.prisma.auditLog.findMany({
      where,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }
}
