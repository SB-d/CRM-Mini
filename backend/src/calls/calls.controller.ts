import { Controller, Get, Post, Body, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CallsService } from './calls.service';

@Controller('calls')
@UseGuards(JwtAuthGuard)
export class CallsController {
  constructor(private callsService: CallsService) {}

  @Post()
  async create(
    @Body() body: {
      caseId: string;
      date: string;
      duration: number;
      result: string;
      observations?: string;
    },
    @Request() req: any,
  ) {
    return this.callsService.create(body, req.user.id);
  }

  @Get()
  async findByCaseId(@Query('caseId') caseId: string) {
    return this.callsService.findByCaseId(caseId);
  }
}
