import {
  forwardRef,
  Inject,
  Injectable,
  UnauthorizedException,
  ServiceUnavailableException,
  Logger,
} from "@nestjs/common";
import { AuditLogService } from "../../audit-log/audit-log.service";
import { AuditLogType } from "../../audit-log/entities/audit-log.entity";
import { UsersService } from "src/users/users.service";
import { HashingProvider } from "./hashing-provider";
import { GenerateTokenProvider } from "../../common/utils/generate-token.provider";
import { SignInDto } from "../dto/create-auth.dto";

@Injectable()
export class SignInProvider {
  constructor(
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,

    private readonly hashingProvider: HashingProvider,
    private readonly generateTokensProvider: GenerateTokenProvider,
    @Inject(forwardRef(() => AuditLogService))
    private readonly auditLogService: AuditLogService,
  ) {}
  private readonly logger = new Logger(SignInProvider.name);

  public async signIn(signInDto: SignInDto) {
    const { email, password } = signInDto;
    this.logger.log(`User ${email} is attempting to sign in`);

    // 1. Retrieve user
    const user = await this.usersService.GetOneByEmail(
      email.trim().toLowerCase(),
    );
    if (!user) {
      this.logger.warn(`User not found`);
      
      // Log failed login attempt for non-existent user
      await this.auditLogService.create({
        type: AuditLogType.AUTH_FAILURE,
        description: `Failed login attempt for non-existent user: ${email}`,
        metadata: {
          email: email,
          reason: 'user_not_found',
          timestamp: new Date().toISOString(),
        },
      });
      
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
      this.logger.error(
        `Error verifying password: ${error.message}`,
        error.stack,
      );
      throw new ServiceUnavailableException(
        "Could not verify password. Please try again.",
      );
    }

    if (!isMatch) {
      this.logger.warn(`Incorrect password`);
      
      // Log failed login attempt due to incorrect password
      await this.auditLogService.create({
        type: AuditLogType.AUTH_FAILURE,
        userId: user.id,
        description: `Failed login attempt for user ${user.email} due to incorrect password`,
        metadata: {
          userId: user.id,
          email: user.email,
          reason: 'incorrect_password',
          timestamp: new Date().toISOString(),
        },
      });
      
      throw new UnauthorizedException("Email or password is incorrect.");
    }

    // 3. Generate tokens
    const tokens = await this.generateTokensProvider.generateTokens(user);
    
    // Log successful login
    await this.auditLogService.create({
      type: AuditLogType.AUTH_SUCCESS,
      userId: user.id,
      description: `Successful login for user ${user.email}`,
      metadata: {
        userId: user.id,
        email: user.email,
        timestamp: new Date().toISOString(),
      },
    });

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
