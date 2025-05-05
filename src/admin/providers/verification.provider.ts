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
import { AdminService } from "./admin.service";
import { GenerateTokenProvider } from "../../common/utils/generate-token.provider";

@Injectable()
export class TokenVerificationProvider {
  constructor(
    @Inject(forwardRef(() => AdminService))
    private readonly adminServices: AdminService,
    private readonly jwtService: JwtService,
    private readonly generateTokenProvider: GenerateTokenProvider,

    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
  ) {}
  private readonly logger = new Logger(TokenVerificationProvider.name);

  public async verifyToken(token: string) {
    this.logger.log(`Verifying Token: ${token}`);
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
      const user = await this.adminServices.findOneByEmail(email);
      this.logger.log(`User found: ${JSON.stringify(user, null, 2)}`);

      if (user.id !== userId || user.email !== email) {
        throw new UnauthorizedException("Token does not match user");
      }

      if (!user.isVerified) {
        await this.adminServices.updateAdminUser(user.id, {}, { isVerified: true });
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

  async verifyPasswordResetToken(token: string) {
    this.logger.log('Verifying password reset token');
    try {
      const { email } = await this.jwtService.verifyAsync(
        token,
        {
          secret: this.jwtConfiguration.resetPasswordSecret,
          audience: this.jwtConfiguration.audience,
          issuer: this.jwtConfiguration.issuer,
        },
      );
      this.logger.log(`User email: ${email}`);

      // Check if the user exists
      const user = await this.adminServices.findOneByEmail(email);
      if (!user) {
        throw new UnauthorizedException('Invalid token');
      }

      return {
        isValid: true,
        email: user.email
      };
    } catch (error) {
      this.logger.error(`Error verifying reset token: ${error.message}`, error.stack);
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Reset token has expired. Please request another one');
      }
      throw new UnauthorizedException('Invalid reset token');
    }
  }

  async sendToken(email: string) {
    const message = 'Further instructions would be sent to this inbox. Be sure to check your spam or junk folders.';
    // Check if the user exists
    const user = await this.adminServices.findOneByEmail(email);
    if (!user) {
      this.logger.warn(`User not found for: ${email}`);
      return {
        message,
      };
    }
    this.logger.log(`User found: ${JSON.stringify(user, null, 2)}`);

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
