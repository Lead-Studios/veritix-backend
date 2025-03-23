import { JwtService } from '@nestjs/jwt';
import { ConfigType } from '@nestjs/config';
import { GenerateTokenProvider } from './generate-token.provider';
import jwtConfig from 'config/jwt.config';
import { UsersService } from 'src/users/users.service';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
export declare class RefreshTokenProvider {
    private readonly userServices;
    private readonly jwtService;
    private readonly jwtConfiguration;
    private readonly generateTokensProvider;
    constructor(userServices: UsersService, jwtService: JwtService, jwtConfiguration: ConfigType<typeof jwtConfig>, generateTokensProvider: GenerateTokenProvider);
    refreshToken(refreshTokenDto: RefreshTokenDto): Promise<{
        access_token: string;
        refresh_token: string;
    }>;
}
