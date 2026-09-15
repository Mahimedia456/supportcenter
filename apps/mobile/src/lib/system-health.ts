import * as api from '@/lib/api';

export type HealthState = 'healthy' | 'warning' | 'offline';

export type SystemHealthSnapshot = {
  backend: {
    state: HealthState;
    label: string;
    detail: string;
  };
  zendesk: {
    state: HealthState;
    label: string;
    detail: string;
  };
  database: {
    state: HealthState;
    label: string;
    detail: string;
  };
  session: {
    state: HealthState;
    label: string;
    detail: string;
  };
  checkedAt: string;
};

function baseUrl() {
  return (
    process.env.EXPO_PUBLIC_API_BASE_URL ||
    'http://10.0.2.2:3000'
  ).replace(/\/$/, '');
}

export async function systemHealth(
  accessToken: string,
): Promise<SystemHealthSnapshot> {
  const checkedAt = new Date().toISOString();

  let backendState: HealthState = 'offline';
  let backendDetail = 'Backend did not respond.';
  let databaseState: HealthState = 'warning';
  let databaseDetail =
    'Database health is inferred from authenticated backend access.';

  try {
    const response = await fetch(`${baseUrl()}/health`);
    const body: any = await response.json().catch(() => ({}));

    if (response.ok && body?.ok !== false) {
      backendState = 'healthy';
      backendDetail =
        body?.service ||
        'Support Command Center API is responding.';
    } else {
      backendState = 'warning';
      backendDetail =
        body?.message || 'Backend health returned a warning.';
    }
  } catch {
    backendState = 'offline';
  }

  let zendeskState: HealthState = 'offline';
  let zendeskDetail = 'Zendesk did not respond.';

  try {
    const result = await api.zendeskHealth(accessToken);

    if (result.ok) {
      zendeskState = 'healthy';
      zendeskDetail = result.account
        ? `Connected as ${result.account}`
        : 'Zendesk connection is healthy.';
    } else {
      zendeskState = 'warning';
      zendeskDetail = 'Zendesk returned a warning state.';
    }
  } catch (error: any) {
    zendeskState = 'offline';
    zendeskDetail =
      error?.message || 'Zendesk health check failed.';
  }

  let sessionState: HealthState = 'offline';
  let sessionDetail = 'Authenticated session unavailable.';

  try {
    const current = await api.me(accessToken);

    if (current) {
      sessionState = 'healthy';
      sessionDetail = 'Authenticated manager session is valid.';

      // Authenticated /auth/me requires the app's database-backed auth stack,
      // so a successful call is also a practical DB connectivity indicator.
      databaseState = 'healthy';
      databaseDetail =
        'Database-backed authentication is responding.';
    }
  } catch (error: any) {
    sessionState = 'warning';
    sessionDetail =
      error?.message || 'Session validation failed.';

    if (backendState === 'healthy') {
      databaseState = 'warning';
      databaseDetail =
        'Backend is online, but database-backed session validation failed.';
    } else {
      databaseState = 'offline';
      databaseDetail =
        'Database state cannot be confirmed while backend is offline.';
    }
  }

  return {
    backend: {
      state: backendState,
      label: 'Backend API',
      detail: backendDetail,
    },
    zendesk: {
      state: zendeskState,
      label: 'Zendesk',
      detail: zendeskDetail,
    },
    database: {
      state: databaseState,
      label: 'Database',
      detail: databaseDetail,
    },
    session: {
      state: sessionState,
      label: 'Manager Session',
      detail: sessionDetail,
    },
    checkedAt,
  };
}
