import { Module } from '@nestjs/common';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { DatabaseService } from './database/database.service';
import { WorkspaceService } from './workspaces/workspace.service';
import { HealthController } from './health.controller';
import { ZendeskController } from './zendesk/zendesk.controller';
import { ZendeskService } from './zendesk/zendesk.service';
@Module({controllers:[HealthController,AuthController,ZendeskController],providers:[DatabaseService,WorkspaceService,AuthService,ZendeskService]}) export class AppModule{}
