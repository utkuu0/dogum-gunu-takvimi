import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { cert, initializeApp, type App, type ServiceAccount } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

export interface PushNotification {
  title: string;
  body: string;
  /** Bildirime tıklanınca mobil tarafta deep link için kullanılır (örn. { friendId }). FCM tüm değerlerin string olmasını ister. */
  data?: Record<string, string>;
}

export interface SendPushResult {
  success: boolean;
  /** true ise (geçersiz/silinmiş kayıt) token veritabanından temizlenmeli. */
  invalidToken: boolean;
}

const INVALID_TOKEN_ERROR_CODES = new Set([
  'messaging/invalid-registration-token',
  'messaging/registration-token-not-registered',
]);

@Injectable()
export class FirebaseService {
  private readonly logger = new Logger(FirebaseService.name);
  private app: App | null = null;

  constructor(configService: ConfigService) {
    const encoded = configService.get<string>('FIREBASE_SERVICE_ACCOUNT_BASE64');
    if (!encoded) {
      this.logger.warn(
        'FIREBASE_SERVICE_ACCOUNT_BASE64 tanımlı değil — FCM bildirimleri devre dışı (sadece loglanacak).'
      );
      return;
    }

    try {
      const serviceAccount = JSON.parse(
        Buffer.from(encoded, 'base64').toString('utf-8')
      ) as ServiceAccount;
      this.app = initializeApp({ credential: cert(serviceAccount) });
    } catch (err) {
      this.logger.error(
        `FIREBASE_SERVICE_ACCOUNT_BASE64 çözümlenemedi, FCM devre dışı: ${err instanceof Error ? err.message : err}`
      );
    }
  }

  get enabled(): boolean {
    return this.app !== null;
  }

  async sendPush(token: string, notification: PushNotification): Promise<SendPushResult> {
    if (!this.app) {
      this.logger.debug(`[FCM devre dışı] "${notification.title}" gönderilecekti → ${token}`);
      return { success: false, invalidToken: false };
    }

    try {
      await getMessaging(this.app).send({
        token,
        notification: { title: notification.title, body: notification.body },
        data: notification.data,
      });
      return { success: true, invalidToken: false };
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code && INVALID_TOKEN_ERROR_CODES.has(code)) {
        return { success: false, invalidToken: true };
      }
      this.logger.error(`FCM gönderimi başarısız: ${err instanceof Error ? err.message : err}`);
      return { success: false, invalidToken: false };
    }
  }
}
