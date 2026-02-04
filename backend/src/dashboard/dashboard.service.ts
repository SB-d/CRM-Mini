import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  private getSince(period: string): Date {
    const now = new Date();
    switch (period) {
      case 'day': {
        const d = new Date(now);
        d.setHours(0, 0, 0, 0);
        return d;
      }
      case 'week': {
        const d = new Date(now);
        d.setDate(d.getDate() - 7);
        return d;
      }
      case 'month':
      default: {
        const d = new Date(now);
        d.setMonth(d.getMonth() - 1);
        return d;
      }
    }
  }

  async getMetrics(period: string = 'month') {
    const since = this.getSince(period);
    const where = { createdAt: { gte: since } };

    const [totalLeads, conversions, leadsByStatus] = await Promise.all([
      this.prisma.lead.count({ where }),
      this.prisma.client.count({ where }),
      this.prisma.lead.groupBy({
        by: ['status'],
        _count: { id: true },
        where,
      }),
    ]);

    const conversionPct =
      totalLeads > 0 ? Math.round((conversions / totalLeads) * 1000) / 10 : 0;

    const statusMap: Record<string, number> = {};
    for (const row of leadsByStatus) {
      statusMap[row.status] = row._count.id;
    }

    const asesoras = await this.prisma.user.findMany({
      where: { role: 'asesora' },
      select: { id: true, name: true, isActive: true },
    });

    const productivity = await Promise.all(
      asesoras.map(async (a) => {
        const [leadsAssigned, casesWorked, callsRegistered, activeCases] =
          await Promise.all([
            this.prisma.lead.count({
              where: { assignedUserId: a.id, createdAt: { gte: since } },
            }),
            this.prisma.case.count({
              where: {
                lead: { assignedUserId: a.id },
                updatedAt: { gte: since },
              },
            }),
            this.prisma.callLog.count({
              where: { userId: a.id, createdAt: { gte: since } },
            }),
            this.prisma.case.count({
              where: {
                lead: { assignedUserId: a.id },
                status: { not: 'cerrado' },
              },
            }),
          ]);

        return {
          ...a,
          leadsAssigned,
          casesWorked,
          callsRegistered,
          activeCases,
        };
      }),
    );

    productivity.sort((a, b) => b.casesWorked - a.casesWorked);

    return {
      period,
      totalLeads,
      conversions,
      conversionPct,
      leadsByStatus: statusMap,
      productivity,
    };
  }
}
