import {
  BadGatewayException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WorkspaceService } from '../workspaces/workspace.service';
import { ZendeskOAuthService } from './zendesk-oauth.service';

type Slug = 'angelbird' | 'atomos';

type ZendeskConfig = {
  subdomain: string;
  authHeader: string;
  authMode: 'oauth' | 'api_token';
};

@Injectable()
export class ZendeskService {
  constructor(
    private readonly workspaces: WorkspaceService,
    private readonly oauth: ZendeskOAuthService,
  ) {}

  private apiTokenConfig(
    slug: Slug,
  ): ZendeskConfig | null {
    const prefix =
      slug === 'angelbird'
        ? 'ANGELBIRD'
        : 'ATOMOS';

    const raw = (
      process.env[
        `${prefix}_ZENDESK_SUBDOMAIN`
      ] || ''
    ).trim();

    const email = (
      process.env[
        `${prefix}_ZENDESK_EMAIL`
      ] || ''
    ).trim();

    const apiToken = (
      process.env[
        `${prefix}_ZENDESK_API_TOKEN`
      ] || ''
    ).trim();

    const subdomain = raw
      .replace(/^https?:\/\//i, '')
      .replace(/\.zendesk\.com.*$/i, '')
      .replace(/\/$/, '');

    if (
      !subdomain ||
      !email ||
      !apiToken
    ) {
      return null;
    }

    const basic = Buffer.from(
      `${email}/token:${apiToken}`,
    ).toString('base64');

    return {
      subdomain,
      authHeader: `Basic ${basic}`,
      authMode: 'api_token',
    };
  }

  private subdomain(slug: Slug) {
    const prefix =
      slug === 'angelbird'
        ? 'ANGELBIRD'
        : 'ATOMOS';

    return (
      process.env[
        `${prefix}_ZENDESK_SUBDOMAIN`
      ] || ''
    )
      .trim()
      .replace(/^https?:\/\//i, '')
      .replace(/\.zendesk\.com.*$/i, '')
      .replace(/\/$/, '');
  }

  private async authorization(
    slug: Slug,
  ): Promise<ZendeskConfig> {
    const subdomain =
      this.subdomain(slug);

    if (!subdomain) {
      throw new NotFoundException(
        `Zendesk subdomain is not configured for ${slug}.`,
      );
    }

    const oauthToken =
      await this.oauth.accessToken(
        slug,
      );

    if (oauthToken) {
      return {
        subdomain,
        authHeader:
          `Bearer ${oauthToken}`,
        authMode: 'oauth',
      };
    }

    const fallback =
      this.apiTokenConfig(slug);

    if (fallback) {
      return fallback;
    }

    throw new NotFoundException(
      `Zendesk OAuth is not connected and API-token fallback is not configured for ${slug}.`,
    );
  }

  private async slug(
    workspaceId: string,
  ): Promise<Slug> {
    const workspace =
      await this.workspaces.byId(workspaceId);

    if (!workspace) {
      throw new NotFoundException(
        'Workspace not found.',
      );
    }

    if (
      workspace.slug !== 'angelbird' &&
      workspace.slug !== 'atomos'
    ) {
      throw new NotFoundException(
        `Unsupported Zendesk workspace: ${workspace.slug}`,
      );
    }

    return workspace.slug as Slug;
  }

  private async call(
    workspaceId: string,
    path: string,
  ) {
    const slug =
      await this.slug(workspaceId);
    const config =
      await this.authorization(slug);

    const response = await fetch(
      `https://${config.subdomain}.zendesk.com${path}`,
      {
        headers: {
          Authorization: config.authHeader,
          Accept: 'application/json',
        },
      },
    );

    const body: any = await response
      .json()
      .catch(() => ({}));

    if (!response.ok) {
      throw new BadGatewayException(
        body?.error ||
          body?.description ||
          body?.message ||
          `Zendesk request failed (${response.status})`,
      );
    }

    return {
      slug,
      body,
      authMode: config.authMode,
    };
  }

  private nextPath(value: unknown) {
    if (!value) return '';

    return String(value).replace(
      /^https?:\/\/[^/]+/i,
      '',
    );
  }

  async health(workspaceId: string) {
    const result = await this.call(
      workspaceId,
      '/api/v2/users/me.json',
    );

    return {
      ok: true,
      workspace: result.slug,
      account:
        result.body?.user?.email || null,
      role:
        result.body?.user?.role || null,
      authMode: result.authMode,
    };
  }

  async views(workspaceId: string) {
    return (
      await this.call(
        workspaceId,
        '/api/v2/views.json?active=true',
      )
    ).body;
  }

  async viewTickets(
    workspaceId: string,
    id: string,
  ) {
    return (
      await this.call(
        workspaceId,
        `/api/v2/views/${encodeURIComponent(
          id,
        )}/tickets.json`,
      )
    ).body;
  }

  async tickets(workspaceId: string) {
    return (
      await this.call(
        workspaceId,
        '/api/v2/tickets.json?sort_by=updated_at&sort_order=desc&per_page=100',
      )
    ).body;
  }

  async analyticsTickets(
    workspaceId: string,
    days: number,
    all = false,
  ) {
    const start = new Date(
      Date.now() -
        days * 24 * 60 * 60 * 1000,
    )
      .toISOString()
      .slice(0, 10);

    const search = all
      ? 'type:ticket'
      : `type:ticket created>=${start}`;

    const query =
      encodeURIComponent(search);

    const tickets: any[] = [];
    const maxPages = 10;

    for (
      let page = 1;
      page <= maxPages;
      page += 1
    ) {
      const path =
        `/api/v2/search.json?query=${query}` +
        `&sort_by=created_at&sort_order=desc` +
        `&per_page=100&page=${page}`;

      const result =
        await this.call(workspaceId, path);

      const rows = Array.isArray(
        result.body?.results,
      )
        ? result.body.results
        : [];

      tickets.push(
        ...rows.filter(
          (item: any) =>
            item?.result_type ===
              'ticket' ||
            item?.status ||
            item?.custom_fields,
        ),
      );

      if (
        rows.length < 100 ||
        !result.body?.next_page
      ) {
        break;
      }
    }

    return {
      days,
      scope: all ? 'all' : 'period',
      tickets,
      count: tickets.length,
      limited: tickets.length >= 1000,
    };
  }

  async ticketMetrics(
    workspaceId: string,
    days: number,
  ) {
    const startMs =
      Date.now() -
      days * 24 * 60 * 60 * 1000;

    const metrics: any[] = [];

    for (
      let page = 1;
      page <= 20;
      page += 1
    ) {
      const result =
        await this.call(
          workspaceId,
          `/api/v2/ticket_metrics.json?per_page=100&page=${page}`,
        );

      const rows = Array.isArray(
        result.body?.ticket_metrics,
      )
        ? result.body.ticket_metrics
        : [];

      let stop = false;

      for (const row of rows) {
        const created = new Date(
          row?.created_at || 0,
        ).getTime();

        if (
          Number.isFinite(created) &&
          created < startMs
        ) {
          stop = true;
          continue;
        }

        metrics.push(row);
      }

      if (
        stop ||
        rows.length < 100 ||
        !result.body?.next_page
      ) {
        break;
      }
    }

    return {
      days,
      metrics,
      count: metrics.length,
      limited: metrics.length >= 2000,
    };
  }

  async metricEvents(
    workspaceId: string,
    days: number,
  ) {
    const startTime = Math.floor(
      (Date.now() -
        days * 24 * 60 * 60 * 1000) /
        1000,
    );

    const events: any[] = [];
    let path =
      '/api/v2/incremental/ticket_metric_events' +
      `?start_time=${startTime}` +
      '&exclude_deleted=true';

    try {
      for (
        let page = 0;
        page < 20 && path;
        page += 1
      ) {
        const result =
          await this.call(
            workspaceId,
            path,
          );

        const rows = Array.isArray(
          result.body
            ?.ticket_metric_events,
        )
          ? result.body
              .ticket_metric_events
          : [];

        events.push(
          ...rows.filter(
            (event: any) =>
              event?.deleted !== true,
          ),
        );

        if (
          result.body?.end_of_stream ===
          true
        ) {
          break;
        }

        path = this.nextPath(
          result.body?.next_page ||
            result.body?.links?.next,
        );
      }

      return {
        available: true,
        days,
        events,
        count: events.length,
        limited: events.length >= 2000,
      };
    } catch (error: any) {
      // Metric Events is admin-only in Zendesk.
      // Don't break the whole manager app if this
      // endpoint isn't allowed for a token user.
      return {
        available: false,
        days,
        events: [],
        count: 0,
        limited: false,
        reason:
          error?.message ||
          'Metric Events unavailable for this Zendesk user.',
      };
    }
  }

  async satisfaction(
    workspaceId: string,
    days: number,
  ) {
    const startMs =
      Date.now() -
      days * 24 * 60 * 60 * 1000;

    const ratings: any[] = [];

    let path =
      '/api/v2/satisfaction_ratings.json' +
      '?sort_by=created_at&sort_order=desc&per_page=100';

    for (
      let page = 0;
      page < 20 && path;
      page += 1
    ) {
      const result =
        await this.call(
          workspaceId,
          path,
        );

      const rows = Array.isArray(
        result.body
          ?.satisfaction_ratings,
      )
        ? result.body
            .satisfaction_ratings
        : [];

      let stop = false;

      for (const rating of rows) {
        const created = new Date(
          rating?.created_at || 0,
        ).getTime();

        if (
          Number.isFinite(created) &&
          created < startMs
        ) {
          stop = true;
          continue;
        }

        ratings.push(rating);
      }

      if (
        stop ||
        !result.body?.next_page
      ) {
        break;
      }

      path = this.nextPath(
        result.body.next_page,
      );
    }

    return {
      days,
      ratings,
      count: ratings.length,
    };
  }

  async forms(workspaceId: string) {
    return (
      await this.call(
        workspaceId,
        '/api/v2/ticket_forms.json?active=true',
      )
    ).body;
  }

  async fields(workspaceId: string) {
    return (
      await this.call(
        workspaceId,
        '/api/v2/ticket_fields.json',
      )
    ).body;
  }

  async groups(workspaceId: string) {
    return (
      await this.call(
        workspaceId,
        '/api/v2/groups.json?per_page=100',
      )
    ).body;
  }

  async agents(workspaceId: string) {
    return (
      await this.call(
        workspaceId,
        '/api/v2/users.json?role[]=agent&role[]=admin&per_page=100',
      )
    ).body;
  }

  async ticket(
    workspaceId: string,
    id: string,
  ) {
    const encoded =
      encodeURIComponent(id);

    const [
      ticket,
      comments,
      metrics,
    ] = await Promise.all([
      this.call(
        workspaceId,
        `/api/v2/tickets/${encoded}.json`,
      ),
      this.call(
        workspaceId,
        `/api/v2/tickets/${encoded}/comments.json?sort=-created_at&per_page=100`,
      ),
      this.call(
        workspaceId,
        `/api/v2/tickets/${encoded}/metrics`,
      ).catch(() => ({
        body: {},
      } as any)),
    ]);

    return {
      ...ticket.body,
      ...comments.body,
      ...metrics.body,
    };
  }
}
