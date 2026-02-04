import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class CaseNotesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  /* ── Crear nota ── */
  async create(
    caseId: string,
    data: { managementType: string; content: string; nextFollowUpDate?: string },
    actorId: string,
  ) {
    const caseItem = await this.prisma.case.findUnique({ where: { id: caseId } });
    if (!caseItem) throw new NotFoundException('Caso no encontrado');

    if (data.managementType === 'reagendar' && !data.nextFollowUpDate) {
      throw new BadRequestException('El tipo "Reagendar" requiere fecha de próximo seguimiento');
    }

    const actor = await this.prisma.user.findUnique({ where: { id: actorId } });

    const note = await this.prisma.caseNote.create({
      data: {
        caseId,
        userId: actorId,
        role: actor!.role,
        managementType: data.managementType as any,
        content: data.content,
        statusSnapshot: caseItem.status,
        nextFollowUpDate: data.nextFollowUpDate ? new Date(data.nextFollowUpDate) : null,
      },
      include: { user: { select: { name: true } } },
    });

    // Auto-cierre cuando el tipo es "cierre_de_caso"
    if (data.managementType === 'cierre_de_caso' && caseItem.status !== 'cerrado') {
      await this.prisma.case.update({
        where: { id: caseId },
        data: { status: 'cerrado' },
      });
      await this.prisma.statusHistory.create({
        data: {
          caseId,
          previousStatus: caseItem.status as any,
          newStatus: 'cerrado',
          userId: actorId,
        },
      });
    }

    // Toca updatedAt del caso para reflejar "última gestión"
    await this.prisma.$executeRaw`UPDATE cases SET updatedAt = NOW() WHERE id = ${caseId}`;

    // Auditoría obligatoria
    await this.audit.log(actorId, 'CREATE_NOTE', 'case', caseId, {
      managementType: data.managementType,
      noteId: note.id,
    });

    return note;
  }

  /* ── Listar notas de un caso ── */
  async findByCaseId(caseId: string) {
    const caseExists = await this.prisma.case.findUnique({ where: { id: caseId } });
    if (!caseExists) throw new NotFoundException('Caso no encontrado');

    return this.prisma.caseNote.findMany({
      where: { caseId },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /* ── Editar nota ── */
  async update(
    noteId: string,
    data: { content?: string; managementType?: string; nextFollowUpDate?: string },
    actorId: string,
    actorRole: string,
  ) {
    const note = await this.prisma.caseNote.findUnique({ where: { id: noteId } });
    if (!note) throw new NotFoundException('Nota no encontrada');
    if (note.annulledAt) throw new BadRequestException('No se puede editar una nota anulada');

    // Validación de permisos según rol
    if (actorRole === 'asesora') {
      if (note.userId !== actorId) throw new ForbiddenException('Solo puede editar sus propias notas');
      const elapsedMs = Date.now() - new Date(note.createdAt).getTime();
      if (elapsedMs > 10 * 60 * 1000) {
        throw new ForbiddenException('Solo puede editar notas dentro de los primeros 10 minutos');
      }
    } else if (actorRole === 'supervisor') {
      if (note.role === 'admin') throw new ForbiddenException('No puede editar notas de administrador');
    }

    // Si el tipo final es "reagendar" debe haber fecha
    const finalType = data.managementType || note.managementType;
    if (finalType === 'reagendar' && !data.nextFollowUpDate && !note.nextFollowUpDate) {
      throw new BadRequestException('El tipo "Reagendar" requiere fecha de próximo seguimiento');
    }

    return this.prisma.caseNote.update({
      where: { id: noteId },
      data: {
        ...(data.content !== undefined && { content: data.content }),
        ...(data.managementType !== undefined && { managementType: data.managementType as any }),
        ...(data.nextFollowUpDate !== undefined && {
          nextFollowUpDate: data.nextFollowUpDate ? new Date(data.nextFollowUpDate) : null,
        }),
      },
      include: { user: { select: { name: true } } },
    });
  }

  /* ── Anular nota ── */
  async annul(noteId: string, actorId: string, actorRole: string) {
    if (actorRole === 'asesora') {
      throw new ForbiddenException('Los agentes no pueden anular notas');
    }

    const note = await this.prisma.caseNote.findUnique({ where: { id: noteId } });
    if (!note) throw new NotFoundException('Nota no encontrada');
    if (note.annulledAt) throw new BadRequestException('La nota ya está anulada');

    if (actorRole === 'supervisor' && note.role !== 'asesora') {
      throw new ForbiddenException('Solo puede anular notas de agentes');
    }

    const updated = await this.prisma.caseNote.update({
      where: { id: noteId },
      data: { annulledAt: new Date() },
      include: { user: { select: { name: true } } },
    });

    await this.audit.log(actorId, 'ANNUL_NOTE', 'case', note.caseId, { noteId });

    return updated;
  }
}
