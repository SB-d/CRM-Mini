import { Controller, Post, Get, Patch, Body, Param, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CaseNotesService } from './case-notes.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class CaseNotesController {
  constructor(private caseNotesService: CaseNotesService) {}

  @Post('cases/:caseId/notes')
  async create(
    @Param('caseId') caseId: string,
    @Body() body: { managementType: string; content: string; nextFollowUpDate?: string },
    @Request() req: any,
  ) {
    return this.caseNotesService.create(caseId, body, req.user.id);
  }

  @Get('cases/:caseId/notes')
  async findAll(@Param('caseId') caseId: string) {
    return this.caseNotesService.findByCaseId(caseId);
  }

  @Patch('notes/:id')
  async update(
    @Param('id') id: string,
    @Body() body: { content?: string; managementType?: string; nextFollowUpDate?: string },
    @Request() req: any,
  ) {
    return this.caseNotesService.update(id, body, req.user.id, req.user.role);
  }

  @Patch('notes/:id/annul')
  async annul(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    return this.caseNotesService.annul(id, req.user.id, req.user.role);
  }
}
