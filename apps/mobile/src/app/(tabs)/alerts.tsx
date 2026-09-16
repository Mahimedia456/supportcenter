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
import { Ionicons } from '@expo/vector-icons';
import { WorkspaceHeader } from '@/components/WorkspaceHeader';
import { AppCard } from '@/components/AppCard';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import * as api from '@/lib/api';
import { forceZendeskDbSync } from '@/lib/zendesk-source';
import {
  buildManagerAlerts,
  type ManagerAlert,
} from '@/lib/alerts';

type Filter =
  | 'all'
  | 'critical'
  | 'warning'
  | 'info';

const FILTERS: Array<{
  key: Filter;
  label: string;
}> = [
  { key: 'all', label: 'All' },
  {
    key: 'critical',
    label: 'Critical',
  },
  {
    key: 'warning',
    label: 'Warning',
  },
  { key: 'info', label: 'Info' },
];

export default function Alerts() {
  const {
    session,
    ensureFreshSession,
  } = useAuth();

  const [tickets, setTickets] =
    useState<api.ZendeskTicket[]>([]);
  const [ratings, setRatings] =
    useState<
      api.ZendeskSatisfactionRating[]
    >([]);
  const [forms, setForms] =
    useState<api.ZendeskForm[]>([]);
  const [fields, setFields] =
    useState<
      api.ZendeskTicketField[]
    >([]);
  const [metrics, setMetrics] =
    useState<
      api.ZendeskTicketMetric[]
    >([]);
  const [events, setEvents] =
    useState<
      api.ZendeskMetricEvent[]
    >([]);

  const [
    slaEventsAvailable,
    setSlaEventsAvailable,
  ] = useState(true);

  const [filter, setFilter] =
    useState<Filter>('all');
  const [loading, setLoading] =
    useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');

    const fresh =
      await ensureFreshSession();
    const token =
      fresh?.accessToken ||
      session?.accessToken;

    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const ticketResult =
        await api.zendeskAnalyticsTickets(
          token,
          90,
        );

      setTickets(
        ticketResult.tickets || [],
      );

      const results =
        await Promise.allSettled([
          api.zendeskSatisfaction(
            token,
            90,
          ),
          api.zendeskForms(token),
          api.zendeskFields(token),
          api.zendeskTicketMetrics(
            token,
            90,
          ),
          api.zendeskMetricEvents(
            token,
            30,
          ),
        ]);

      const [
        satisfaction,
        formResult,
        fieldResult,
        metricResult,
        eventResult,
      ] = results;

      if (
        satisfaction.status ===
        'fulfilled'
      ) {
        setRatings(
          satisfaction.value
            .ratings || [],
        );
      }

      if (
        formResult.status ===
        'fulfilled'
      ) {
        setForms(
          formResult.value
            .ticket_forms || [],
        );
      }

      if (
        fieldResult.status ===
        'fulfilled'
      ) {
        setFields(
          fieldResult.value
            .ticket_fields || [],
        );
      }

      if (
        metricResult.status ===
        'fulfilled'
      ) {
        setMetrics(
          metricResult.value
            .metrics || [],
        );
      }

      if (
        eventResult.status ===
        'fulfilled'
      ) {
        setEvents(
          eventResult.value.events ||
            [],
        );
        setSlaEventsAvailable(
          eventResult.value.available,
        );
      } else {
        setSlaEventsAvailable(false);
      }
    } catch (e: any) {
      setError(
        e?.message ||
          'Unable to load alert data.',
      );
    } finally {
      setLoading(false);
    }
  }, [
    ensureFreshSession,
    session?.accessToken,
  ]);

  useEffect(() => {
    void load();
  }, []);

  async function refresh() {
    setRefreshing(true);

    try {
      const fresh = await ensureFreshSession();
      const token = fresh?.accessToken || session?.accessToken;

      if (token) {
        await forceZendeskDbSync(token);
      }

      await load();
    } finally {
      setRefreshing(false);
    }
  }

  const alerts = useMemo(
    () =>
      buildManagerAlerts(
        tickets,
        ratings,
        fields,
        forms,
        metrics,
        events,
      ),
    [
      events,
      fields,
      forms,
      metrics,
      ratings,
      tickets,
    ],
  );

  const filtered = useMemo(
    () =>
      filter === 'all'
        ? alerts
        : alerts.filter(
            (alert) =>
              alert.severity ===
              filter,
          ),
    [alerts, filter],
  );

  const counts = useMemo(
    () => ({
      critical: alerts.filter(
        (alert) =>
          alert.severity ===
          'critical',
      ).length,
      warning: alerts.filter(
        (alert) =>
          alert.severity ===
          'warning',
      ).length,
      info: alerts.filter(
        (alert) =>
          alert.severity ===
          'info',
      ).length,
    }),
    [alerts],
  );

  function openAlert(
    alert: ManagerAlert,
  ) {
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
        <View style={s.heroCopy}>
          <Text style={s.eyebrow}>
            ZENDESK OPERATIONS
          </Text>
          <Text style={s.title}>
            Alerts
          </Text>
          <Text style={s.caption}>
            Reply time, unsolved age,
            stale activity and SLA signals
          </Text>
        </View>

        <View style={s.live}>
          <View style={s.liveDot} />
          <Text style={s.liveText}>
            LIVE
          </Text>
        </View>
      </View>

      {!slaEventsAvailable ? (
        <AppCard style={s.notice}>
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={colors.warning}
          />
          <View style={s.noticeCopy}>
            <Text style={s.noticeTitle}>
              SLA event access unavailable
            </Text>
            <Text style={s.noticeText}>
              Ticket metric alerts still
              work. Exact SLA breach events
              require a Zendesk admin user.
            </Text>
          </View>
        </AppCard>
      ) : null}

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
        showsHorizontalScrollIndicator={
          false
        }
        contentContainerStyle={s.filters}
      >
        {FILTERS.map((item) => (
          <Pressable
            key={item.key}
            onPress={() =>
              setFilter(item.key)
            }
            style={[
              s.filter,
              filter === item.key &&
                s.filterActive,
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
          <Text style={s.errorText}>
            {error}
          </Text>
        </AppCard>
      ) : null}

      {loading ? (
        <View style={s.loading}>
          <ActivityIndicator
            color={colors.primary}
          />
          <Text style={s.loadingText}>
            Evaluating Zendesk metrics…
          </Text>
        </View>
      ) : (
        <>
          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>
              Active signals
            </Text>
            <Text style={s.count}>
              {filtered.length}
            </Text>
          </View>

          {filtered.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onPress={() =>
                openAlert(alert)
              }
            />
          ))}

          {!filtered.length &&
          !error ? (
            <View style={s.empty}>
              <Ionicons
                name="checkmark-circle-outline"
                size={42}
                color={colors.primary}
              />
              <Text style={s.emptyTitle}>
                No alerts in this filter
              </Text>
              <Text style={s.emptyText}>
                Pull down to re-evaluate
                Zendesk metrics.
              </Text>
            </View>
          ) : null}
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
  tone:
    | 'critical'
    | 'warning'
    | 'info';
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
    <View
      style={[
        s.summary,
        { backgroundColor: bg },
      ]}
    >
      <Text
        style={[
          s.summaryValue,
          { color: fg },
        ]}
      >
        {value}
      </Text>
      <Text style={s.summaryLabel}>
        {label}
      </Text>
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
    alert.severity ===
    'critical'
      ? colors.danger
      : alert.severity ===
          'warning'
        ? colors.warning
        : colors.cyan;

  return (
    <Pressable
      onPress={onPress}
      style={s.alertCard}
    >
      <View
        style={[
          s.alertIndicator,
          {
            backgroundColor: accent,
          },
        ]}
      />

      <View style={s.alertContent}>
        <View style={s.alertTop}>
          <Text style={s.alertTitle}>
            {alert.title}
          </Text>
          <Text
            style={[
              s.severity,
              { color: accent },
            ]}
          >
            {alert.severity.toUpperCase()}
          </Text>
        </View>

        <Text style={s.alertMessage}>
          {alert.message}
        </Text>

        <View style={s.alertFooter}>
          <Text style={s.alertCount}>
            {alert.count} ticket
            {alert.count === 1
              ? ''
              : 's'}
          </Text>
          <Text style={s.open}>
            View tickets ›
          </Text>
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
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 120,
  },
  hero: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  heroCopy: {
    flex: 1,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  title: {
    color: colors.text,
    fontSize: 29,
    fontWeight: '900',
    marginTop: 5,
  },
  caption: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 5,
  },
  live: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
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
  notice: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#FFF9EC',
  },
  noticeCopy: {
    flex: 1,
  },
  noticeTitle: {
    color: colors.warning,
    fontSize: 11,
    fontWeight: '900',
  },
  noticeText: {
    color: colors.muted,
    fontSize: 9,
    lineHeight: 14,
    marginTop: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  summary: {
    flex: 1,
    minHeight: 86,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  summaryValue: {
    fontSize: 24,
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
    color: '#FFFFFF',
  },
  errorTitle: {
    color: colors.danger,
    fontWeight: '900',
  },
  errorText: {
    color: colors.text,
    fontSize: 11,
    marginTop: 5,
  },
  loading: {
    alignItems: 'center',
    paddingVertical: 70,
  },
  loadingText: {
    color: colors.muted,
    fontSize: 11,
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
    borderRadius: 18,
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
  emptyTitle: {
    color: colors.text,
    fontWeight: '900',
    marginTop: 12,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 5,
  },
});
