import { Controller, Get, Post, Put, Body, Param, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { LeadAuthGuard } from '../auth/lead-auth.guard';
import { LeadsService } from './leads.service';

@Controller('leads')
export class LeadsController {
  constructor(private leadsService: LeadsService) {}

  @UseGuards(LeadAuthGuard)
  @Post()
  async create(
    @Body() body: {
      name: string;
      phone: string;
      email?: string;
      source?: string;
      externalId?: string;
    },
  ) {
    return this.leadsService.create(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('sourceId') sourceId?: string,
    @Query('assignedUserId') assignedUserId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.leadsService.findAll(req.user.id, req.user.role, {
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      status,
      sourceId,
      assignedUserId,
      from,
      to,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'supervisor')
  @Get('distribution')
  async getDistribution() {
    return this.leadsService.getDistribution();
  }

  @UseGuards(JwtAuthGuard)
  @Get('sources')
  async getSources() {
    return this.leadsService.getSources();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.leadsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'supervisor')
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: { name?: string; phone?: string; email?: string; observations?: string },
    @Request() req: any,
  ) {
    return this.leadsService.update(id, body, req.user.id);
  }
}
