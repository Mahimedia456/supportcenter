import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  router,
  type Href,
} from 'expo-router';
import { WorkspaceHeader } from '@/components/WorkspaceHeader';
import { AppCard } from '@/components/AppCard';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import * as api from '@/lib/api';
import {
  buildManagerAlerts,
  type ManagerAlert,
} from '@/lib/alerts';

type AlertFilter =
  | 'all'
  | 'critical'
  | 'warning'
  | 'info';

const FILTERS: Array<{
  key: AlertFilter;
  label: string;
}> = [
  { key: 'all', label: 'All' },
  { key: 'critical', label: 'Critical' },
  { key: 'warning', label: 'Warning' },
  { key: 'info', label: 'Info' },
];

export default function Alerts() {
  const { session, ensureFreshSession } = useAuth();

  const [tickets, setTickets] =
    useState<api.ZendeskTicket[]>([]);
  const [ratings, setRatings] =
    useState<api.ZendeskSatisfactionRating[]>([]);
  const [forms, setForms] =
    useState<api.ZendeskForm[]>([]);
  const [fields, setFields] =
    useState<api.ZendeskTicketField[]>([]);
  const [filter, setFilter] =
    useState<AlertFilter>('all');
  const [refreshing, setRefreshing] =
    useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');

    const fresh = await ensureFreshSession();
    const token =
      fresh?.accessToken || session?.accessToken;

    if (!token) return;

    try {
      const [
        ticketResult,
        ratingResult,
        formResult,
        fieldResult,
      ] = await Promise.all([
        api.zendeskAnalyticsTickets(token, 30),
        api.zendeskSatisfaction(token, 30),
        api.zendeskForms(token),
        api.zendeskFields(token),
      ]);

      setTickets(ticketResult.tickets || []);
      setRatings(ratingResult.ratings || []);
      setForms(formResult.ticket_forms || []);
      setFields(fieldResult.ticket_fields || []);
    } catch (e: any) {
      setError(
        e?.message || 'Unable to load manager alerts.',
      );
    } finally {
      setLoading(false);
    }
  }, [ensureFreshSession, session?.accessToken]);

  useEffect(() => {
    void load();
  }, []);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const alerts = useMemo(
    () =>
      buildManagerAlerts(
        tickets,
        ratings,
        fields,
        forms,
      ),
    [fields, forms, ratings, tickets],
  );

  const filtered = useMemo(
    () =>
      filter === 'all'
        ? alerts
        : alerts.filter(
            (alert) => alert.severity === filter,
          ),
    [alerts, filter],
  );

  const counts = useMemo(
    () => ({
      critical: alerts.filter(
        (a) => a.severity === 'critical',
      ).length,
      warning: alerts.filter(
        (a) => a.severity === 'warning',
      ).length,
      info: alerts.filter(
        (a) => a.severity === 'info',
      ).length,
    }),
    [alerts],
  );

  function openAlert(alert: ManagerAlert) {
    router.push({
      pathname: '/alert/[id]',
      params: { id: alert.id },
    } as unknown as Href);
  }

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          tintColor={colors.primary}
        />
      }
    >
      <WorkspaceHeader />

      <View style={s.hero}>
        <View>
          <Text style={s.eyebrow}>
            MANAGER NOTIFICATION CENTER
          </Text>
          <Text style={s.title}>Alerts</Text>
          <Text style={s.caption}>
            Operational signals from live Zendesk data
          </Text>
        </View>

        <View style={s.live}>
          <View style={s.liveDot} />
          <Text style={s.liveText}>LIVE</Text>
        </View>
      </View>

      <View style={s.summaryRow}>
        <Summary
          label="Critical"
          value={counts.critical}
          tone="critical"
        />
        <Summary
          label="Warning"
          value={counts.warning}
          tone="warning"
        />
        <Summary
          label="Info"
          value={counts.info}
          tone="info"
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filters}
      >
        {FILTERS.map((item) => (
          <Pressable
            key={item.key}
            onPress={() => setFilter(item.key)}
            style={[
              s.filter,
              filter === item.key && s.filterActive,
            ]}
          >
            <Text
              style={[
                s.filterText,
                filter === item.key &&
                  s.filterTextActive,
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {error ? (
        <AppCard>
          <Text style={s.errorTitle}>
            Alerts unavailable
          </Text>
          <Text style={s.errorText}>{error}</Text>
        </AppCard>
      ) : null}

      {loading ? (
        <View style={s.loading}>
          <ActivityIndicator color={colors.primary} />
          <Text style={s.loadingText}>
            Evaluating manager alert rulesâ€¦
          </Text>
        </View>
      ) : (
        <>
          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>
              Active signals
            </Text>
            <Text style={s.count}>{filtered.length}</Text>
          </View>

          {filtered.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onPress={() => openAlert(alert)}
            />
          ))}

          {!filtered.length && !error ? (
            <View style={s.empty}>
              <View style={s.emptyIcon}>
                <Text style={s.emptyIconText}>âœ“</Text>
              </View>
              <Text style={s.emptyTitle}>
                No alerts in this filter
              </Text>
              <Text style={s.emptyText}>
                Pull down to evaluate the latest Zendesk data.
              </Text>
            </View>
          ) : null}

          <View style={s.note}>
            <Text style={s.noteTitle}>
              SLA / no-response foundation
            </Text>
            <Text style={s.noteText}>
              Until Zendesk SLA policy/event metrics are wired, the â€œNo recent activityâ€ rule uses active tickets with no update for 24+ hours. Phase 13 system health will expose exact sync/connection state; a later backend alert worker can make these signals persistent and push-driven.
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

function Summary({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'critical' | 'warning' | 'info';
}) {
  const bg =
    tone === 'critical'
      ? '#FDECEC'
      : tone === 'warning'
        ? '#FFF5DF'
        : colors.cyanSoft;

  const fg =
    tone === 'critical'
      ? colors.danger
      : tone === 'warning'
        ? colors.warning
        : colors.cyan;

  return (
    <View style={[s.summary, { backgroundColor: bg }]}>
      <Text style={[s.summaryValue, { color: fg }]}>
        {value}
      </Text>
      <Text style={s.summaryLabel}>{label}</Text>
    </View>
  );
}

function AlertCard({
  alert,
  onPress,
}: {
  alert: ManagerAlert;
  onPress: () => void;
}) {
  const accent =
    alert.severity === 'critical'
      ? colors.danger
      : alert.severity === 'warning'
        ? colors.warning
        : colors.cyan;

  return (
    <Pressable onPress={onPress} style={s.alertCard}>
      <View
        style={[
          s.alertIndicator,
          { backgroundColor: accent },
        ]}
      />

      <View style={s.alertContent}>
        <View style={s.alertTop}>
          <Text style={s.alertTitle}>
            {alert.title}
          </Text>
          <Text style={[s.severity, { color: accent }]}>
            {alert.severity.toUpperCase()}
          </Text>
        </View>

        <Text style={s.alertMessage}>
          {alert.message}
        </Text>

        <View style={s.alertFooter}>
          <Text style={s.alertCount}>
            {alert.count} signal
            {alert.count === 1 ? '' : 's'}
          </Text>
          <Text style={s.open}>View details â€º</Text>
        </View>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 18,
    paddingBottom: 120,
  },
  hero: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
    marginTop: 4,
  },
  caption: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 4,
  },
  live: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.lime,
  },
  liveText: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '900',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
  },
  summary: {
    flex: 1,
    minHeight: 93,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 13,
  },
  summaryValue: {
    fontSize: 25,
    fontWeight: '900',
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: '800',
    marginTop: 5,
  },
  filters: {
    paddingVertical: 14,
    gap: 8,
  },
  filter: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  filterActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '800',
  },
  filterTextActive: {
    color: '#fff',
  },
  errorTitle: {
    color: colors.danger,
    fontWeight: '900',
  },
  errorText: {
    color: colors.text,
    fontSize: 12,
    marginTop: 5,
  },
  loading: {
    alignItems: 'center',
    paddingVertical: 70,
  },
  loadingText: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 10,
  },
  sectionRow: {
    marginTop: 3,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  count: {
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: 10,
    fontWeight: '900',
  },
  alertCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 19,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 10,
  },
  alertIndicator: {
    width: 5,
  },
  alertContent: {
    flex: 1,
    padding: 15,
  },
  alertTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  alertTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  severity: {
    fontSize: 8,
    fontWeight: '900',
  },
  alertMessage: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 6,
  },
  alertFooter: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  alertCount: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: '700',
  },
  open: {
    color: colors.cyan,
    fontSize: 10,
    fontWeight: '900',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconText: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '900',
  },
  emptyTitle: {
    color: colors.text,
    fontWeight: '900',
    marginTop: 12,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 5,
    textAlign: 'center',
  },
  note: {
    marginTop: 16,
    backgroundColor: colors.primarySoft,
    borderRadius: 16,
    padding: 16,
  },
  noteTitle: {
    color: colors.primary,
    fontWeight: '900',
    fontSize: 12,
  },
  noteText: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 5,
  },
});

