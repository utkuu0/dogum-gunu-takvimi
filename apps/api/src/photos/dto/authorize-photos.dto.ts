import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class AuthorizePhotosDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  codeVerifier!: string;

  @IsIn(['ios', 'android'])
  platform!: 'ios' | 'android';
}
