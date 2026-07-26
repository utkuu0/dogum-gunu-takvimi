import type { CreateFriendInput } from '@dogum-gunu/shared';
import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateFriendDto implements CreateFriendInput {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsDateString()
  birthDate!: string;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsString()
  photoUrl?: string | null;
}
