import { IsOptional, IsString } from 'class-validator';

export class UpdateFcmTokenDto {
  @IsOptional()
  @IsString()
  fcmToken!: string | null;

  /** IANA zaman dilimi (örn. "Europe/Istanbul") — cihaz bunu login/ayarlar sırasında gönderebilir. */
  @IsOptional()
  @IsString()
  timezone?: string;
}
