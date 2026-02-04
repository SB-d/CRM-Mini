import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AssignmentService } from './assignment.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class LeadsService {
  constructor(
    private prisma: PrismaService,
    private assignment: AssignmentService,
    private audit: AuditService,
  ) {}

  async create(data: {
    name: string;
    phone: string;
    email?: string;
    source?: string;
    externalId?: string;
  }) {
    // Deduplicación por externalId (campo que envía Zapier/n8n)
    if (data.externalId) {
      const existing = await this.prisma.lead.findUnique({
        where: { externalId: data.externalId },
      });
      if (existing) {
        throw new ConflictException('Lead duplicado: externalId ya existe');
      }
    }

    // Deduplicación por teléfono
    const phoneExists = await this.prisma.lead.findFirst({
      where: { phone: data.phone },
    });
    if (phoneExists) {
      throw new ConflictException('Lead duplicado: teléfono ya existe');
    }

    // Buscar o crear fuente de lead
    let sourceId: string | null = null;
    if (data.source) {
      let source = await this.prisma.leadSource.findFirst({
        where: { name: data.source },
      });
      if (!source) {
        source = await this.prisma.leadSource.create({
          data: { name: data.source },
        });
      }
      sourceId = source.id;
    }

    // Asignación automática round-robin
    const assignedUserId = await this.assignment.getNextAsesora();
    const now = new Date();

    const lead = await this.prisma.lead.create({
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email ?? null,
        sourceId,
        externalId: data.externalId ?? null,
        status: 'nuevo',
        assignedUserId,
        assignedAt: assignedUserId ? now : null,
      },
      include: {
        assignedUser: { select: { id: true, name: true } },
        source: true,
      },
    });

    await this.audit.log(assignedUserId, 'CREATE', 'lead', lead.id, {
      name: data.name,
      phone: data.phone,
      assignedTo: assignedUserId,
    });

    return lead;
  }

  async findAll(userId?: string, role?: string) {
    const where: any = {};
    if (role === 'asesora' && userId) {
      where.assignedUserId = userId;
    }

    return this.prisma.lead.findMany({
      where,
      include: {
        assignedUser: { select: { name: true } },
        source: true,
        client: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.lead.findUnique({
      where: { id },
      include: {
        assignedUser: { select: { name: true, email: true } },
        source: true,
        client: true,
        cases: {
          include: {
            history: { orderBy: { createdAt: 'asc' } },
            calls: { orderBy: { createdAt: 'desc' } },
          },
        },
      },
    });
  }

  async getDistribution() {
    const asesoras = await this.prisma.user.findMany({
      where: { role: 'asesora' },
      select: { id: true, name: true, isActive: true },
    });

    return Promise.all(
      asesoras.map(async (a) => {
        const totalLeads = await this.prisma.lead.count({
          where: { assignedUserId: a.id },
        });
        const activeLeads = await this.prisma.lead.count({
          where: { assignedUserId: a.id, status: { not: 'cerrado' } },
        });
        return { ...a, totalLeads, activeLeads };
      }),
    );
  }
}
