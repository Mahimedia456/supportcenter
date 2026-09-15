import { Module } from '@nestjs/common';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { DatabaseService } from './database/database.service';
import { WorkspaceService } from './workspaces/workspace.service';
import { HealthController } from './health.controller';
import { ZendeskController } from './zendesk/zendesk.controller';
import { ZendeskOAuthController } from './zendesk/zendesk-oauth.controller';
import { ZendeskService } from './zendesk/zendesk.service';
import { ZendeskOAuthService } from './zendesk/zendesk-oauth.service';

@Module({
  controllers: [
    HealthController,
    AuthController,
    ZendeskController,
    ZendeskOAuthController,
  ],
  providers: [
    DatabaseService,
    WorkspaceService,
    AuthService,
    ZendeskOAuthService,
    ZendeskService,
  ],
})
export class AppModule {}
