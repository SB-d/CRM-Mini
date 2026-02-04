import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { AssignmentService } from './assignment.service';
import { LeadAuthGuard } from '../auth/lead-auth.guard';

@Module({
  imports: [AuthModule],
  providers: [LeadsService, AssignmentService, LeadAuthGuard],
  controllers: [LeadsController],
  exports: [LeadsService],
})
export class LeadsModule {}
