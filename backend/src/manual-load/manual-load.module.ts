import { Module } from '@nestjs/common';
import { ManualLoadService } from './manual-load.service';
import { ManualLoadController } from './manual-load.controller';
import { LeadsModule } from '../leads/leads.module';

@Module({
  imports: [LeadsModule],
  providers: [ManualLoadService],
  controllers: [ManualLoadController],
})
export class ManualLoadModule {}
