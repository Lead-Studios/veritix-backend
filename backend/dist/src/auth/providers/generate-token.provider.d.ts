import { JwtService } from '@nestjs/jwt';
import { ConfigType } from '@nestjs/config';
import jwtConfig from 'config/jwt.config';
import { User } from 'src/users/entities/user.entity';
export declare class GenerateTokenProvider {
    private readonly jwtService;
    private readonly jwtConfiguration;
    constructor(jwtService: JwtService, jwtConfiguration: ConfigType<typeof jwtConfig>);
    SignToken<T>(userId: number, expiresIn: string | number, payload?: T): Promise<string>;
    generateTokens(user: User): Promise<{
        access_token: string;
        refresh_token: string;
    }>;
}
