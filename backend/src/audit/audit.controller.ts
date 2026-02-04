import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AuditService } from './audit.service';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  async findAll(
    @Query('entity') entity?: string,
    @Query('userId') userId?: string,
  ) {
    return this.auditService.findAll({ entity, userId });
  }
}
