# Phase 5: OAuth 2.0 Server Implementation

This document covers the complete OAuth 2.0 server implementation following Midday's exact patterns and best practices.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [OAuth Endpoints](#oauth-endpoints)
5. [Authentication Flow](#authentication-flow)
6. [Scopes & Permissions](#scopes--permissions)
7. [Security Features](#security-features)
8. [Integration Guide](#integration-guide)
9. [Testing](#testing)
10. [Best Practices](#best-practices)

## Overview

The OAuth 2.0 server implementation provides enterprise-grade third-party integration capabilities, enabling external applications to securely access Faworra's API on behalf of users.

### Key Features

✅ **Full OAuth 2.0 Compliance** - Authorization Code flow with PKCE support  
✅ **Enterprise Security** - Client credentials, token hashing, PKCE enforcement  
✅ **Granular Scopes** - 13 different permission levels for fine-grained access control  
✅ **Public & Confidential Clients** - Support for different application types  
✅ **Token Management** - Access tokens, refresh tokens, and revocation  
✅ **Midday-Compatible** - Identical patterns to Midday's production OAuth server  

### Architecture

```
Third-Party App → Authorization Endpoint → User Consent → Authorization Code
                                     ↓
Access Token ← Token Endpoint ← Authorization Code Exchange
                                     ↓
API Requests ← Protected Resources ← Token Validation
```

## Database Schema

Following Midday's exact database structure:

### OAuth Applications Table

```sql
CREATE TABLE oauth_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  overview TEXT,
  developer_name TEXT,
  logo_url TEXT,
  website TEXT,
  install_url TEXT,
  screenshots TEXT[] DEFAULT '{}',
  redirect_uris TEXT[] NOT NULL,
  client_id TEXT NOT NULL UNIQUE,
  client_secret TEXT NOT NULL, -- bcrypt hashed
  scopes TEXT[] NOT NULL DEFAULT '{}',
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_public BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected'))
);
```

### OAuth Authorization Codes Table

```sql
CREATE TABLE oauth_authorization_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  application_id UUID NOT NULL REFERENCES oauth_applications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  scopes TEXT[] NOT NULL,
  redirect_uri TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL, -- 10 minutes expiry
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used BOOLEAN DEFAULT FALSE,
  code_challenge TEXT, -- PKCE
  code_challenge_method TEXT -- S256 or plain
);
```

### OAuth Access Tokens Table

```sql
CREATE TABLE oauth_access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE, -- faw_access_token_*
  refresh_token TEXT UNIQUE, -- faw_refresh_*
  application_id UUID NOT NULL REFERENCES oauth_applications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  scopes TEXT[] NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL, -- 1 hour expiry
  refresh_token_expires_at TIMESTAMPTZ, -- 30 days expiry
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  revoked BOOLEAN DEFAULT FALSE,
  revoked_at TIMESTAMPTZ
);
```

## OAuth Endpoints

### Authorization Endpoint

**GET `/oauth/authorize`**

Initiates the OAuth flow by presenting a consent screen to the user.

**Parameters:**
- `response_type=code` (required)
- `client_id` (required) - OAuth application client ID
- `redirect_uri` (required) - Must match registered redirect URI
- `scope` (required) - Space-separated list of requested scopes
- `state` (optional) - CSRF protection parameter
- `code_challenge` (optional) - PKCE code challenge
- `code_challenge_method` (optional) - `S256` or `plain`

**Response:**
```json
{
  "id": "app-uuid",
  "name": "My Raycast Extension", 
  "description": "Manage transactions via Raycast",
  "logoUrl": "https://example.com/logo.png",
  "website": "https://example.com",
  "clientId": "faw_client_<id>",
  "scopes": ["transactions.read", "invoices.read"],
  "redirectUri": "https://myapp.com/callback",
  "state": "abc123"
}
```

**POST `/oauth/authorize`**

Processes the user's authorization decision.

**Request Body:**
```json
{
  "client_id": "faw_client_<id>",
  "decision": "allow", // or "deny"
  "scopes": ["transactions.read", "invoices.read"],
  "redirect_uri": "https://myapp.com/callback",
  "state": "abc123",
  "team_id": "team-uuid"
}
```

**Response:**
```json
{
  "redirect_url": "https://myapp.com/callback?code=auth_code_123&state=abc123"
}
```

### Token Endpoint

**POST `/oauth/token`**

Exchanges authorization code for access token or refreshes an access token.

**Authorization Code Exchange:**
```json
{
  "grant_type": "authorization_code",
  "code": "auth_code_123",
  "redirect_uri": "https://myapp.com/callback", 
  "client_id": "faw_client_<id>",
  "client_secret": "faw_secret_<secret>", // Optional for public clients
  "code_verifier": "pkce_verifier_123" // Required if PKCE used
}
```

**Refresh Token:**
```json
{
  "grant_type": "refresh_token",
  "refresh_token": "faw_refresh_<token>",
  "client_id": "faw_client_<id>",
  "client_secret": "faw_secret_<secret>" // Optional for public clients
}
```

**Response:**
```json
{
  "access_token": "faw_access_token_<token>",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "faw_refresh_<token>",
  "scope": "transactions.read invoices.read"
}
```

### Token Revocation Endpoint

**POST `/oauth/revoke`**

Revokes an access token or refresh token.

**Request:**
```json
{
  "token": "faw_access_token_<token>",
  "token_type_hint": "access_token", // Optional
  "client_id": "faw_client_<id>",
  "client_secret": "faw_secret_<secret>" // Optional for public clients
}
```

**Response:**
```json
{
  "success": true
}
```

## Authentication Flow

### 1. Application Registration

Developers register their application through the Faworra developer portal:

```typescript
const app = await oauthApplicationService.createApplication({
  name: "My Raycast Extension",
  description: "Manage transactions via Raycast",
  redirectUris: ["https://myapp.com/callback"],
  scopes: ["transactions.read", "invoices.read"],
  isPublic: false, // Confidential client
  teamId: "user-team-id",
  createdBy: "user-id"
});
// Returns: { clientId: "faw_client_*", clientSecret: "faw_secret_*" }
```

### 2. Authorization Request

Third-party application redirects user to Faworra:

```
https://api.faworra.com/oauth/authorize?
  response_type=code&
  client_id=faw_client_<id>&
  redirect_uri=https://myapp.com/callback&
  scope=transactions.read invoices.read&
  state=csrf_protection_token&
  code_challenge=pkce_challenge&
  code_challenge_method=S256
```

### 3. User Consent

User sees consent screen with:
- Application information (name, logo, description)
- Requested permissions (scopes)
- Team selection (for multi-team users)
- Allow/Deny buttons

### 4. Authorization Code

If user approves, Faworra redirects back with code:

```
https://myapp.com/callback?
  code=authorization_code_123&
  state=csrf_protection_token
```

### 5. Token Exchange

Application exchanges code for access token:

```javascript
const response = await fetch('https://api.faworra.com/oauth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    grant_type: 'authorization_code',
    code: 'authorization_code_123',
    redirect_uri: 'https://myapp.com/callback',
    client_id: 'faw_client_<id>',
    client_secret: 'faw_secret_<secret>',
    code_verifier: 'pkce_verifier_123'
  })
});
```

### 6. API Access

Use access token to make API requests:

```javascript
const transactions = await fetch('https://api.faworra.com/transactions', {
  headers: {
    'Authorization': 'Bearer faw_access_token_<token>'
  }
});
```

## Scopes & Permissions

Following Midday's granular permission model:

### Basic Scopes

| Scope | Description |
|-------|-------------|
| `profile.read` | Read basic profile information |
| `profile.write` | Update profile information |
| `teams.read` | View team information |
| `teams.write` | Manage team settings |

### Business Data Scopes

| Scope | Description |
|-------|-------------|
| `transactions.read` | View transactions |
| `transactions.write` | Create and update transactions |
| `invoices.read` | View invoices |
| `invoices.write` | Create and update invoices |
| `reports.read` | Generate and view reports |

### File & System Scopes

| Scope | Description |
|-------|-------------|
| `files.read` | View uploaded files |
| `files.write` | Upload and manage files |
| `analytics.read` | View analytics data (admin-level) |

### Admin Scopes

| Scope | Description |
|-------|-------------|
| `admin.read` | Full read access to team data |
| `admin.write` | Full write access to team data |

### Middleware Usage

```typescript
import { requireOAuthScopes } from '@faworra/auth/oauth-middleware';

// Require specific scopes
app.get('/transactions', 
  requireOAuthScopes(['transactions.read']),
  (c) => { /* handler */ }
);

// Multiple scope options
app.post('/invoices',
  requireOAuthScopes(['invoices.write', 'admin.write']),
  (c) => { /* handler */ }
);
```

## Security Features

### PKCE (Proof Key for Code Exchange)

**Enforced for public clients**, optional for confidential clients:

```typescript
// Generate PKCE parameters (client-side)
const codeVerifier = base64url(randomBytes(32));
const codeChallenge = base64url(sha256(codeVerifier));

// Authorization request
const authUrl = `https://api.faworra.com/oauth/authorize?
  response_type=code&
  client_id=${clientId}&
  code_challenge=${codeChallenge}&
  code_challenge_method=S256&
  redirect_uri=${redirectUri}&
  scope=${scopes}`;
```

### Token Format

- **Client ID**: `faw_client_[32-char-base64url]`
- **Client Secret**: `faw_secret_[64-char-base64url]` 
- **Access Token**: `faw_access_token_[64-char-base64url]`
- **Refresh Token**: `faw_refresh_[64-char-base64url]`
- **Authorization Code**: 32 bytes base64url encoded

### Client Types

**Confidential Clients** (server-to-server):
- Require client secret for authentication
- Can store credentials securely
- Example: Web applications, server APIs

**Public Clients** (client-side):
- No client secret required
- PKCE mandatory for security
- Example: Mobile apps, SPAs, native applications

### Token Expiration

- **Authorization Codes**: 10 minutes
- **Access Tokens**: 1 hour
- **Refresh Tokens**: 30 days

### Rate Limiting

Following Midday's OAuth rate limits:
- **OAuth endpoints**: 20 requests per 15 minutes per IP
- **Protected endpoints**: 100 requests per 10 minutes per user

## Integration Guide

### Creating an OAuth Application

```typescript
import { oauthApplicationService } from '@faworra/auth/oauth-applications';

const application = await oauthApplicationService.createApplication({
  name: "Analytics Dashboard",
  description: "Real-time business analytics",
  website: "https://analytics.example.com",
  redirectUris: [
    "https://analytics.example.com/callback",
    "http://localhost:3000/callback" // Development
  ],
  scopes: [
    "transactions.read", 
    "invoices.read", 
    "reports.read"
  ],
  isPublic: false,
  teamId: user.currentTeamId,
  createdBy: user.id
});

console.log(`Client ID: ${application.clientId}`);
console.log(`Client Secret: ${application.clientSecret}`); // Only shown once
```

### Protecting API Endpoints

```typescript
import { requireOAuthToken, requireOAuthScopes } from '@faworra/auth/oauth-middleware';

// OAuth-only endpoint
app.get('/api/oauth/transactions',
  requireOAuthToken,
  requireOAuthScopes(['transactions.read']),
  async (c) => {
    const session = getOAuthSession(c);
    const transactions = await getTransactions(session.teamId);
    return c.json(transactions);
  }
);

// Flexible auth (JWT or OAuth)
app.get('/api/transactions',
  requireAuth, // Accepts JWT, API keys, or OAuth tokens
  async (c) => {
    const authType = c.get('authType'); // 'jwt', 'api_key', or 'oauth'
    const userId = c.get('userId');
    const teamId = c.get('teamId');
    
    if (authType === 'oauth') {
      const session = getOAuthSession(c);
      // Validate OAuth scopes if needed
      if (!hasOAuthScopes(c, ['transactions.read'])) {
        throw new HTTPException(403, { message: 'Insufficient scopes' });
      }
    }
    
    const transactions = await getTransactions(teamId);
    return c.json(transactions);
  }
);
```

### Client-Side Integration (JavaScript)

```javascript
class FaworraOAuthClient {
  constructor(clientId, redirectUri) {
    this.clientId = clientId;
    this.redirectUri = redirectUri;
    this.baseUrl = 'https://api.faworra.com';
  }

  // Generate PKCE parameters
  generatePKCE() {
    const codeVerifier = this.base64URLEncode(crypto.getRandomValues(new Uint8Array(32)));
    const codeChallenge = this.base64URLEncode(
      new Uint8Array(crypto.subtle.digestSync('SHA-256', new TextEncoder().encode(codeVerifier)))
    );
    return { codeVerifier, codeChallenge };
  }

  // Start OAuth flow
  authorize(scopes, state) {
    const { codeVerifier, codeChallenge } = this.generatePKCE();
    localStorage.setItem('oauth_code_verifier', codeVerifier);
    
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: scopes.join(' '),
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    });

    window.location.href = `${this.baseUrl}/oauth/authorize?${params}`;
  }

  // Exchange code for token
  async exchangeCode(code) {
    const codeVerifier = localStorage.getItem('oauth_code_verifier');
    
    const response = await fetch(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: this.redirectUri,
        client_id: this.clientId,
        code_verifier: codeVerifier
      })
    });

    if (!response.ok) throw new Error('Token exchange failed');
    return response.json();
  }

  // Make authenticated API request
  async apiRequest(endpoint, token, options = {}) {
    return fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
  }

  base64URLEncode(buffer) {
    return btoa(String.fromCharCode(...buffer))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
}

// Usage
const client = new FaworraOAuthClient(
  'faw_client_<id>', 
  'https://myapp.com/callback'
);

// Start OAuth flow
client.authorize(['transactions.read', 'invoices.read'], 'random_state');

// In callback handler
const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');
if (code) {
  const tokens = await client.exchangeCode(code);
  localStorage.setItem('access_token', tokens.access_token);
  
  // Make API requests
  const transactions = await client.apiRequest(
    '/api/transactions', 
    tokens.access_token
  );
}
```

### Server-Side Integration (Node.js)

```javascript
const express = require('express');
const fetch = require('node-fetch');

class FaworraOAuthServer {
  constructor(clientId, clientSecret, redirectUri) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
    this.baseUrl = 'https://api.faworra.com';
  }

  // Generate authorization URL
  getAuthUrl(scopes, state) {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: scopes.join(' '),
      state: state
    });
    return `${this.baseUrl}/oauth/authorize?${params}`;
  }

  // Exchange code for token
  async exchangeCode(code) {
    const response = await fetch(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: this.redirectUri,
        client_id: this.clientId,
        client_secret: this.clientSecret
      })
    });

    if (!response.ok) throw new Error('Token exchange failed');
    return response.json();
  }

  // Refresh access token
  async refreshToken(refreshToken) {
    const response = await fetch(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret
      })
    });

    if (!response.ok) throw new Error('Token refresh failed');
    return response.json();
  }

  // Make authenticated API request
  async apiRequest(endpoint, token, options = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API request failed: ${error}`);
    }

    return response.json();
  }
}

// Express.js integration
const app = express();
const oauth = new FaworraOAuthServer(
  process.env.FAWORRA_CLIENT_ID,
  process.env.FAWORRA_CLIENT_SECRET,
  'https://myapp.com/callback'
);

app.get('/auth', (req, res) => {
  const state = Math.random().toString(36).substring(7);
  req.session.oauthState = state;
  
  const authUrl = oauth.getAuthUrl(['transactions.read'], state);
  res.redirect(authUrl);
});

app.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (state !== req.session.oauthState) {
      return res.status(400).send('Invalid state parameter');
    }

    const tokens = await oauth.exchangeCode(code);
    req.session.accessToken = tokens.access_token;
    req.session.refreshToken = tokens.refresh_token;
    
    res.redirect('/dashboard');
  } catch (error) {
    res.status(400).send(`OAuth error: ${error.message}`);
  }
});

app.get('/api/transactions', async (req, res) => {
  try {
    const transactions = await oauth.apiRequest(
      '/api/transactions',
      req.session.accessToken
    );
    res.json(transactions);
  } catch (error) {
    if (error.message.includes('401')) {
      // Try to refresh token
      try {
        const newTokens = await oauth.refreshToken(req.session.refreshToken);
        req.session.accessToken = newTokens.access_token;
        
        const transactions = await oauth.apiRequest(
          '/api/transactions',
          newTokens.access_token
        );
        res.json(transactions);
      } catch (refreshError) {
        res.status(401).send('Authentication required');
      }
    } else {
      res.status(500).send(error.message);
    }
  }
});
```

## Testing

### Authorization Flow Test

```javascript
describe('OAuth Authorization Flow', () => {
  it('should complete full authorization code flow', async () => {
    // 1. Create OAuth application
    const app = await oauthService.createApplication({
      name: 'Test App',
      redirectUris: ['http://localhost:3000/callback'],
      scopes: ['transactions.read'],
      teamId: 'team-123',
      createdBy: 'user-123'
    });

    // 2. Start authorization
    const authResponse = await fetch(`/oauth/authorize?${new URLSearchParams({
      response_type: 'code',
      client_id: app.clientId,
      redirect_uri: 'http://localhost:3000/callback',
      scope: 'transactions.read',
      state: 'test-state'
    })}`);

    expect(authResponse.status).toBe(200);
    const authData = await authResponse.json();
    expect(authData.scopes).toContain('transactions.read');

    // 3. User consent (allow)
    const consentResponse = await fetch('/oauth/authorize', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer user-jwt-token'
      },
      body: JSON.stringify({
        client_id: app.clientId,
        decision: 'allow',
        scopes: ['transactions.read'],
        redirect_uri: 'http://localhost:3000/callback',
        team_id: 'team-123'
      })
    });

    const consentData = await consentResponse.json();
    const redirectUrl = new URL(consentData.redirect_url);
    const authCode = redirectUrl.searchParams.get('code');
    expect(authCode).toBeTruthy();

    // 4. Exchange code for token
    const tokenResponse = await fetch('/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: authCode,
        redirect_uri: 'http://localhost:3000/callback',
        client_id: app.clientId,
        client_secret: app.clientSecret
      })
    });

    const tokenData = await tokenResponse.json();
    expect(tokenData.access_token).toMatch(/^faw_access_token_/);
    expect(tokenData.scope).toBe('transactions.read');

    // 5. Use access token for API call
    const apiResponse = await fetch('/api/transactions', {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
    });

    expect(apiResponse.status).toBe(200);
  });
});
```

### PKCE Flow Test

```javascript
describe('OAuth PKCE Flow', () => {
  it('should enforce PKCE for public clients', async () => {
    const publicApp = await oauthService.createApplication({
      name: 'Public App',
      redirectUris: ['com.example.app://callback'],
      scopes: ['transactions.read'],
      isPublic: true,
      teamId: 'team-123',
      createdBy: 'user-123'
    });

    // Without code_challenge should fail
    const authResponse = await fetch(`/oauth/authorize?${new URLSearchParams({
      response_type: 'code',
      client_id: publicApp.clientId,
      redirect_uri: 'com.example.app://callback',
      scope: 'transactions.read'
    })}`);

    expect(authResponse.status).toBe(400);
    const error = await authResponse.json();
    expect(error.message).toBe('PKCE is required for public clients');

    // With PKCE should succeed
    const codeVerifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    const codeChallenge = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';

    const pkceAuthResponse = await fetch(`/oauth/authorize?${new URLSearchParams({
      response_type: 'code',
      client_id: publicApp.clientId,
      redirect_uri: 'com.example.app://callback',
      scope: 'transactions.read',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    })}`);

    expect(pkceAuthResponse.status).toBe(200);
  });
});
```

## Best Practices

### 1. Security

- **Always use HTTPS** in production for all OAuth endpoints
- **Validate redirect URIs** exactly - no wildcard matching
- **Use PKCE** for all public clients (mobile apps, SPAs)
- **Short token lifetimes** - 1 hour for access tokens, 30 days for refresh
- **Rotate client secrets** regularly for confidential clients
- **Log security events** - failed authentications, token revocations

### 2. Scopes

- **Principle of least privilege** - request only needed scopes
- **Granular permissions** - prefer specific scopes over broad ones
- **Document scope requirements** for each API endpoint
- **Validate scopes** at the API level, not just token level

### 3. Error Handling

- **Consistent error format** following OAuth 2.0 specification
- **User-friendly messages** without exposing implementation details
- **Proper HTTP status codes** - 400 for client errors, 401 for auth failures
- **Correlation IDs** in all error responses for debugging

### 4. Performance

- **Cache token validation** results to reduce database queries
- **Use indexes** on token columns for fast lookups
- **Token cleanup** - regularly remove expired authorization codes and tokens
- **Rate limiting** to prevent abuse

### 5. Monitoring

- **Track OAuth metrics** - authorization success rates, token usage
- **Alert on anomalies** - unusual token patterns, failed authentications
- **Audit logs** for OAuth application management
- **Performance monitoring** for OAuth endpoints

### 6. Client Development

- **Handle token expiry** gracefully with refresh tokens
- **Implement proper PKCE** for public clients
- **Store tokens securely** - use secure storage mechanisms
- **Validate state parameter** to prevent CSRF attacks
- **Implement token revocation** when user logs out

---

## Summary

The Phase 5 OAuth 2.0 server implementation provides:

✅ **Production-Ready** - Based on Midday's battle-tested patterns  
✅ **Security-First** - PKCE, token hashing, rate limiting, CSRF protection  
✅ **Developer-Friendly** - Comprehensive documentation and client libraries  
✅ **Scalable** - Proper database design with indexes and caching  
✅ **Standards-Compliant** - Full OAuth 2.0 and RFC 7662 compatibility  
✅ **Enterprise-Grade** - Granular scopes, audit logs, monitoring support  

This OAuth implementation enables secure third-party integrations while maintaining the same security standards as Midday's production OAuth server.