export interface JwtPayload {
  sub: string
  username: string
  roles: string[]
  iat?: number
  exp?: number
}

