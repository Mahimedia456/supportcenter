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
  useLocalSearchParams,
} from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppCard } from '@/components/AppCard';
import { TicketCard } from '@/components/tickets/TicketCard';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import * as api from '@/lib/api';
import {
  buildManagerAlerts,
  ticketsForAlert,
} from '@/lib/alerts';

export default function AlertDetail() {
  const params =
    useLocalSearchParams<{
      id: string;
    }>();

  const alertId =
    Array.isArray(params.id)
      ? params.id[0]
      : params.id || '';

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
  const [agents, setAgents] =
    useState<api.ZendeskUser[]>([]);
  const [groups, setGroups] =
    useState<api.ZendeskGroup[]>([]);

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
          api.zendeskAgents(token),
          api.zendeskGroups(token),
        ]);

      const [
        satisfaction,
        formResult,
        fieldResult,
        metricResult,
        eventResult,
        agentResult,
        groupResult,
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
      }

      if (
        agentResult.status ===
        'fulfilled'
      ) {
        setAgents(
          agentResult.value.users ||
            [],
        );
      }

      if (
        groupResult.status ===
        'fulfilled'
      ) {
        setGroups(
          groupResult.value.groups ||
            [],
        );
      }
    } catch (e: any) {
      setError(
        e?.message ||
          'Unable to load alert detail.',
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
    await load();
    setRefreshing(false);
  }

  const alert = useMemo(
    () =>
      buildManagerAlerts(
        tickets,
        ratings,
        fields,
        forms,
        metrics,
        events,
      ).find(
        (item) =>
          item.id === alertId,
      ),
    [
      alertId,
      events,
      fields,
      forms,
      metrics,
      ratings,
      tickets,
    ],
  );

  const related = useMemo(
    () =>
      alert
        ? ticketsForAlert(
            alert,
            tickets,
          )
        : [],
    [alert, tickets],
  );

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
      <View style={s.header}>
        <Pressable
          onPress={() => router.back()}
          style={s.back}
        >
          <Ionicons
            name="chevron-back"
            size={22}
            color={colors.text}
          />
        </Pressable>

        <View style={s.headerText}>
          <Text style={s.eyebrow}>
            ALERT DETAIL
          </Text>
          <Text style={s.title}>
            {alert?.title ||
              'Manager alert'}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={s.loading}>
          <ActivityIndicator
            color={colors.primary}
          />
        </View>
      ) : null}

      {error ? (
        <AppCard>
          <Text style={s.error}>
            {error}
          </Text>
        </AppCard>
      ) : null}

      {!loading &&
      !error &&
      alert ? (
        <>
          <AppCard style={s.hero}>
            <Text style={s.severity}>
              {alert.severity.toUpperCase()}
            </Text>
            <Text style={s.message}>
              {alert.message}
            </Text>
          </AppCard>

          <View style={s.relatedRow}>
            <Text style={s.relatedTitle}>
              Related tickets
            </Text>
            <Text style={s.relatedCount}>
              {related.length}
            </Text>
          </View>

          {related.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              agents={agents}
              groups={groups}
              forms={forms}
              onPress={() =>
                router.push({
                  pathname:
                    '/ticket/[id]',
                  params: {
                    id: String(
                      ticket.id,
                    ),
                  },
                })
              }
            />
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 18,
    paddingTop: 22,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
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
    fontSize: 23,
    fontWeight: '900',
    marginTop: 3,
  },
  loading: {
    paddingVertical: 60,
  },
  error: {
    color: colors.danger,
    fontWeight: '700',
  },
  hero: {
    backgroundColor: '#F7FAF8',
  },
  severity: {
    color: colors.warning,
    fontSize: 9,
    fontWeight: '900',
  },
  message: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    marginTop: 10,
  },
  relatedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 22,
    marginBottom: 10,
  },
  relatedTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  relatedCount: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '900',
  },
});
