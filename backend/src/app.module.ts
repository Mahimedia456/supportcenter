import { Module } from '@nestjs/common';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { DatabaseService } from './database/database.service';
import { WorkspaceService } from './workspaces/workspace.service';
import { HealthController } from './health.controller';
import { ZendeskController } from './zendesk/zendesk.controller';
import { ZendeskCacheController } from './zendesk/zendesk-cache.controller';
import { ZendeskOAuthController } from './zendesk/zendesk-oauth.controller';
import { ZendeskService } from './zendesk/zendesk.service';
import { ZendeskCacheService } from './zendesk/zendesk-cache.service';
import { ZendeskOAuthService } from './zendesk/zendesk-oauth.service';

@Module({
  controllers: [
    HealthController,
    AuthController,
    ZendeskController,
    ZendeskCacheController,
    ZendeskOAuthController,
  ],
  providers: [
    DatabaseService,
    WorkspaceService,
    AuthService,
    ZendeskOAuthService,
    ZendeskService,
    ZendeskCacheService,
  ],
})
export class AppModule {}
