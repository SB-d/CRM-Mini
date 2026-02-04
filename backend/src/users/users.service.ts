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
