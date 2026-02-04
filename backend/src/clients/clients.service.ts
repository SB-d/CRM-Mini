import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ClientsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async convertFromLead(leadId: string, actorId: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new NotFoundException('Lead no encontrado');

    const existingClient = await this.prisma.client.findFirst({ where: { leadId } });
    if (existingClient) {
      throw new ConflictException('Este lead ya fue convertido a cliente');
    }

    const client = await this.prisma.client.create({
      data: { name: lead.name, phone: lead.phone, email: lead.email, leadId: lead.id },
    });

    const newCase = await this.prisma.case.create({
      data: { clientId: client.id, leadId: lead.id, status: 'nuevo' },
    });

    await this.prisma.statusHistory.create({
      data: { caseId: newCase.id, previousStatus: null, newStatus: 'nuevo', userId: actorId },
    });

    await this.prisma.lead.update({ where: { id: leadId }, data: { status: 'contactado' } });

    await this.audit.log(actorId, 'CONVERT_LEAD', 'client', client.id, {
      fromLeadId: leadId,
      caseId: newCase.id,
    });

    return { client, case: newCase };
  }

  async findAll(search?: string) {
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }

    return this.prisma.client.findMany({
      where,
      include: {
        lead: true,
        cases: { include: { history: { orderBy: { createdAt: 'asc' } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        lead: true,
        cases: {
          include: {
            history: {
              orderBy: { createdAt: 'asc' },
              include: { user: { select: { name: true } } },
            },
            calls: {
              orderBy: { createdAt: 'desc' },
              include: { user: { select: { name: true } } },
            },
          },
        },
      },
    });
    if (!client) throw new NotFoundException('Cliente no encontrado');
    return client;
  }

  async update(id: string, data: { name?: string; phone?: string; email?: string }, actorId: string) {
    const client = await this.prisma.client.findUnique({ where: { id } });
    if (!client) throw new NotFoundException('Cliente no encontrado');

    const updated = await this.prisma.client.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.email !== undefined && { email: data.email }),
      },
    });

    await this.audit.log(actorId, 'UPDATE', 'client', id, data);
    return updated;
  }
}
