import { Controller, Post, Body, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ManualLoadService } from './manual-load.service';

@Controller('manual-load')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'supervisor')
export class ManualLoadController {
  constructor(private manualLoadService: ManualLoadService) {}

  @Post()
  async create(
    @Body()
    body: {
      name: string;
      phone: string;
      email?: string;
      observations?: string;
      source: string;
    },
    @Request() req: any,
  ) {
    return this.manualLoadService.createManual(body, req.user.id);
  }

  @Post('bulk')
  async createBulk(
    @Body()
    body: {
      items: Array<{
        name: string;
        phone: string;
        email?: string;
        observations?: string;
        source: string;
      }>;
    },
    @Request() req: any,
  ) {
    return this.manualLoadService.createBulk(body.items, req.user.id);
  }
}
