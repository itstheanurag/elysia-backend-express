// OAuth provider interfaces
export interface OAuthUserInfo {
  provider: string;
  providerId: string;
  email?: string;
  name?: string;
  avatarUrl?: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export interface OAuthResult {
  user: {
    id: number;
    email: string;
    name: string;
    provider: string;
  };
  token: string;
  isNew: boolean;
}
