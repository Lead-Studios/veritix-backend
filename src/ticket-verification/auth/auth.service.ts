import { Injectable, UnauthorizedException } from "@nestjs/common"
import type { JwtService } from "@nestjs/jwt"
import type { UsersService } from "../users/users.service"
import type { LoginDto } from "./dto/login.dto"
import type { JwtPayload } from "./interfaces/jwt-payload.interface"

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.usersService.findByUsername(username)

    if (user && (await this.usersService.validatePassword(password, user.password))) {
      const { password, ...result } = user
      return result
    }

    return null
  }

  async login(loginDto: LoginDto) {
    const { username, password } = loginDto
    const user = await this.validateUser(username, password)

    if (!user) {
      throw new UnauthorizedException("Invalid credentials")
    }

    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      roles: user.roles,
    }

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        roles: user.roles,
      },
    }
  }

  async verifyToken(token: string) {
    try {
      const payload = this.jwtService.verify(token)
      return payload
    } catch (error) {
      throw new UnauthorizedException("Invalid token")
    }
  }
}

