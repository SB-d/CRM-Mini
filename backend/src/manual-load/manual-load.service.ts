import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AssignmentService } from '../leads/assignment.service';

interface ManualLoadItem {
  name: string;
  phone: string;
  email?: string;
  observations?: string;
  source: string;
}

@Injectable()
export class ManualLoadService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private assignment: AssignmentService,
  ) {}

  async createManual(data: ManualLoadItem, actorId: string) {
    const phoneExists = await this.prisma.lead.findFirst({
      where: { phone: data.phone },
    });
    if (phoneExists) {
      throw new ConflictException(`Teléfono ${data.phone} ya existe`);
    }

    let source = await this.prisma.leadSource.findFirst({
      where: { name: data.source },
    });
    if (!source) {
      source = await this.prisma.leadSource.create({
        data: { name: data.source },
      });
    }

    const assignedUserId = await this.assignment.getNextAsesora();

    const lead = await this.prisma.lead.create({
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email ?? null,
        observations: data.observations ?? null,
        sourceId: source.id,
        status: 'nuevo',
        createdManually: true,
        assignedUserId,
        assignedAt: assignedUserId ? new Date() : null,
      },
    });

    const client = await this.prisma.client.create({
      data: {
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        leadId: lead.id,
      },
    });

    const newCase = await this.prisma.case.create({
      data: { clientId: client.id, leadId: lead.id, status: 'nuevo' },
    });

    await this.prisma.statusHistory.create({
      data: {
        caseId: newCase.id,
        previousStatus: null,
        newStatus: 'nuevo',
        userId: actorId,
      },
    });

    await this.audit.log(actorId, 'CREATE_MANUAL', 'lead', lead.id, {
      source: data.source,
      assignedTo: assignedUserId,
    });

    return { lead, client, case: newCase };
  }

  async createBulk(items: ManualLoadItem[], actorId: string) {
    const results = { created: 0, skipped: 0, errors: [] as string[] };

    for (const item of items) {
      try {
        await this.createManual(item, actorId);
        results.created++;
      } catch (e: any) {
        results.skipped++;
        results.errors.push(`${item.name} (${item.phone}): ${e.message}`);
      }
    }

    return results;
  }
}
