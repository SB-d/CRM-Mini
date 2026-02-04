import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class CallsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async create(
    data: {
      caseId: string;
      date: string;
      duration: number;
      result: string;
      observations?: string;
    },
    actorId: string,
  ) {
    const caseItem = await this.prisma.case.findUnique({
      where: { id: data.caseId },
    });
    if (!caseItem) throw new NotFoundException('Caso no encontrado');

    const call = await this.prisma.callLog.create({
      data: {
        caseId: data.caseId,
        userId: actorId,
        date: new Date(data.date),
        duration: data.duration,
        result: data.result,
        observations: data.observations ?? null,
      },
      include: {
        user: { select: { name: true } },
      },
    });

    await this.audit.log(actorId, 'CREATE', 'call_log', call.id, {
      caseId: data.caseId,
      result: data.result,
    });

    return call;
  }

  async findByCaseId(caseId: string) {
    return this.prisma.callLog.findMany({
      where: { caseId },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
