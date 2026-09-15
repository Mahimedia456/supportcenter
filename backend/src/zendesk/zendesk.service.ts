import {
  BadGatewayException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WorkspaceService } from '../workspaces/workspace.service';

type Slug = 'angelbird' | 'atomos';

@Injectable()
export class ZendeskService {
  constructor(private readonly workspaces: WorkspaceService) {}

  private config(slug: Slug) {
    const prefix = slug === 'angelbird' ? 'ANGELBIRD' : 'ATOMOS';

    const raw = (process.env[`${prefix}_ZENDESK_SUBDOMAIN`] || '').trim();
    const email = (process.env[`${prefix}_ZENDESK_EMAIL`] || '').trim();
    const token = (process.env[`${prefix}_ZENDESK_API_TOKEN`] || '').trim();

    const subdomain = raw
      .replace(/^https?:\/\//i, '')
      .replace(/\.zendesk\.com.*$/i, '')
      .replace(/\/$/, '');

    if (!subdomain || !email || !token) {
      throw new NotFoundException(`Zendesk is not configured for ${slug}.`);
    }

    return { subdomain, email, token };
  }

  private async slug(workspaceId: string): Promise<Slug> {
    const workspace = await this.workspaces.byId(workspaceId);

    if (!workspace) {
      throw new NotFoundException('Workspace not found.');
    }

    if (workspace.slug !== 'angelbird' && workspace.slug !== 'atomos') {
      throw new NotFoundException(
        `Unsupported Zendesk workspace: ${workspace.slug}`,
      );
    }

    return workspace.slug as Slug;
  }

  private async call(workspaceId: string, path: string) {
    const slug = await this.slug(workspaceId);
    const config = this.config(slug);

    const auth = Buffer.from(
      `${config.email}/token:${config.token}`,
    ).toString('base64');

    const response = await fetch(
      `https://${config.subdomain}.zendesk.com${path}`,
      {
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: 'application/json',
        },
      },
    );

    const body: any = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new BadGatewayException(
        body?.error ||
          body?.description ||
          `Zendesk request failed (${response.status})`,
      );
    }

    return { slug, body };
  }

  async health(workspaceId: string) {
    const result = await this.call(workspaceId, '/api/v2/users/me.json');

    return {
      ok: true,
      workspace: result.slug,
      account: result.body?.user?.email || null,
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

  async viewTickets(workspaceId: string, id: string) {
    return (
      await this.call(
        workspaceId,
        `/api/v2/views/${encodeURIComponent(id)}/tickets.json`,
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

  async analyticsTickets(workspaceId: string, days: number) {
    const start = new Date(
      Date.now() - days * 24 * 60 * 60 * 1000,
    )
      .toISOString()
      .slice(0, 10);

    const query = encodeURIComponent(`type:ticket created>=${start}`);

    const tickets: any[] = [];
    const maxPages = 10;

    for (let page = 1; page <= maxPages; page += 1) {
      const path =
        `/api/v2/search.json?query=${query}` +
        `&sort_by=created_at&sort_order=desc` +
        `&per_page=100&page=${page}`;

      const result = await this.call(workspaceId, path);
      const rows = Array.isArray(result.body?.results)
        ? result.body.results
        : [];

      tickets.push(
        ...rows.filter(
          (item: any) =>
            item?.result_type === 'ticket' ||
            item?.via ||
            item?.status,
        ),
      );

      if (rows.length < 100 || !result.body?.next_page) {
        break;
      }
    }

    return {
      days,
      tickets,
      count: tickets.length,
      limited: tickets.length >= 1000,
    };
  }

  async satisfaction(workspaceId: string, days: number) {
    const startMs = Date.now() - days * 24 * 60 * 60 * 1000;
    const ratings: any[] = [];

    let path =
      '/api/v2/satisfaction_ratings.json' +
      '?sort_by=created_at&sort_order=desc&per_page=100';

    for (let page = 0; page < 10 && path; page += 1) {
      const result = await this.call(workspaceId, path);
      const rows = Array.isArray(result.body?.satisfaction_ratings)
        ? result.body.satisfaction_ratings
        : [];

      let stop = false;

      for (const rating of rows) {
        const created = new Date(rating?.created_at || 0).getTime();

        if (Number.isFinite(created) && created < startMs) {
          stop = true;
          continue;
        }

        ratings.push(rating);
      }

      if (stop || !result.body?.next_page) {
        break;
      }

      const next = String(result.body.next_page);
      path = next.replace(/^https?:\/\/[^/]+/i, '');
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

  async ticket(workspaceId: string, id: string) {
    const ticket = await this.call(
      workspaceId,
      `/api/v2/tickets/${encodeURIComponent(id)}.json`,
    );

    const comments = await this.call(
      workspaceId,
      `/api/v2/tickets/${encodeURIComponent(id)}/comments.json`,
    );

    return {
      ...ticket.body,
      ...comments.body,
    };
  }
}
