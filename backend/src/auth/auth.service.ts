import { Injectable, UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { DatabaseService } from '../database/database.service';
import { WorkspaceService } from '../workspaces/workspace.service';

type UserRow = {
  id: string;
  email: string;
  display_name: string;
  password_hash: string;
  is_active: boolean;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly workspaces: WorkspaceService,
  ) {}

  private accessSecret() {
    const value = process.env.JWT_ACCESS_SECRET;
    if (!value) throw new Error('JWT_ACCESS_SECRET is required');
    return value;
  }

  private refreshSecret() {
    const value = process.env.JWT_REFRESH_SECRET;
    if (!value) throw new Error('JWT_REFRESH_SECRET is required');
    return value;
  }

  private accessTtl() {
    return Number(process.env.ACCESS_TOKEN_TTL_SECONDS || 900);
  }

  private refreshTtlDays() {
    return Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30);
  }

  private hash(value: string) {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  private async findUser(email: string) {
    const result = await this.db.query<UserRow>(
      `select id, email, display_name, password_hash, is_active
       from users
       where lower(email) = lower($1)
       limit 1`,
      [email.trim()],
    );
    return result.rows[0] || null;
  }

  private signAccess(user: UserRow, workspaceId: string, role: string) {
    const ttl = this.accessTtl();
    return {
      token: jwt.sign(
        { sub: user.id, email: user.email, workspaceId, role, type: 'access' },
        this.accessSecret(),
        { expiresIn: ttl },
      ),
      expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
    };
  }

  private signRefresh(user: UserRow) {
    const days = this.refreshTtlDays();
    const token = jwt.sign(
      { sub: user.id, type: 'refresh', nonce: crypto.randomUUID() },
      this.refreshSecret(),
      { expiresIn: `${days}d` },
    );
    return {
      token,
      expiresAt: new Date(Date.now() + days * 86400_000),
    };
  }

  private async createSession(user: UserRow) {
    const workspace = await this.workspaces.forUser(user.id);
    if (!workspace) throw new UnauthorizedException('No active workspace assigned.');

    const access = this.signAccess(user, workspace.id, workspace.role);
    const refresh = this.signRefresh(user);

    await this.db.query(
      `insert into user_sessions
        (user_id, refresh_token_hash, expires_at, created_at)
       values ($1, $2, $3, now())`,
      [user.id, this.hash(refresh.token), refresh.expiresAt],
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: workspace.role,
      },
      workspace: {
        id: workspace.id,
        slug: workspace.slug,
        name: workspace.name,
        supportLabel: workspace.support_label,
      },
      accessToken: access.token,
      refreshToken: refresh.token,
      accessTokenExpiresAt: access.expiresAt,
    };
  }

  async login(email: string, password: string) {
    const user = await this.findUser(email);
    if (!user || !user.is_active) throw new UnauthorizedException('Invalid email or password.');

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) throw new UnauthorizedException('Invalid email or password.');

    return this.createSession(user);
  }

  async refresh(refreshToken: string) {
    let payload: any;
    try {
      payload = jwt.verify(refreshToken, this.refreshSecret());
    } catch {
      throw new UnauthorizedException('Session expired.');
    }

    if (payload?.type !== 'refresh' || !payload?.sub) {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    const tokenHash = this.hash(refreshToken);
    const session = await this.db.query<{ id: string; revoked_at: Date | null; expires_at: Date }>(
      `select id, revoked_at, expires_at
       from user_sessions
       where user_id = $1 and refresh_token_hash = $2
       limit 1`,
      [payload.sub, tokenHash],
    );

    const row = session.rows[0];
    if (!row || row.revoked_at || new Date(row.expires_at).getTime() <= Date.now()) {
      throw new UnauthorizedException('Session expired.');
    }

    await this.db.query(`update user_sessions set revoked_at = now() where id = $1`, [row.id]);

    const userResult = await this.db.query<UserRow>(
      `select id, email, display_name, password_hash, is_active from users where id = $1 limit 1`,
      [payload.sub],
    );
    const user = userResult.rows[0];
    if (!user || !user.is_active) throw new UnauthorizedException('Session expired.');

    return this.createSession(user);
  }

  async logout(refreshToken: string) {
    await this.db.query(
      `update user_sessions
       set revoked_at = coalesce(revoked_at, now())
       where refresh_token_hash = $1`,
      [this.hash(refreshToken)],
    );
    return { ok: true };
  }

  verifyAccess(authHeader?: string) {
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) throw new UnauthorizedException('Missing access token.');

    try {
      const payload = jwt.verify(token, this.accessSecret()) as any;
      if (payload?.type !== 'access') throw new Error();
      return payload;
    } catch {
      throw new UnauthorizedException('Access token expired or invalid.');
    }
  }

  async me(authHeader?: string) {
    const payload = this.verifyAccess(authHeader);
    const result = await this.db.query<UserRow>(
      `select id, email, display_name, password_hash, is_active from users where id = $1 limit 1`,
      [payload.sub],
    );
    const user = result.rows[0];
    if (!user || !user.is_active) throw new UnauthorizedException();

    const workspace = await this.workspaces.forUser(user.id);
    if (!workspace) throw new UnauthorizedException();

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: workspace.role,
      },
      workspace: {
        id: workspace.id,
        slug: workspace.slug,
        name: workspace.name,
        supportLabel: workspace.support_label,
      },
    };
  }
}
