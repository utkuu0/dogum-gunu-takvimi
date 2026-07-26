import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import { UsersService } from '../users/users.service';
import { AccessTokenPayload, RefreshTokenPayload } from './types/jwt-payload.type';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly googleClient: OAuth2Client;
  private readonly googleAudiences: string[];

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService
  ) {
    this.googleClient = new OAuth2Client();
    this.googleAudiences = [
      this.configService.get<string>('GOOGLE_IOS_CLIENT_ID'),
      this.configService.get<string>('GOOGLE_ANDROID_CLIENT_ID'),
      this.configService.get<string>('GOOGLE_WEB_CLIENT_ID'),
    ].filter((id): id is string => Boolean(id));
  }

  async loginWithGoogle(idToken: string) {
    const googleUser = await this.verifyGoogleIdToken(idToken);

    const user = await this.usersService.findOrCreateByGoogle({
      googleId: googleUser.googleId,
      email: googleUser.email,
      name: googleUser.name,
    });

    return { user, tokens: this.issueTokens(user.id, user.email) };
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token geçersiz veya süresi dolmuş.');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Geçersiz token tipi.');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Kullanıcı bulunamadı.');
    }

    return this.issueTokens(user.id, user.email);
  }

  private issueTokens(userId: string, email: string): TokenPair {
    const accessPayload: AccessTokenPayload = { sub: userId, email };
    const refreshPayload: RefreshTokenPayload = { sub: userId, type: 'refresh' };

    const accessToken = this.jwtService.sign(accessPayload, {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: Number(this.configService.get('JWT_ACCESS_EXPIRES_IN_SECONDS', '900')),
    });

    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: Number(this.configService.get('JWT_REFRESH_EXPIRES_IN_SECONDS', '2592000')),
    });

    return { accessToken, refreshToken };
  }

  /**
   * Şimdilik sadece idToken'daki temel kimlik bilgilerini (sub/email/name) doğruluyor.
   * Google Photos entegrasyonu (Adım 9) authorization-code tabanlı ayrı bir akış ve
   * kendi access/refresh token saklama mantığı gerektirecek — bu metodun kapsamı dışında.
   */
  private async verifyGoogleIdToken(idToken: string) {
    let ticket;
    try {
      ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: this.googleAudiences,
      });
    } catch {
      throw new UnauthorizedException('Google idToken doğrulanamadı.');
    }

    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) {
      throw new UnauthorizedException('Google idToken beklenen bilgileri içermiyor.');
    }

    return {
      googleId: payload.sub,
      email: payload.email,
      name: payload.name ?? payload.email,
    };
  }
}
