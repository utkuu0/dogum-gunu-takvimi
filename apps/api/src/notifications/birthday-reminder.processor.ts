import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { NotificationsService } from './notifications.service';

@Processor('birthday-reminders')
export class BirthdayReminderProcessor extends WorkerHost {
  private readonly logger = new Logger(BirthdayReminderProcessor.name);

  constructor(private readonly notificationsService: NotificationsService) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Gece doğum günü taraması başlıyor (jobId=${job.id})`);
    await this.notificationsService.runNightlySweep();
  }
}
