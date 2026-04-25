import { IsString, IsOptional, IsUrl, IsPhoneNumber, MaxLength, Validate } from 'class-validator';
import { IsStellarPublicKey } from '../../common/validators/stellar-public-key.validator';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  phone?: string;

  @IsUrl()
  @IsOptional()
  avatarUrl?: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  bio?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @Validate(IsStellarPublicKey)
  @IsOptional()
  stellarWalletAddress?: string;
}
