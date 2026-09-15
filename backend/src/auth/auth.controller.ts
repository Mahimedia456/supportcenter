import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  login(@Body() body: { email?: string; password?: string }) {
    if (!body.email || !body.password) {
      return Promise.reject(new Error('Email and password are required.'));
    }
    return this.auth.login(body.email, body.password);
  }

  @Post('refresh')
  refresh(@Body() body: { refreshToken?: string }) {
    if (!body.refreshToken) {
      return Promise.reject(new Error('Refresh token is required.'));
    }
    return this.auth.refresh(body.refreshToken);
  }

  @Post('logout')
  logout(@Body() body: { refreshToken?: string }) {
    if (!body.refreshToken) return { ok: true };
    return this.auth.logout(body.refreshToken);
  }

  @Get('me')
  me(@Headers('authorization') authorization?: string) {
    return this.auth.me(authorization);
  }
}
