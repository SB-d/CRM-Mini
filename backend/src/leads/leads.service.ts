import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
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
    if (data.externalId) {
      const existing = await this.prisma.lead.findUnique({
        where: { externalId: data.externalId },
      });
      if (existing) {
        throw new ConflictException('Lead duplicado: externalId ya existe');
      }
    }

    const phoneExists = await this.prisma.lead.findFirst({
      where: { phone: data.phone },
    });
    if (phoneExists) {
      throw new ConflictException('Lead duplicado: teléfono ya existe');
    }

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

  async findAll(
    userId?: string,
    role?: string,
    filters?: {
      page?: number;
      limit?: number;
      status?: string;
      sourceId?: string;
      assignedUserId?: string;
      from?: string;
      to?: string;
    },
  ) {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const where: any = {};

    if (role === 'asesora' && userId) {
      where.assignedUserId = userId;
    }
    if (filters?.status) where.status = filters.status;
    if (filters?.sourceId) where.sourceId = filters.sourceId;
    if (filters?.assignedUserId) where.assignedUserId = filters.assignedUserId;

    if (filters?.from || filters?.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = new Date(filters.from);
      if (filters.to) where.createdAt.lte = new Date(filters.to);
    }

    const [data, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        include: {
          assignedUser: { select: { name: true } },
          source: true,
          client: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.lead.count({ where }),
    ]);

    return { data, total, page, limit };
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

  async update(
    id: string,
    data: { name?: string; phone?: string; email?: string; observations?: string },
    actorId: string,
  ) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException('Lead no encontrado');

    const updated = await this.prisma.lead.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.observations !== undefined && { observations: data.observations }),
      },
    });

    await this.audit.log(actorId, 'UPDATE', 'lead', id, data);
    return updated;
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

  async getSources() {
    return this.prisma.leadSource.findMany({ orderBy: { name: 'asc' } });
  }
}
