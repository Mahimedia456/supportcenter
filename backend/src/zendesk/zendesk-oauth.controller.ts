import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  Res,
} from '@nestjs/common';
import type {
  Response,
} from 'express';
import { ZendeskOAuthService } from './zendesk-oauth.service';

@Controller('zendesk/oauth')
export class ZendeskOAuthController {
  constructor(
    private readonly oauth:
      ZendeskOAuthService,
  ) {}

  private slug(
    raw: string,
  ): 'atomos' | 'angelbird' {
    if (
      raw !== 'atomos' &&
      raw !== 'angelbird'
    ) {
      throw new BadRequestException(
        'Unknown Zendesk workspace.',
      );
    }

    return raw;
  }

  @Get(':workspace/start')
  start(
    @Param('workspace')
    workspace: string,
    @Res() res: Response,
  ) {
    const slug =
      this.slug(workspace);

    return res.redirect(
      302,
      this.oauth.authorizationUrl(
        slug,
      ),
    );
  }

  @Get(':workspace/status')
  status(
    @Param('workspace')
    workspace: string,
  ) {
    return this.oauth.status(
      this.slug(workspace),
    );
  }

  @Get('callback')
  async callback(
    @Query('code') code?: string,
    @Query('state') state?: string,
    @Query('error')
    error?: string,
    @Query('error_description')
    errorDescription?: string,
    @Res() res?: Response,
  ) {
    if (error) {
      return res?.status(400).send(
        this.page(
          'Authorization cancelled',
          errorDescription ||
            error,
          false,
        ),
      );
    }

    if (!code || !state) {
      return res?.status(400).send(
        this.page(
          'Authorization failed',
          'Zendesk did not return the required authorization code/state.',
          false,
        ),
      );
    }

    try {
      const slug =
        this.oauth.verifyState(
          state,
        );

      await this.oauth.exchangeCode(
        slug,
        code,
      );

      return res?.status(200).send(
        this.page(
          'Zendesk connected',
          `${
            slug === 'atomos'
              ? 'Atomos'
              : 'AngelBird'
          } OAuth authorization is complete. You can close this window and return to Support Command Center.`,
          true,
        ),
      );
    } catch (err: any) {
      return res?.status(400).send(
        this.page(
          'Authorization failed',
          err?.message ||
            'Unable to complete Zendesk OAuth.',
          false,
        ),
      );
    }
  }

  private page(
    title: string,
    message: string,
    success: boolean,
  ) {
    const accent = success
      ? '#0A7B61'
      : '#C84B4B';

    return `<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${title}</title>
</head>
<body style="margin:0;background:#F7FBF9;font-family:Arial,sans-serif;color:#102321;">
<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box;">
<div style="max-width:520px;width:100%;background:#fff;border:1px solid #DCE9E4;border-radius:24px;padding:32px;box-shadow:0 12px 36px rgba(11,59,49,.08);">
<div style="width:54px;height:54px;border-radius:16px;background:${success ? '#E7F6F0' : '#FFF0F0'};display:flex;align-items:center;justify-content:center;color:${accent};font-size:26px;font-weight:900;">${success ? '✓' : '!'}</div>
<h1 style="font-size:26px;margin:20px 0 8px;">${title}</h1>
<p style="line-height:1.6;color:#516A66;">${message}</p>
</div>
</div>
</body>
</html>`;
  }
}
