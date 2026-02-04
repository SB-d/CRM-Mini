import { Controller, Get, Post, Body, Param, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { LeadAuthGuard } from '../auth/lead-auth.guard';
import { LeadsService } from './leads.service';

@Controller('leads')
export class LeadsController {
  constructor(private leadsService: LeadsService) {}

  // Endpoint público: acepta API Key (Zapier/n8n) o Bearer Token
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
  async findAll(@Request() req: any) {
    return this.leadsService.findAll(req.user.id, req.user.role);
  }

  // distribution DEBE estar antes que :id para que no se capture como parámetro
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('distribution')
  async getDistribution() {
    return this.leadsService.getDistribution();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.leadsService.findOne(id);
  }
}
