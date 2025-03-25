import { plainToClass } from "class-transformer";
import { IsString, IsNumber, validateSync } from "class-validator";
import { Transform } from "class-transformer";

class EnvironmentVariables {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @IsString()
  DB_HOST: string;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @Transform(({ value }) => Number(value))
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @IsNumber()
  DB_PORT: number;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @IsString()
  DB_USERNAME: string;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @IsString()
  DB_PASSWORD: string;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @IsString()
  JWT_SECRET: string;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @IsString()
  JWT_EXPIRATION: string;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @IsString()
  CONTRACT_ADDRESS: string;
}

export function validate(config: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
  const validatedConfig = plainToClass(EnvironmentVariables, config);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
  const errors = validateSync(validatedConfig);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (errors.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    throw new Error(`Environment validation failed: ${errors.toString()}`);
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return validatedConfig;
}
