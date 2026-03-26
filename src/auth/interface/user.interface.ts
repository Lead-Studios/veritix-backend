export interface JwtPayload {
  userId: number;
  email?: string;
  fullName?: string;
  role?: string;
  tokenVersion?: number;
  iat?: number;
  exp?: number;
}
