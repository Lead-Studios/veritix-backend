export interface OAuthUserProfile {
  email: string;
  fullName: string;
  avatarUrl?: string | null;
  googleId?: string;
  githubId?: string;
}