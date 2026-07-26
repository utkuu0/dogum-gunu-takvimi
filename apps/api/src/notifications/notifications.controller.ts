import { Controller, NotFoundException, Post, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { User } from '../generated/prisma/client';
import { NotificationsService } from './notifications.service';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService
  ) {}

  @Post('test')
  test(@CurrentUser() user: User) {
    if (this.configService.get('NODE_ENV') !== 'development') {
      throw new NotFoundException();
    }
    return this.notificationsService.sendTestNotification(user);
  }
}
