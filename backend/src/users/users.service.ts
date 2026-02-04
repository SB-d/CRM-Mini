import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async create(
    data: { email: string; password: string; name: string; role: string },
    actorId: string,
  ) {
    const hashed = await bcrypt.hash(data.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        password: hashed,
        name: data.name,
        role: data.role as any,
      },
    });

    await this.audit.log(actorId, 'CREATE', 'user', user.id, {
      name: data.name,
      role: data.role,
    });

    return this.sanitize(user);
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return users.map((u) => this.sanitize(u));
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return this.sanitize(user);
  }

  async update(
    id: string,
    data: { role?: string; password?: string; isActive?: boolean },
    actorId: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const updateData: any = {};
    if (data.role !== undefined) updateData.role = data.role;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.password) updateData.password = await bcrypt.hash(data.password, 10);

    const updated = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    await this.audit.log(actorId, 'UPDATE', 'user', id, {
      ...(data.role && { role: data.role }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      passwordChanged: !!data.password,
    });

    return this.sanitize(updated);
  }

  async toggleActive(id: string, isActive: boolean, actorId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive },
    });

    await this.audit.log(actorId, isActive ? 'ACTIVATE' : 'DEACTIVATE', 'user', id, {
      targetUser: user.name,
    });

    return this.sanitize(updated);
  }

  private sanitize(user: any) {
    const { password, ...rest } = user;
    return rest;
  }
}
