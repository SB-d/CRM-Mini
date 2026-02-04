import { Controller, Get, Post, Put, Param, Query, Body, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ClientsService } from './clients.service';

@Controller('clients')
@UseGuards(JwtAuthGuard)
export class ClientsController {
  constructor(private clientsService: ClientsService) {}

  @Post('convert/:leadId')
  async convertFromLead(@Param('leadId') leadId: string, @Request() req: any) {
    return this.clientsService.convertFromLead(leadId, req.user.id);
  }

  @Get()
  async findAll(@Query('search') search?: string) {
    return this.clientsService.findAll(search);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.clientsService.findOne(id);
  }

  @UseGuards(RolesGuard)
  @Roles('admin', 'supervisor')
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: { name?: string; phone?: string; email?: string },
    @Request() req: any,
  ) {
    return this.clientsService.update(id, body, req.user.id);
  }
}
