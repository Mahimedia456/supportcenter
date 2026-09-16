
import {
  Controller,
  Get,
  Headers,
  Post,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { WorkspaceService } from '../workspaces/workspace.service';
import { ZendeskCacheService } from './zendesk-cache.service';

@Controller('zendesk/cache')
export class ZendeskCacheController {
  constructor(
    private readonly auth: AuthService,
    private readonly workspaces: WorkspaceService,
    private readonly cache: ZendeskCacheService,
  ) {}

  private async context(header?: string) {
    const payload = this.auth.verifyAccess(header);
    const workspace = await this.workspaces.byId(payload.workspaceId);

    if (!workspace) {
      throw new Error('Workspace not found');
    }

    if (
      workspace.slug !== 'atomos' &&
      workspace.slug !== 'angelbird'
    ) {
      throw new Error('Unsupported workspace');
    }

    return {
      workspaceId: payload.workspaceId,
      slug: workspace.slug as 'atomos' | 'angelbird',
    };
  }

  @Get('snapshot')
  async snapshot(
    @Headers('authorization') header?: string,
  ) {
    const ctx = await this.context(header);
    return this.cache.snapshot(ctx.slug);
  }

  @Post('sync')
  async sync(
    @Headers('authorization') header?: string,
  ) {
    const ctx = await this.context(header);
    return this.cache.sync(ctx.workspaceId, ctx.slug);
  }
}
