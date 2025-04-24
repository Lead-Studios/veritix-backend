import {
  forwardRef,
  Inject,
  Injectable,
  UnauthorizedException,
  ServiceUnavailableException,
  Logger,
} from "@nestjs/common";
import { UsersService } from "src/users/users.service";
import { HashingProvider } from "./hashing-provider";
import { GenerateTokenProvider } from "./generate-token.provider";
import { SignInDto } from "../dto/create-auth.dto";

@Injectable()
export class SignInProvider {
  constructor(
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,

    private readonly hashingProvider: HashingProvider,
    private readonly generateTokensProvider: GenerateTokenProvider,
  ) {}
  private readonly logger = new Logger(SignInProvider.name);

  public async signIn(signInDto: SignInDto) {
    const { email, password } = signInDto;
    this.logger.log(`User ${email} is attempting to sign in`);

    // 1. Retrieve user
    const user = await this.usersService.GetOneByEmail(email.trim().toLowerCase());
    if (!user) {
      this.logger.warn(`User not found`)
      throw new UnauthorizedException("Email or password is incorrect.");
    }

    // 2. Compare passwords
    let isMatch: boolean;
    try {
      isMatch = await this.hashingProvider.comparePassword(
        password,
        user.password,
      );
    } catch (error) {
      this.logger.error(`Error verifying password: ${error.message}`, error.stack);
      throw new ServiceUnavailableException(
        "Could not verify password. Please try again.",
      );
    }

    if (!isMatch) {
      this.logger.warn(`Incorrect password`)
      throw new UnauthorizedException("Email or password is incorrect.");
    }

    // 3. Generate tokens
    const tokens = await this.generateTokensProvider.generateTokens(user);

    // 4. Return result
    return {
      user: {
        email: user.email,
        username: user.userName,
        firstName: user.firstName,
        lastName: user.lastName,
        isVerified: user.isVerified,
        isActive: user.isActive,
      },
      tokens,
    };
  }
}
