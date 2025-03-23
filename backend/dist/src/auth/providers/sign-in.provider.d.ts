import { UsersService } from 'src/users/users.service';
import { HashingProvider } from './hashing-provider';
import { GenerateTokenProvider } from './generate-token.provider';
import { SignInDto } from '../dto/create-auth.dto';
export declare class SignInProvider {
    private readonly userServices;
    private readonly hashingProvider;
    private readonly generateTokensProvider;
    constructor(userServices: UsersService, hashingProvider: HashingProvider, generateTokensProvider: GenerateTokenProvider);
    SignIn(signInDto: SignInDto): Promise<(import("../../users/entities/user.entity").User | {
        access_token: string;
        refresh_token: string;
    })[]>;
}
