export interface JwtPayload {
  sub: string; // user id
  email: string;
  iat?: number;
  exp?: number;
  jti?: string; // JWT ID for tracking
}

export interface RefreshTokenPayload {
  sub: string;
  tokenId: string;
  iat?: number;
  exp?: number;
}