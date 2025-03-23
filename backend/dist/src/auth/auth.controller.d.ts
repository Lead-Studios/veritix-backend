import { AuthService } from './providers/auth.service';
import { SignInDto } from './dto/create-auth.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    SignIn(signinDto: SignInDto): Promise<(import("../users/entities/user.entity").User | {
        access_token: string;
        refresh_token: string;
    })[]>;
    refreshToken(refreshTokenDto: RefreshTokenDto): Promise<{
        access_token: string;
        refresh_token: string;
    }>;
}
