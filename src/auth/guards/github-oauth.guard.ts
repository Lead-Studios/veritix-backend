import {
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GithubOAuthGuard extends AuthGuard('github') {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    if (
      !this.configService.get<string>('GITHUB_CLIENT_ID') ||
      !this.configService.get<string>('GITHUB_CLIENT_SECRET')
    ) {
      throw new ServiceUnavailableException('GitHub OAuth is not configured');
    }

    return super.canActivate(context);
  }
}