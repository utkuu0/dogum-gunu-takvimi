import { getQueueToken, BullModule } from '@nestjs/bullmq';
import { Inject, Module, OnModuleInit } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { UsersModule } from '../users/users.module';
import { BirthdayReminderProcessor } from './birthday-reminder.processor';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

const QUEUE_NAME = 'birthday-reminders';
const NIGHTLY_SWEEP_JOB = 'nightly-sweep';
/** Her gece 00:05 (sunucu saatine göre) */
const NIGHTLY_SWEEP_CRON = '5 0 * * *';

@Module({
  imports: [UsersModule, BullModule.registerQueue({ name: QUEUE_NAME })],
  controllers: [NotificationsController],
  providers: [NotificationsService, BirthdayReminderProcessor],
})
export class NotificationsModule implements OnModuleInit {
  constructor(@Inject(getQueueToken(QUEUE_NAME)) private readonly queue: Queue) {}

  async onModuleInit() {
    await this.queue.add(
      NIGHTLY_SWEEP_JOB,
      {},
      { repeat: { pattern: NIGHTLY_SWEEP_CRON }, removeOnComplete: true, removeOnFail: true }
    );
  }
}
