import { plainToInstance, Transform } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  validateSync,
} from 'class-validator';

export class EnvironmentVariables {
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseInt(String(value), 10))
  PORT?: number;

  @IsString()
  @IsNotEmpty()
  DB_URL: string;

  @IsString()
  @IsNotEmpty()
  JWT_SECRET: string;

  @IsString()
  @IsNotEmpty()
  STELLAR_KEYS: string;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseInt(String(value), 10))
  QR_EXPIRY_SECONDS?: number;

  @IsString()
  @IsOptional()
  QR_SECRET?: string;

  // Logging configuration
  @IsString()
  @IsOptional()
  LOG_LEVEL?: string;

  @IsString()
  @IsOptional()
  LOG_EXTERNAL_PROVIDER?: string;

  @IsString()
  @IsOptional()
  LOG_EXTERNAL_URL?: string;

  @IsString()
  @IsOptional()
  LOG_EXTERNAL_TOKEN?: string;

  @IsString()
  @IsOptional()
  LOG_EXTERNAL_ENABLED?: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
