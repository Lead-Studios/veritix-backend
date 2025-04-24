import {
  forwardRef,
  Inject,
  Injectable,
  UnauthorizedException,
  Logger,
  ConflictException
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigType } from "@nestjs/config";
import jwtConfig from "src/config/jwt.config";
import { UsersService } from "src/users/users.service";
import { GenerateTokenProvider } from "./generate-token.provider";

@Injectable()
export class TokenVerificationProvider {
  constructor(
    @Inject(forwardRef(() => UsersService))
    private readonly userServices: UsersService,
    private readonly jwtService: JwtService,
    private readonly generateTokenProvider: GenerateTokenProvider,

    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
  ) {}
  private readonly logger = new Logger(TokenVerificationProvider.name);

  public async verifyToken(token: string) {
    this.logger.log(`Token: ${token}`);
    try {
      const { userId, email } = await this.jwtService.verifyAsync(
        token,
        {
          secret: this.jwtConfiguration.secret,
          audience: this.jwtConfiguration.audience,
          issuer: this.jwtConfiguration.issuer,
        },
      );

      // Check if the user exists
      const user = await this.userServices.findOneById(userId);
      
      if (user.id !== userId) {
        throw new UnauthorizedException("Token does not match user");
      }
      if (user.email !== email) {
        throw new UnauthorizedException("Token does not match email");
      }

      if (!user.isVerified) {
        await this.userServices.updateUser(user.id, { id: user.id }, { isVerified: true });
      } else {
        return { message: "Email already verified" };
      }

      return { message: "Email verified successfully" };
    } catch (error) {
      this.logger.error(`Error verifying email: ${error.message}`, error.stack);
      this.logger.debug(`Error details: ${JSON.stringify(error, null, 2)}`);
      if (error.name === "TokenExpiredError") {
        throw new UnauthorizedException("Token has expired. Please request another one");
      }

      throw new UnauthorizedException("Invalid or expired token");
    }
  }

  public async sendToken(email: string) {
    const message = 'Further instructions would be sent to this inbox. Be sure to check your spam or junk folders.';
    // Check if the user exists
    const user = await this.userServices.GetOneByEmail(email);
    if (!user) {
      this.logger.warn(`User not found for: ${email}`);
      return {
        message,
      };
    }

    if (user.isVerified) {
      throw new  ConflictException('Account already verified.');
    }

    const token = await this.generateTokenProvider.generateVerificationToken(user);
    this.logger.log(`Token: ${token}`);

    // send email using emailService

    return {
      message,
    };
  }
}
