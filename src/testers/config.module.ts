import { Module } from "@nestjs/common";
import { ConfigModule as NestConfigModule } from "@nestjs/config";
import { validateEnv } from "./env.validation";
import configuration from "./configuration";

/**
 * Global configuration module that provides validated environment variables
 * throughout the application.
 * 
 * Features:
 * - Strict validation at startup (fail-fast)
 * - Type-safe configuration access
 * - Environment variable expansion
 * - Global availability (no need to import in every module)
 */
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      load: [configuration],
      // Expand environment variables in .env file (e.g., DB_URL=postgres://${DB_USER}...)
      expandVariables: true,
      // Cache configuration for better performance
      cache: true,
    }),
  ],
})
export class ConfigModule {}
