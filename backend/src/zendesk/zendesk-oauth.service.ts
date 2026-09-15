import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'crypto';
import { DatabaseService } from '../database/database.service';

type Slug = 'angelbird' | 'atomos';

type StoredTokenRow = {
  workspace_slug: Slug;
  access_token_enc: string;
  refresh_token_enc: string | null;
  expires_at: string | null;
  refresh_token_expires_at: string | null;
  scope: string | null;
  token_type: string | null;
  updated_at: string;
};

type OAuthEnv = {
  subdomain: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string;
};

@Injectable()
export class ZendeskOAuthService {
  constructor(
    private readonly db: DatabaseService,
  ) {}

  private prefix(slug: Slug) {
    return slug === 'atomos'
      ? 'ATOMOS'
      : 'ANGELBIRD';
  }

  private env(slug: Slug): OAuthEnv | null {
    const prefix = this.prefix(slug);

    const subdomain = (
      process.env[
        `${prefix}_ZENDESK_SUBDOMAIN`
      ] || ''
    )
      .trim()
      .replace(/^https?:\/\//i, '')
      .replace(/\.zendesk\.com.*$/i, '')
      .replace(/\/$/, '');

    const clientId = (
      process.env[
        `${prefix}_ZENDESK_CLIENT_ID`
      ] || ''
    ).trim();

    const clientSecret = (
      process.env[
        `${prefix}_ZENDESK_CLIENT_SECRET`
      ] || ''
    ).trim();

    const redirectUri = (
      process.env[
        `${prefix}_ZENDESK_REDIRECT_URI`
      ] || ''
    ).trim();

    const scope = (
      process.env[
        `${prefix}_ZENDESK_OAUTH_SCOPE`
      ] || 'read'
    ).trim();

    if (
      !subdomain ||
      !clientId ||
      !clientSecret ||
      !redirectUri
    ) {
      return null;
    }

    return {
      subdomain,
      clientId,
      clientSecret,
      redirectUri,
      scope,
    };
  }

  configured(slug: Slug) {
    return Boolean(this.env(slug));
  }

  private encryptionKey() {
    const secret = (
      process.env.JWT_REFRESH_SECRET ||
      ''
    ).trim();

    if (!secret) {
      throw new Error(
        'JWT_REFRESH_SECRET is required for OAuth token encryption.',
      );
    }

    return createHash('sha256')
      .update(secret)
      .digest();
  }

  private encrypt(value: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv(
      'aes-256-gcm',
      this.encryptionKey(),
      iv,
    );

    const encrypted = Buffer.concat([
      cipher.update(
        value,
        'utf8',
      ),
      cipher.final(),
    ]);

    const tag =
      cipher.getAuthTag();

    return [
      iv.toString('base64url'),
      tag.toString('base64url'),
      encrypted.toString(
        'base64url',
      ),
    ].join('.');
  }

  private decrypt(value: string) {
    const [ivRaw, tagRaw, dataRaw] =
      value.split('.');

    if (
      !ivRaw ||
      !tagRaw ||
      !dataRaw
    ) {
      throw new Error(
        'Invalid encrypted OAuth token.',
      );
    }

    const decipher =
      createDecipheriv(
        'aes-256-gcm',
        this.encryptionKey(),
        Buffer.from(
          ivRaw,
          'base64url',
        ),
      );

    decipher.setAuthTag(
      Buffer.from(
        tagRaw,
        'base64url',
      ),
    );

    return Buffer.concat([
      decipher.update(
        Buffer.from(
          dataRaw,
          'base64url',
        ),
      ),
      decipher.final(),
    ]).toString('utf8');
  }

  private stateSecret(
    slug: Slug,
  ) {
    const env = this.env(slug);

    if (!env) {
      throw new BadRequestException(
        `OAuth is not configured for ${slug}.`,
      );
    }

    return env.clientSecret;
  }

  createState(slug: Slug) {
    const payload = Buffer.from(
      JSON.stringify({
        slug,
        ts: Date.now(),
        nonce:
          randomBytes(18).toString(
            'base64url',
          ),
      }),
    ).toString('base64url');

    const signature = createHmac(
      'sha256',
      this.stateSecret(slug),
    )
      .update(payload)
      .digest('base64url');

    return `${payload}.${signature}`;
  }

  verifyState(
    state: string,
  ): Slug {
    const [payload, signature] =
      String(state || '').split('.');

    if (
      !payload ||
      !signature
    ) {
      throw new BadRequestException(
        'Invalid OAuth state.',
      );
    }

    let parsed: {
      slug?: Slug;
      ts?: number;
    };

    try {
      parsed = JSON.parse(
        Buffer.from(
          payload,
          'base64url',
        ).toString('utf8'),
      );
    } catch {
      throw new BadRequestException(
        'Invalid OAuth state payload.',
      );
    }

    if (
      parsed.slug !== 'atomos' &&
      parsed.slug !== 'angelbird'
    ) {
      throw new BadRequestException(
        'Invalid OAuth workspace.',
      );
    }

    const expected = createHmac(
      'sha256',
      this.stateSecret(
        parsed.slug,
      ),
    )
      .update(payload)
      .digest();

    let provided: Buffer;

    try {
      provided = Buffer.from(
        signature,
        'base64url',
      );
    } catch {
      throw new BadRequestException(
        'Invalid OAuth signature.',
      );
    }

    if (
      expected.length !==
        provided.length ||
      !timingSafeEqual(
        expected,
        provided,
      )
    ) {
      throw new BadRequestException(
        'OAuth state verification failed.',
      );
    }

    if (
      !parsed.ts ||
      Date.now() -
        parsed.ts >
        10 * 60 * 1000
    ) {
      throw new BadRequestException(
        'OAuth authorization request expired.',
      );
    }

    return parsed.slug;
  }

  authorizationUrl(
    slug: Slug,
  ) {
    const env = this.env(slug);

    if (!env) {
      throw new BadRequestException(
        `OAuth environment variables are incomplete for ${slug}.`,
      );
    }

    const params =
      new URLSearchParams({
        response_type: 'code',
        client_id: env.clientId,
        redirect_uri:
          env.redirectUri,
        scope: env.scope,
        state: this.createState(
          slug,
        ),
      });

    return (
      `https://${env.subdomain}.zendesk.com` +
      `/oauth/authorizations/new?${params.toString()}`
    );
  }

  private async saveToken(
    slug: Slug,
    token: any,
  ) {
    if (!token?.access_token) {
      throw new Error(
        'Zendesk token response did not contain access_token.',
      );
    }

    const now = Date.now();

    const expiresAt =
      token.expires_in
        ? new Date(
            now +
              Number(
                token.expires_in,
              ) *
                1000,
          ).toISOString()
        : null;

    const refreshExpiresAt =
      token.refresh_token_expires_in
        ? new Date(
            now +
              Number(
                token.refresh_token_expires_in,
              ) *
                1000,
          ).toISOString()
        : null;

    await this.db.query(
      `insert into zendesk_oauth_tokens (
         workspace_slug,
         access_token_enc,
         refresh_token_enc,
         expires_at,
         refresh_token_expires_at,
         scope,
         token_type,
         updated_at
       ) values ($1,$2,$3,$4,$5,$6,$7,now())
       on conflict (workspace_slug)
       do update set
         access_token_enc=excluded.access_token_enc,
         refresh_token_enc=excluded.refresh_token_enc,
         expires_at=excluded.expires_at,
         refresh_token_expires_at=excluded.refresh_token_expires_at,
         scope=excluded.scope,
         token_type=excluded.token_type,
         updated_at=now()`,
      [
        slug,
        this.encrypt(
          String(
            token.access_token,
          ),
        ),
        token.refresh_token
          ? this.encrypt(
              String(
                token.refresh_token,
              ),
            )
          : null,
        expiresAt,
        refreshExpiresAt,
        token.scope || null,
        token.token_type ||
          'bearer',
      ],
    );
  }

  private async tokenRow(
    slug: Slug,
  ) {
    const result =
      await this.db.query<StoredTokenRow>(
        `select
           workspace_slug,
           access_token_enc,
           refresh_token_enc,
           expires_at,
           refresh_token_expires_at,
           scope,
           token_type,
           updated_at
         from zendesk_oauth_tokens
         where workspace_slug=$1
         limit 1`,
        [slug],
      );

    return (
      result.rows[0] || null
    );
  }

  async exchangeCode(
    slug: Slug,
    code: string,
  ) {
    const env = this.env(slug);

    if (!env) {
      throw new BadRequestException(
        `OAuth is not configured for ${slug}.`,
      );
    }

    const response = await fetch(
      `https://${env.subdomain}.zendesk.com/oauth/tokens`,
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/json',
          Accept:
            'application/json',
        },
        body: JSON.stringify({
          grant_type:
            'authorization_code',
          code,
          client_id:
            env.clientId,
          client_secret:
            env.clientSecret,
          redirect_uri:
            env.redirectUri,
        }),
      },
    );

    const body: any =
      await response
        .json()
        .catch(() => ({}));

    if (
      !response.ok ||
      !body?.access_token
    ) {
      throw new BadRequestException(
        body?.error_description ||
          body?.error ||
          'Zendesk OAuth code exchange failed.',
      );
    }

    await this.saveToken(
      slug,
      body,
    );

    return {
      connected: true,
      slug,
      expiresIn:
        body.expires_in || null,
      scope:
        body.scope || null,
    };
  }

  private async refresh(
    slug: Slug,
    refreshToken: string,
  ) {
    const env = this.env(slug);

    if (!env) {
      throw new Error(
        `OAuth environment is incomplete for ${slug}.`,
      );
    }

    const response = await fetch(
      `https://${env.subdomain}.zendesk.com/oauth/tokens`,
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/json',
          Accept:
            'application/json',
        },
        body: JSON.stringify({
          grant_type:
            'refresh_token',
          refresh_token:
            refreshToken,
          client_id:
            env.clientId,
          client_secret:
            env.clientSecret,
        }),
      },
    );

    const body: any =
      await response
        .json()
        .catch(() => ({}));

    if (
      !response.ok ||
      !body?.access_token
    ) {
      throw new Error(
        body?.error_description ||
          body?.error ||
          'Zendesk OAuth refresh failed.',
      );
    }

    await this.saveToken(
      slug,
      body,
    );

    return String(
      body.access_token,
    );
  }

  async accessToken(
    slug: Slug,
  ) {
    if (!this.configured(slug)) {
      return null;
    }

    const row =
      await this.tokenRow(slug);

    if (!row) {
      return null;
    }

    const expiresAt =
      row.expires_at
        ? new Date(
            row.expires_at,
          ).getTime()
        : Number.POSITIVE_INFINITY;

    if (
      expiresAt -
        Date.now() >
      60_000
    ) {
      return this.decrypt(
        row.access_token_enc,
      );
    }

    if (
      !row.refresh_token_enc
    ) {
      return null;
    }

    const refreshExpiry =
      row.refresh_token_expires_at
        ? new Date(
            row.refresh_token_expires_at,
          ).getTime()
        : Number.POSITIVE_INFINITY;

    if (
      refreshExpiry <=
      Date.now()
    ) {
      return null;
    }

    return this.refresh(
      slug,
      this.decrypt(
        row.refresh_token_enc,
      ),
    );
  }

  async status(slug: Slug) {
    const row =
      await this.tokenRow(slug);

    return {
      configured:
        this.configured(slug),
      connected:
        Boolean(row),
      workspace: slug,
      expiresAt:
        row?.expires_at || null,
      refreshTokenExpiresAt:
        row?.refresh_token_expires_at ||
        null,
      scope:
        row?.scope || null,
      updatedAt:
        row?.updated_at || null,
    };
  }
}
