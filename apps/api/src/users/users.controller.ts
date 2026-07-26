import { Body, Controller, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { User } from '../generated/prisma/client';
import { UpdateFcmTokenDto } from './dto/update-fcm-token.dto';
import { UsersService } from './users.service';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me/fcm-token')
  async updateFcmToken(@CurrentUser() user: User, @Body() dto: UpdateFcmTokenDto) {
    const updated = await this.usersService.updateDeviceSettings(user.id, {
      fcmToken: dto.fcmToken,
      timezone: dto.timezone,
    });
    return { id: updated.id, fcmToken: updated.fcmToken, timezone: updated.timezone };
  }
}
