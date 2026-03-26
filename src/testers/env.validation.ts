import { z } from "zod";

/**
 * Environment validation schema using Zod
 * All environment variables are validated at application startup
 * Fail-fast approach: Application will not start with invalid configuration
 */

// Hex string validation helper (for wallet encryption key)
const hexStringRegex = /^[0-9a-fA-F]+$/;

export const envSchema = z.object({
  // ============================================
  // Application Configuration
  // ============================================
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z
    .string()
    .transform(Number)
    .pipe(z.number().min(1).max(65535))
    .default(() => 3000),

  // ============================================
  // Request Body Size Limits (environment-configurable)
  // ============================================
  BODY_LIMIT_JSON: z
    .string()
    .transform(Number)
    .pipe(z.number().min(1).max(100))
    .default(() => 10), // MB
  BODY_LIMIT_URLENCODED: z
    .string()
    .transform(Number)
    .pipe(z.number().min(1).max(100))
    .default(() => 10), // MB

  // ============================================
  // Database Configuration
  // ============================================
  DB_HOST: z.string().min(1, "DB_HOST is required"),
  DB_PORT: z
    .string()
    .transform(Number)
    .pipe(z.number().min(1).max(65535)),
  DB_USER: z.string().min(1, "DB_USER is required"),
  DB_PASSWORD: z.string().min(1, "DB_PASSWORD is required"),
  DB_NAME: z.string().min(1, "DB_NAME is required"),
  DB_SSL: z
    .string()
    .transform((val) => val === "true")
    .default(() => false),

  // ============================================
  // JWT Configuration
  // ============================================
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters for security"),
  JWT_EXPIRY: z
    .string()
    .transform(Number)
    .pipe(z.number().positive())
    .default(() => 3600),

  // ============================================
  // Refresh Token Configuration
  // ============================================
  REFRESH_TOKEN_SECRET: z
    .string()
    .min(32, "REFRESH_TOKEN_SECRET must be at least 32 characters for security"),
  REFRESH_TOKEN_EXPIRY: z
    .string()
    .transform(Number)
    .pipe(z.number().positive())
    .default(() => 604800), // 7 days in seconds

  // ============================================
  // OTP Configuration
  // ============================================
  OTP_SECRET: z
    .string()
    .min(32, "OTP_SECRET must be at least 32 characters for security"),
  OTP_EXPIRY: z
    .string()
    .transform(Number)
    .pipe(z.number().positive())
    .default(() => 300), // 5 minutes in seconds

  // ============================================
  // Wallet Encryption Configuration
  // ============================================
  WALLET_ENCRYPTION_KEY: z
    .string()
    .length(64, "WALLET_ENCRYPTION_KEY must be exactly 64 characters (hex)"),

  // ============================================
  // External Service Credentials
  // ============================================
  EXTERNAL_API_KEY: z.string().min(1, "EXTERNAL_API_KEY is required"),
  EXTERNAL_API_URL: z.string().url("EXTERNAL_API_URL must be a valid URL"),
  EXTERNAL_API_TIMEOUT: z
    .string()
    .transform(Number)
    .pipe(z.number().positive())
    .default(() => 30000),

  // ============================================
  // Mail Configuration
  // ============================================
  MAIL_HOST: z.string().min(1, "MAIL_HOST is required"),
  MAIL_PORT: z
    .string()
    .transform(Number)
    .pipe(z.number().min(1).max(65535)),
  MAIL_USER: z.string().email("MAIL_USER must be a valid email"),
  MAIL_PASSWORD: z.string().min(1, "MAIL_PASSWORD is required"),
  MAIL_FROM: z.string().email("MAIL_FROM must be a valid email"),
  MAIL_SECURE: z
    .string()
    .transform((val) => val === "true")
    .default(() => false),

  // ============================================
  // Redis Configuration (optional, for caching/sessions)
  // ============================================
  REDIS_HOST: z.string().optional().default("localhost"),
  REDIS_PORT: z
    .string()
    .transform(Number)
    .pipe(z.number().min(1).max(65535))
    .default(() => 6379),
  REDIS_PASSWORD: z.string().optional(),

  // ============================================
  // Rate Limiting Configuration
  // ============================================
  RATE_LIMIT_WINDOW_MS: z
    .string()
    .transform(Number)
    .pipe(z.number().positive())
    .default(() => 60000),
  RATE_LIMIT_MAX_REQUESTS: z
    .string()
    .transform(Number)
    .pipe(z.number().positive())
    .default(() => 100),

  // ============================================
  // Data Archival Configuration
  // ============================================
  ARCHIVE_ENABLED: z
    .string()
    .transform((val) => val === 'true')
    .default(() => true),
  ARCHIVE_THRESHOLD_MONTHS: z
    .string()
    .transform(Number)
    .pipe(z.number().int().min(1).max(120))
    .default(() => 12),
  ARCHIVE_BATCH_SIZE: z
    .string()
    .transform(Number)
    .pipe(z.number().int().min(10).max(5000))
    .default(() => 500),
  ARCHIVE_CRON: z.string().min(1).default(() => '0 3 * * *'),
});

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Validates environment variables and returns typed config
 * Throws detailed error if validation fails
 * This ensures fail-fast behavior on startup
 */
export function validateEnv(config: Record<string, unknown>): EnvConfig {
  try {
    return envSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`,
      );
      throw new Error(
        `Environment validation failed:\n${errorMessages.join("\n")}`,
      );
    }
    throw error;
  }
}

/**
 * Validates that the wallet encryption key is valid hex
 * Additional validation beyond schema checks
 */
export function validateWalletEncryptionKey(key: string): boolean {
  return hexStringRegex.test(key) && key.length === 64;
}
