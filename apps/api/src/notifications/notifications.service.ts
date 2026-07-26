import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { getNextBirthdayInfo } from '@dogum-gunu/shared';
import { FirebaseService, type PushNotification } from '../firebase/firebase.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import type { User } from '../generated/prisma/client';
import { getLocalDateInTimezone } from './timezone.util';

const REMINDER_DAYS_BEFORE = [1, 7] as const;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly firebaseService: FirebaseService,
    private readonly usersService: UsersService
  ) {}

  /**
   * Her gece 00:05'te çalışan repeatable job'ın gövdesi. Her kullanıcının kendi
   * zaman dilimindeki "bugün"e göre yarın/1 hafta sonra doğum günü olan
   * arkadaşlarını bulur ve sahiplerine FCM bildirimi gönderir.
   */
  async runNightlySweep(): Promise<void> {
    const users = await this.prisma.user.findMany({
      where: { fcmToken: { not: null } },
      include: { friends: true },
    });

    for (const user of users) {
      const today = getLocalDateInTimezone(user.timezone);

      for (const friend of user.friends) {
        const { daysUntil } = getNextBirthdayInfo(friend.birthDate, today);
        if (!REMINDER_DAYS_BEFORE.includes(daysUntil as (typeof REMINDER_DAYS_BEFORE)[number])) {
          continue;
        }

        const message =
          daysUntil === 1
            ? `Yarın ${friend.name}'in doğum günü! 🎂`
            : `1 hafta sonra ${friend.name}'in doğum günü`;

        await this.sendToUser(user, {
          title: 'Doğum Günü Hatırlatıcı',
          body: message,
          data: { friendId: friend.id },
        });
      }
    }
  }

  async sendTestNotification(user: User): Promise<{ sent: boolean }> {
    if (!user.fcmToken) {
      throw new BadRequestException(
        'Kayıtlı bir fcmToken yok — önce PATCH /users/me/fcm-token ile token gönder.'
      );
    }

    const result = await this.sendToUser(user, {
      title: 'Test Bildirimi',
      body: 'Bu bir test bildirimidir 🎉',
    });
    return { sent: result.success };
  }

  private async sendToUser(user: Pick<User, 'id' | 'fcmToken'>, notification: PushNotification) {
    if (!user.fcmToken) return { success: false, invalidToken: false };

    const result = await this.firebaseService.sendPush(user.fcmToken, notification);

    if (result.invalidToken) {
      this.logger.warn(`Geçersiz FCM token, temizleniyor (userId=${user.id}).`);
      await this.usersService.clearFcmToken(user.id);
    }

    return result;
  }
}
