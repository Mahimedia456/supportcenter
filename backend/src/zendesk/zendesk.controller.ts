import {
  Controller,
  Get,
  Headers,
  Param,
  Query,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { ZendeskService } from './zendesk.service';

@Controller('zendesk')
export class ZendeskController {
  constructor(
    private readonly auth: AuthService,
    private readonly zendesk: ZendeskService,
  ) {}

  private access(header?: string) {
    return this.auth.verifyAccess(header);
  }

  @Get('health')
  health(@Headers('authorization') header?: string) {
    const payload = this.access(header);
    return this.zendesk.health(payload.workspaceId);
  }

  @Get('views')
  views(@Headers('authorization') header?: string) {
    const payload = this.access(header);
    return this.zendesk.views(payload.workspaceId);
  }

  @Get('views/:id/tickets')
  viewTickets(
    @Param('id') id: string,
    @Headers('authorization') header?: string,
  ) {
    const payload = this.access(header);
    return this.zendesk.viewTickets(
      payload.workspaceId,
      id,
    );
  }

  @Get('tickets')
  tickets(@Headers('authorization') header?: string) {
    const payload = this.access(header);
    return this.zendesk.tickets(payload.workspaceId);
  }

  @Get('analytics/tickets')
  analyticsTickets(
    @Query('days') daysRaw: string | undefined,
    @Query('scope') scope: string | undefined,
    @Headers('authorization') header?: string,
  ) {
    const payload = this.access(header);

    const parsed = Number(daysRaw || 90);
    const days = Number.isFinite(parsed)
      ? Math.max(
          1,
          Math.min(3650, Math.floor(parsed)),
        )
      : 90;

    return this.zendesk.analyticsTickets(
      payload.workspaceId,
      days,
      scope === 'all',
    );
  }

  @Get('ticket-metrics')
  ticketMetrics(
    @Query('days') daysRaw: string | undefined,
    @Headers('authorization') header?: string,
  ) {
    const payload = this.access(header);
    const parsed = Number(daysRaw || 90);
    const days = Number.isFinite(parsed)
      ? Math.max(
          1,
          Math.min(365, Math.floor(parsed)),
        )
      : 90;

    return this.zendesk.ticketMetrics(
      payload.workspaceId,
      days,
    );
  }

  @Get('metric-events')
  metricEvents(
    @Query('days') daysRaw: string | undefined,
    @Headers('authorization') header?: string,
  ) {
    const payload = this.access(header);
    const parsed = Number(daysRaw || 30);
    const days = Number.isFinite(parsed)
      ? Math.max(
          1,
          Math.min(90, Math.floor(parsed)),
        )
      : 30;

    return this.zendesk.metricEvents(
      payload.workspaceId,
      days,
    );
  }

  @Get('satisfaction')
  satisfaction(
    @Query('days') daysRaw: string | undefined,
    @Headers('authorization') header?: string,
  ) {
    const payload = this.access(header);
    const parsed = Number(daysRaw || 90);
    const days = Number.isFinite(parsed)
      ? Math.max(
          1,
          Math.min(365, Math.floor(parsed)),
        )
      : 90;

    return this.zendesk.satisfaction(
      payload.workspaceId,
      days,
    );
  }

  @Get('forms')
  forms(@Headers('authorization') header?: string) {
    const payload = this.access(header);
    return this.zendesk.forms(payload.workspaceId);
  }

  @Get('fields')
  fields(@Headers('authorization') header?: string) {
    const payload = this.access(header);
    return this.zendesk.fields(payload.workspaceId);
  }

  @Get('groups')
  groups(@Headers('authorization') header?: string) {
    const payload = this.access(header);
    return this.zendesk.groups(payload.workspaceId);
  }

  @Get('agents')
  agents(@Headers('authorization') header?: string) {
    const payload = this.access(header);
    return this.zendesk.agents(payload.workspaceId);
  }

  @Get('tickets/:id')
  ticket(
    @Param('id') id: string,
    @Headers('authorization') header?: string,
  ) {
    const payload = this.access(header);
    return this.zendesk.ticket(
      payload.workspaceId,
      id,
    );
  }
}
