import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ClientsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  /**
   * Convierte un Lead existente en Cliente.
   * - Crea el registro Client con los datos del lead
   * - Crea un Case asociado automáticamente (status: nuevo)
   * - Registra el estado inicial en StatusHistory
   * - Actualiza el lead a status "contactado"
   * - Todo el historial del lead se conserva íntegro
   */
  async convertFromLead(leadId: string, actorId: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new NotFoundException('Lead no encontrado');

    const existingClient = await this.prisma.client.findFirst({
      where: { leadId },
    });
    if (existingClient) {
      throw new ConflictException('Este lead ya fue convertido a cliente');
    }

    const client = await this.prisma.client.create({
      data: {
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        leadId: lead.id,
      },
    });

    const newCase = await this.prisma.case.create({
      data: {
        clientId: client.id,
        leadId: lead.id,
        status: 'nuevo',
      },
    });

    await this.prisma.statusHistory.create({
      data: {
        caseId: newCase.id,
        previousStatus: null,
        newStatus: 'nuevo',
        userId: actorId,
      },
    });

    await this.prisma.lead.update({
      where: { id: leadId },
      data: { status: 'contactado' },
    });

    await this.audit.log(actorId, 'CONVERT_LEAD', 'client', client.id, {
      fromLeadId: leadId,
      caseId: newCase.id,
    });

    return { client, case: newCase };
  }

  async findAll() {
    return this.prisma.client.findMany({
      include: {
        lead: true,
        cases: {
          include: {
            history: { orderBy: { createdAt: 'asc' } },
          },
        },
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
}
