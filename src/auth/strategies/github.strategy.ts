import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-github2';
import { OAuthUserProfile } from '../interfaces/oauth-user-profile.interface';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(private readonly configService: ConfigService) {
    const baseUrl =
      configService.get<string>('OAUTH_CALLBACK_BASE_URL') ??
      'http://localhost:3000';

    super({
      clientID: configService.get<string>('GITHUB_CLIENT_ID') ?? 'disabled',
      clientSecret:
        configService.get<string>('GITHUB_CLIENT_SECRET') ?? 'disabled',
      callbackURL: `${baseUrl.replace(/\/$/, '')}/auth/github/callback`,
      scope: ['user:email'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ): OAuthUserProfile {
    const email = profile.emails?.[0]?.value?.toLowerCase();

    if (!email) {
      throw new UnauthorizedException(
        'GitHub account did not provide an email address',
      );
    }

    return {
      email,
      fullName: profile.displayName || profile.username || email.split('@')[0],
      avatarUrl: profile.photos?.[0]?.value ?? null,
      githubId: profile.id,
    };
  }
}