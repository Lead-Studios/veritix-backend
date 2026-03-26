export interface JwtPayload {
  userId: string;
  email?: string;
  fullName?: string;
  role?: string;
  tokenVersion?: number;
  iat?: number;
  exp?: number;
}
