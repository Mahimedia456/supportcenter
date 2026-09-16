
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ZendeskService } from './zendesk.service';

type Slug = 'atomos' | 'angelbird';

@Injectable()
export class ZendeskCacheService {
  constructor(
    private readonly db: DatabaseService,
    private readonly zendesk: ZendeskService,
  ) {}

  async snapshot(slug: Slug) {
    const result = await this.db.query(
      `select
         workspace_slug,
         tickets,
         forms,
         fields,
         groups,
         agents,
         satisfaction,
         metrics,
         metric_events,
         synced_at,
         sync_status,
         last_error
       from public.zendesk_cache_snapshots
       where workspace_slug=$1
       limit 1`,
      [slug],
    );

    const row = result.rows[0];

    if (!row) {
      return {
        workspace: slug,
        scopeDays: 90,
        tickets: [],
        forms: [],
        fields: [],
        groups: [],
        agents: [],
        satisfaction: [],
        metrics: [],
        metricEvents: [],
        syncedAt: null,
        syncStatus: 'never',
        lastError: null,
      };
    }

    return {
      workspace: row.workspace_slug,
      scopeDays: 90,
      tickets: row.tickets || [],
      forms: row.forms || [],
      fields: row.fields || [],
      groups: row.groups || [],
      agents: row.agents || [],
      satisfaction: row.satisfaction || [],
      metrics: row.metrics || [],
      metricEvents: row.metric_events || [],
      syncedAt: row.synced_at || null,
      syncStatus: row.sync_status || 'unknown',
      lastError: row.last_error || null,
    };
  }

  async sync(
    workspaceId: string,
    slug: Slug,
  ) {
    await this.upsertStatus(slug, 'syncing', null);

    try {
      const [
        ticketResult,
        formResult,
        fieldResult,
        groupResult,
        agentResult,
        ratingResult,
        metricResult,
        eventResult,
      ] = await Promise.allSettled([
        this.zendesk.analyticsTickets(workspaceId, 90, false),
        this.zendesk.forms(workspaceId),
        this.zendesk.fields(workspaceId),
        this.zendesk.groups(workspaceId),
        this.zendesk.agents(workspaceId),
        this.zendesk.satisfaction(workspaceId, 90),
        this.zendesk.ticketMetrics(workspaceId, 90),
        this.zendesk.metricEvents(workspaceId, 30),
      ]);

      const current = await this.snapshot(slug);

      const resolved = <T>(
        item: PromiseSettledResult<T>,
        fallback: T,
      ): T =>
        item.status === 'fulfilled'
          ? item.value
          : fallback;

      const tickets = resolved(
        ticketResult,
        { tickets: current.tickets } as any,
      ) as any;

      const forms = resolved(
        formResult,
        { ticket_forms: current.forms } as any,
      ) as any;

      const fields = resolved(
        fieldResult,
        { ticket_fields: current.fields } as any,
      ) as any;

      const groups = resolved(
        groupResult,
        { groups: current.groups } as any,
      ) as any;

      const agents = resolved(
        agentResult,
        { users: current.agents } as any,
      ) as any;

      const ratings = resolved(
        ratingResult,
        { ratings: current.satisfaction } as any,
      ) as any;

      const metrics = resolved(
        metricResult,
        { metrics: current.metrics } as any,
      ) as any;

      const events = resolved(
        eventResult,
        { events: current.metricEvents } as any,
      ) as any;

      const failures = [
        ticketResult,
        formResult,
        fieldResult,
        groupResult,
        agentResult,
        ratingResult,
        metricResult,
        eventResult,
      ]
        .filter((item) => item.status === 'rejected')
        .map((item: any) => item.reason?.message || 'Zendesk source failed');

      const now = new Date().toISOString();

      await this.db.query(
        `insert into public.zendesk_cache_snapshots (
           workspace_slug,
           tickets,
           forms,
           fields,
           groups,
           agents,
           satisfaction,
           metrics,
           metric_events,
           synced_at,
           sync_status,
           last_error,
           updated_at
         ) values (
           $1,$2::jsonb,$3::jsonb,$4::jsonb,$5::jsonb,$6::jsonb,
           $7::jsonb,$8::jsonb,$9::jsonb,$10,$11,$12,now()
         )
         on conflict (workspace_slug)
         do update set
           tickets=excluded.tickets,
           forms=excluded.forms,
           fields=excluded.fields,
           groups=excluded.groups,
           agents=excluded.agents,
           satisfaction=excluded.satisfaction,
           metrics=excluded.metrics,
           metric_events=excluded.metric_events,
           synced_at=excluded.synced_at,
           sync_status=excluded.sync_status,
           last_error=excluded.last_error,
           updated_at=now()`,
        [
          slug,
          JSON.stringify(tickets.tickets || []),
          JSON.stringify(forms.ticket_forms || []),
          JSON.stringify(fields.ticket_fields || []),
          JSON.stringify(groups.groups || []),
          JSON.stringify(agents.users || []),
          JSON.stringify(ratings.ratings || []),
          JSON.stringify(metrics.metrics || []),
          JSON.stringify(events.events || []),
          now,
          failures.length ? 'partial' : 'ok',
          failures.length ? failures.join(' | ').slice(0, 2000) : null,
        ],
      );

      return this.snapshot(slug);
    } catch (error: any) {
      await this.upsertStatus(
        slug,
        'error',
        error?.message || 'Sync failed',
      );
      throw error;
    }
  }

  private async upsertStatus(
    slug: Slug,
    status: string,
    error: string | null,
  ) {
    await this.db.query(
      `insert into public.zendesk_cache_snapshots (
         workspace_slug,
         sync_status,
         last_error,
         updated_at
       ) values ($1,$2,$3,now())
       on conflict (workspace_slug)
       do update set
         sync_status=excluded.sync_status,
         last_error=excluded.last_error,
         updated_at=now()`,
      [slug, status, error],
    );
  }
}
