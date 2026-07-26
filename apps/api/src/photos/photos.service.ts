import { BadGatewayException, BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../prisma/prisma.service';
import { AuthorizePhotosDto } from './dto/authorize-photos.dto';

const PICKER_API_BASE = 'https://photospicker.googleapis.com/v1';

export interface PickerSession {
  id: string;
  pickerUri: string;
  mediaItemsSet: boolean;
  pollingConfig?: { pollInterval?: string; timeoutIn?: string };
}

export interface PickedMediaItem {
  id: string;
  createTime: string;
  baseUrl: string;
  mimeType: string;
}

@Injectable()
export class PhotosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
  ) {}

  private clientIdForPlatform(platform: 'ios' | 'android'): string {
    const key = platform === 'ios' ? 'GOOGLE_IOS_CLIENT_ID' : 'GOOGLE_ANDROID_CLIENT_ID';
    return this.configService.getOrThrow<string>(key);
  }

  async authorize(userId: string, dto: AuthorizePhotosDto): Promise<void> {
    const client = new OAuth2Client({
      clientId: this.clientIdForPlatform(dto.platform),
      redirectUri: this.configService.getOrThrow<string>('GOOGLE_PHOTOS_REDIRECT_URI'),
    });

    const { tokens } = await exchangeAuthorizationCode(client, dto.code, dto.codeVerifier);

    if (!tokens.access_token || !tokens.expiry_date) {
      throw new BadRequestException('Google beklenen token bilgilerini döndürmedi.');
    }

    const existing = await this.prisma.googlePhotosAuthorization.findUnique({ where: { userId } });

    await this.prisma.googlePhotosAuthorization.upsert({
      where: { userId },
      create: {
        userId,
        accessToken: tokens.access_token,
        // İlk yetkilendirmede refresh_token gelir; sonraki incremental çağrılarda
        // gelmeyebilir (Google zaten var olanı geçerli sayar).
        refreshToken: tokens.refresh_token ?? '',
        expiryDate: new Date(tokens.expiry_date),
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? existing?.refreshToken,
        expiryDate: new Date(tokens.expiry_date),
      },
    });
  }

  async isAuthorized(userId: string): Promise<boolean> {
    const record = await this.prisma.googlePhotosAuthorization.findUnique({ where: { userId } });
    return record !== null;
  }

  private async getValidAccessToken(userId: string): Promise<string> {
    const record = await this.prisma.googlePhotosAuthorization.findUnique({ where: { userId } });
    if (!record) {
      throw new BadRequestException(
        'Google Photos bağlı değil. Önce POST /photos/authorize ile yetkilendirme yapmalısın.'
      );
    }

    const ONE_MINUTE_MS = 60_000;
    if (record.expiryDate.getTime() > Date.now() + ONE_MINUTE_MS) {
      return record.accessToken;
    }

    const client = new OAuth2Client();
    client.setCredentials({ refresh_token: record.refreshToken });

    const { credentials } = await refreshOAuthToken(client);

    if (!credentials.access_token || !credentials.expiry_date) {
      throw new BadGatewayException('Google token yenileme beklenen bilgileri döndürmedi.');
    }

    await this.prisma.googlePhotosAuthorization.update({
      where: { userId },
      data: {
        accessToken: credentials.access_token,
        expiryDate: new Date(credentials.expiry_date),
      },
    });

    return credentials.access_token;
  }

  /**
   * Not: Bu metotlar Google Photos Picker API'nin dokümante edilmiş REST şemasına göre
   * yazıldı ama gerçek Google kimlik bilgileriyle canlı test edilemedi — Picker API
   * göreceli yeni ve şema küçük detaylarda değişmiş olabilir, GCP kurulumu yapılıp ilk
   * denemede hata alınırsa Google'ın güncel dokümantasyonuyla karşılaştırılması gerekir.
   */
  async createSession(userId: string): Promise<PickerSession> {
    const accessToken = await this.getValidAccessToken(userId);

    const response = await fetch(`${PICKER_API_BASE}/sessions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      throw new BadGatewayException(`Google Photos session oluşturulamadı (${response.status}).`);
    }

    return response.json() as Promise<PickerSession>;
  }

  async getSession(userId: string, sessionId: string): Promise<PickerSession> {
    const accessToken = await this.getValidAccessToken(userId);

    const response = await fetch(`${PICKER_API_BASE}/sessions/${sessionId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new BadGatewayException(`Google Photos session durumu alınamadı (${response.status}).`);
    }

    return response.json() as Promise<PickerSession>;
  }

  async listPickedItems(userId: string, sessionId: string): Promise<PickedMediaItem[]> {
    const accessToken = await this.getValidAccessToken(userId);

    const response = await fetch(
      `${PICKER_API_BASE}/mediaItems?sessionId=${encodeURIComponent(sessionId)}&pageSize=100`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) {
      throw new BadGatewayException(`Seçilen fotoğraflar alınamadı (${response.status}).`);
    }

    const body = (await response.json()) as {
      mediaItems?: Array<{
        id: string;
        createTime: string;
        mediaFile: { baseUrl: string; mimeType: string };
      }>;
    };

    return (body.mediaItems ?? []).map((item) => ({
      id: item.id,
      createTime: item.createTime,
      baseUrl: item.mediaFile.baseUrl,
      mimeType: item.mediaFile.mimeType,
    }));
  }

  /** Mobil, baseUrl'den görsel indirirken bu access token'ı Authorization header'ında kullanmalı. */
  async getAccessTokenForDownload(userId: string): Promise<string> {
    return this.getValidAccessToken(userId);
  }
}

async function exchangeAuthorizationCode(client: OAuth2Client, code: string, codeVerifier: string) {
  try {
    return await client.getToken({ code, codeVerifier });
  } catch {
    throw new BadRequestException('Google Photos yetkilendirme kodu doğrulanamadı.');
  }
}

async function refreshOAuthToken(client: OAuth2Client) {
  try {
    return await client.refreshAccessToken();
  } catch {
    throw new BadGatewayException('Google Photos token yenilenemedi, tekrar yetkilendirme gerekebilir.');
  }
}
