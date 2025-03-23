import { SignInDto } from '../dto/create-auth.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { SignInProvider } from './sign-in.provider';
import { RefreshTokenProvider } from './refresh-token.provider';
import { UsersService } from 'src/users/users.service';
export declare class AuthService {
    private readonly usersService;
    private readonly signInProvider;
    private readonly refreshTokenProvider;
    constructor(usersService: UsersService, signInProvider: SignInProvider, refreshTokenProvider: RefreshTokenProvider);
    SignIn(signInDto: SignInDto): Promise<(import("../../users/entities/user.entity").User | {
        access_token: string;
        refresh_token: string;
    })[]>;
    refreshToken(refreshTokenDto: RefreshTokenDto): Promise<{
        access_token: string;
        refresh_token: string;
    }>;
}
