import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Servicio de asignación automática round-robin equitativo.
 *
 * Algoritmo:
 *   1. Obtiene todas las asesoras con isActive = true
 *   2. Para cada una cuenta leads con status != cerrado (carga activa)
 *   3. Obtiene la fecha de su última asignación
 *   4. Ordena: menor carga primero; en empate, asignación más antigua primero
 *   5. Retorna la ID de la asesora elegida (o null si no hay activas)
 *
 * La lógica vive 100% en el backend y se ejecuta automáticamente
 * al crear un lead, independientemente del origen (API, Zapier, n8n).
 */
@Injectable()
export class AssignmentService {
  constructor(private prisma: PrismaService) {}

  async getNextAsesora(): Promise<string | null> {
    const asesoras = await this.prisma.user.findMany({
      where: { role: 'asesora', isActive: true },
    });

    if (asesoras.length === 0) return null;

    const candidates = await Promise.all(
      asesoras.map(async (asesora) => {
        const activeCount = await this.prisma.lead.count({
          where: {
            assignedUserId: asesora.id,
            status: { not: 'cerrado' },
          },
        });

        const lastAssigned = await this.prisma.lead.findFirst({
          where: { assignedUserId: asesora.id },
          orderBy: { assignedAt: 'desc' },
          select: { assignedAt: true },
        });

        return {
          id: asesora.id,
          activeCount,
          lastAssignedAt: lastAssigned?.assignedAt ?? new Date(0),
        };
      }),
    );

    candidates.sort((a, b) => {
      if (a.activeCount !== b.activeCount) return a.activeCount - b.activeCount;
      return a.lastAssignedAt.getTime() - b.lastAssignedAt.getTime();
    });

    return candidates[0].id;
  }
}
