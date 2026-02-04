import { Module } from '@nestjs/common';
import { CaseNotesService } from './case-notes.service';
import { CaseNotesController } from './case-notes.controller';

@Module({
  controllers: [CaseNotesController],
  providers: [CaseNotesService],
})
export class CaseNotesModule {}
