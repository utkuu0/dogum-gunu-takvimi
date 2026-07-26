import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface FindOrCreateByGoogleInput {
  googleId: string;
  email: string;
  name: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByGoogleId(googleId: string) {
    return this.prisma.user.findUnique({ where: { googleId } });
  }

  async findOrCreateByGoogle({ googleId, email, name }: FindOrCreateByGoogleInput) {
    const existing = await this.findByGoogleId(googleId);
    if (existing) return existing;

    return this.prisma.user.create({
      data: { googleId, email, name },
    });
  }

  /** Mobil uygulama fcm token'ını (ve isteğe bağlı cihaz saat dilimini) kaydeder. */
  updateDeviceSettings(userId: string, data: { fcmToken: string | null; timezone?: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  /** Bildirim gönderimi geçersiz-token hatası döndüğünde token'ı temizlemek için. */
  clearFcmToken(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { fcmToken: null },
    });
  }
}
