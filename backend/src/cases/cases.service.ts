import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class CasesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async findAll(userId?: string, role?: string) {
    const where: any = {};
    if (role === 'asesora' && userId) {
      where.lead = { assignedUserId: userId };
    }

    return this.prisma.case.findMany({
      where,
      include: {
        client: true,
        lead: {
          include: { assignedUser: { select: { name: true } } },
        },
        history: { orderBy: { createdAt: 'desc' } },
        calls: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const caseItem = await this.prisma.case.findUnique({
      where: { id },
      include: {
        client: {
          include: { lead: true },
        },
        lead: {
          include: { assignedUser: { select: { name: true } } },
        },
        history: {
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { name: true } } },
        },
        calls: {
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { name: true } } },
        },
      },
    });

    if (!caseItem) throw new NotFoundException('Caso no encontrado');
    return caseItem;
  }

  async updateStatus(id: string, newStatus: string, actorId: string) {
    const caseItem = await this.prisma.case.findUnique({ where: { id } });
    if (!caseItem) throw new NotFoundException('Caso no encontrado');

    const previousStatus = caseItem.status;

    await this.prisma.case.update({
      where: { id },
      data: { status: newStatus as any },
    });

    // Registrar cambio en historial
    await this.prisma.statusHistory.create({
      data: {
        caseId: id,
        previousStatus: previousStatus as any,
        newStatus: newStatus as any,
        userId: actorId,
      },
    });

    await this.audit.log(actorId, 'UPDATE_STATUS', 'case', id, {
      previousStatus,
      newStatus,
    });

    return this.findOne(id);
  }
}
