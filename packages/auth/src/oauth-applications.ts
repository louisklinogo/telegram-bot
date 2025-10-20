import crypto from "crypto";
import bcrypt from "bcryptjs";

/**
 * OAuth Application Management Service
 * Following Midday's exact patterns for OAuth application creation and management
 */

export interface OAuthApplication {
  id: string;
  name: string;
  slug: string;
  description?: string;
  overview?: string;
  developerName?: string;
  logoUrl?: string;
  website?: string;
  installUrl?: string;
  screenshots: string[];
  redirectUris: string[];
  clientId: string;
  clientSecret?: string; // Only returned during creation/regeneration
  clientSecretHash: string;
  scopes: string[];
  teamId: string;
  createdBy: string;
  isPublic: boolean;
  active: boolean;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

export interface OAuthAuthorizationCode {
  id: string;
  code: string;
  applicationId: string;
  userId: string;
  teamId: string;
  scopes: string[];
  redirectUri: string;
  expiresAt: Date;
  createdAt: Date;
  used: boolean;
  codeChallenge?: string;
  codeChallengeMethod?: string;
}

export interface OAuthAccessToken {
  id: string;
  token: string;
  refreshToken?: string;
  applicationId: string;
  userId: string;
  teamId: string;
  scopes: string[];
  expiresAt: Date;
  refreshTokenExpiresAt?: Date;
  createdAt: Date;
  lastUsedAt?: Date;
  revoked: boolean;
  revokedAt?: Date;
}

export class OAuthApplicationService {
  /**
   * Generate a secure client ID following Midday's pattern
   * Format: faw_client_[32-char-base64url]
   */
  private generateClientId(): string {
    const randomBytes = crypto.randomBytes(24); // 24 bytes = 32 base64url chars
    return `faw_client_${randomBytes.toString('base64url')}`;
  }

  /**
   * Generate a secure client secret following Midday's pattern
   * Format: faw_secret_[64-char-base64url]
   */
  private generateClientSecret(): string {
    const randomBytes = crypto.randomBytes(48); // 48 bytes = 64 base64url chars
    return `faw_secret_${randomBytes.toString('base64url')}`;
  }

  /**
   * Generate a URL-safe slug from application name
   */
  private generateSlug(name: string, existingSlugs: string[] = []): string {
    let baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special chars except spaces and hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
    
    // Handle empty slug
    if (!baseSlug) {
      baseSlug = 'app';
    }
    
    // Ensure uniqueness
    let slug = baseSlug;
    let counter = 1;
    while (existingSlugs.includes(slug)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    return slug;
  }

  /**
   * Create a new OAuth application
   * Following Midday's exact creation flow
   */
  async createApplication(params: {
    name: string;
    description?: string;
    overview?: string;
    developerName?: string;
    logoUrl?: string;
    website?: string;
    installUrl?: string;
    screenshots?: string[];
    redirectUris: string[];
    scopes?: string[];
    isPublic?: boolean;
    teamId: string;
    createdBy: string;
  }): Promise<OAuthApplication> {
    const {
      name,
      description,
      overview,
      developerName,
      logoUrl,
      website,
      installUrl,
      screenshots = [],
      redirectUris,
      scopes = [],
      isPublic = false,
      teamId,
      createdBy,
    } = params;

    // Validate inputs
    if (!name || name.trim().length === 0) {
      throw new Error('Application name is required');
    }
    if (!redirectUris || redirectUris.length === 0) {
      throw new Error('At least one redirect URI is required');
    }
    if (screenshots.length > 4) {
      throw new Error('Maximum 4 screenshots allowed');
    }

    // Validate redirect URIs
    for (const uri of redirectUris) {
      try {
        new URL(uri);
      } catch {
        throw new Error(`Invalid redirect URI: ${uri}`);
      }
    }

    // Generate credentials
    const clientId = this.generateClientId();
    const clientSecret = this.generateClientSecret();
    const clientSecretHash = await bcrypt.hash(clientSecret, 12);
    
    // TODO: Get existing slugs from database to ensure uniqueness
    const existingSlugs: string[] = []; // This should be fetched from DB
    const slug = this.generateSlug(name, existingSlugs);

    const now = new Date();

    const application: OAuthApplication = {
      id: crypto.randomUUID(),
      name: name.trim(),
      slug,
      description: description?.trim() || null,
      overview: overview?.trim() || null,
      developerName: developerName?.trim() || null,
      logoUrl: logoUrl?.trim() || null,
      website: website?.trim() || null,
      installUrl: installUrl?.trim() || null,
      screenshots,
      redirectUris,
      clientId,
      clientSecret, // Only returned during creation
      clientSecretHash,
      scopes,
      teamId,
      createdBy,
      isPublic,
      active: true,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    };

    // TODO: Save to database using Supabase client
    // const { data, error } = await supabase
    //   .from('oauth_applications')
    //   .insert([{
    //     id: application.id,
    //     name: application.name,
    //     slug: application.slug,
    //     description: application.description,
    //     overview: application.overview,
    //     developer_name: application.developerName,
    //     logo_url: application.logoUrl,
    //     website: application.website,
    //     install_url: application.installUrl,
    //     screenshots: application.screenshots,
    //     redirect_uris: application.redirectUris,
    //     client_id: application.clientId,
    //     client_secret: application.clientSecretHash,
    //     scopes: application.scopes,
    //     team_id: application.teamId,
    //     created_by: application.createdBy,
    //     is_public: application.isPublic,
    //     active: application.active,
    //     status: application.status,
    //   }])
    //   .select()
    //   .single();

    return application;
  }

  /**
   * Regenerate client secret for an existing application
   */
  async regenerateClientSecret(applicationId: string, userId: string): Promise<{ clientSecret: string }> {
    // TODO: Verify user has permission to regenerate secret
    
    const newClientSecret = this.generateClientSecret();
    const clientSecretHash = await bcrypt.hash(newClientSecret, 12);

    // TODO: Update in database
    // const { error } = await supabase
    //   .from('oauth_applications')
    //   .update({
    //     client_secret: clientSecretHash,
    //     updated_at: new Date().toISOString(),
    //   })
    //   .eq('id', applicationId)
    //   .eq('team_id', teamId); // Ensure user can only update their team's apps

    return { clientSecret: newClientSecret };
  }

  /**
   * Validate client credentials
   * Following Midday's validation logic
   */
  async validateClientCredentials(
    clientId: string, 
    clientSecret?: string
  ): Promise<OAuthApplication | null> {
    // TODO: Get application from database
    // const { data: application } = await supabase
    //   .from('oauth_applications')
    //   .select('*')
    //   .eq('client_id', clientId)
    //   .eq('active', true)
    //   .single();

    // For now, return null (will be implemented with actual DB)
    const application: any = null;

    if (!application) {
      return null;
    }

    // For public clients, no secret validation required
    if (application.isPublic) {
      if (clientSecret) {
        throw new Error('Public clients must not send client_secret');
      }
      return application;
    }

    // For confidential clients, validate secret
    if (!clientSecret) {
      throw new Error('Client secret required for confidential clients');
    }

    const isValidSecret = await bcrypt.compare(clientSecret, application.clientSecretHash);
    if (!isValidSecret) {
      return null;
    }

    return application;
  }

  /**
   * Generate authorization code
   * 10-minute expiry following OAuth 2.0 recommendations
   */
  async createAuthorizationCode(params: {
    applicationId: string;
    userId: string;
    teamId: string;
    scopes: string[];
    redirectUri: string;
    codeChallenge?: string;
    codeChallengeMethod?: string;
  }): Promise<OAuthAuthorizationCode> {
    const {
      applicationId,
      userId,
      teamId,
      scopes,
      redirectUri,
      codeChallenge,
      codeChallengeMethod,
    } = params;

    // Generate secure authorization code
    const code = crypto.randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const authCode: OAuthAuthorizationCode = {
      id: crypto.randomUUID(),
      code,
      applicationId,
      userId,
      teamId,
      scopes,
      redirectUri,
      expiresAt,
      createdAt: new Date(),
      used: false,
      codeChallenge,
      codeChallengeMethod,
    };

    // TODO: Save to database
    // const { error } = await supabase
    //   .from('oauth_authorization_codes')
    //   .insert([authCode]);

    return authCode;
  }

  /**
   * Exchange authorization code for access token
   * Following OAuth 2.0 specification
   */
  async exchangeAuthorizationCode(params: {
    code: string;
    redirectUri: string;
    applicationId: string;
    codeVerifier?: string;
  }): Promise<{
    accessToken: string;
    tokenType: 'Bearer';
    expiresIn: number;
    refreshToken?: string;
    scopes: string[];
  }> {
    const { code, redirectUri, applicationId, codeVerifier } = params;

    // TODO: Get authorization code from database
    // const { data: authCode } = await supabase
    //   .from('oauth_authorization_codes')
    //   .select('*')
    //   .eq('code', code)
    //   .eq('application_id', applicationId)
    //   .eq('used', false)
    //   .single();

    const authCode: any = null; // Placeholder

    if (!authCode) {
      throw new Error('Invalid authorization code');
    }

    if (new Date() > new Date(authCode.expiresAt)) {
      throw new Error('Authorization code expired');
    }

    if (authCode.redirectUri !== redirectUri) {
      throw new Error('redirect_uri does not match');
    }

    // Validate PKCE if required
    if (authCode.codeChallenge) {
      if (!codeVerifier) {
        throw new Error('code_verifier required for PKCE');
      }
      
      let challenge: string;
      if (authCode.codeChallengeMethod === 'S256') {
        challenge = crypto
          .createHash('sha256')
          .update(codeVerifier)
          .digest('base64url');
      } else {
        challenge = codeVerifier;
      }

      if (challenge !== authCode.codeChallenge) {
        throw new Error('Invalid code_verifier');
      }
    }

    // Generate access token
    const accessToken = `faw_access_token_${crypto.randomBytes(32).toString('base64url')}`;
    const refreshToken = `faw_refresh_${crypto.randomBytes(32).toString('base64url')}`;
    const expiresIn = 3600; // 1 hour
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    const refreshTokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Mark authorization code as used
    // TODO: Update authorization code and create access token in database

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn,
      refreshToken,
      scopes: authCode.scopes,
    };
  }

  /**
   * Validate OAuth access token
   * Used by middleware to authenticate API requests
   */
  async validateAccessToken(token: string): Promise<OAuthAccessToken | null> {
    if (!token.startsWith('faw_access_token_')) {
      return null;
    }

    // TODO: Get token from database
    // const { data: accessToken } = await supabase
    //   .from('oauth_access_tokens')
    //   .select('*')
    //   .eq('token', token)
    //   .eq('revoked', false)
    //   .single();

    const accessToken: any = null; // Placeholder

    if (!accessToken) {
      return null;
    }

    if (new Date() > new Date(accessToken.expiresAt)) {
      return null;
    }

    // Update last used timestamp
    // TODO: Update last_used_at in database

    return accessToken;
  }

  /**
   * Revoke access token or refresh token
   */
  async revokeToken(params: {
    token: string;
    applicationId: string;
  }): Promise<void> {
    const { token, applicationId } = params;

    // TODO: Update token in database
    // const { error } = await supabase
    //   .from('oauth_access_tokens')
    //   .update({
    //     revoked: true,
    //     revoked_at: new Date().toISOString(),
    //   })
    //   .or(`token.eq.${token},refresh_token.eq.${token}`)
    //   .eq('application_id', applicationId);
  }
}

// Export singleton instance
export const oauthApplicationService = new OAuthApplicationService();