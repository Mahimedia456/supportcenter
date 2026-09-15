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
  useLocalSearchParams,
} from 'expo-router';
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
  const params = useLocalSearchParams<{ id: string }>();
  const alertId = Array.isArray(params.id)
    ? params.id[0]
    : params.id || '';

  const { session, ensureFreshSession } = useAuth();

  const [tickets, setTickets] =
    useState<api.ZendeskTicket[]>([]);
  const [ratings, setRatings] =
    useState<api.ZendeskSatisfactionRating[]>([]);
  const [forms, setForms] =
    useState<api.ZendeskForm[]>([]);
  const [fields, setFields] =
    useState<api.ZendeskTicketField[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
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
        e?.message || 'Unable to load alert detail.',
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

  const alert = useMemo(
    () =>
      buildManagerAlerts(
        tickets,
        ratings,
        fields,
        forms,
      ).find((item) => item.id === alertId),
    [alertId, fields, forms, ratings, tickets],
  );

  const related = useMemo(
    () =>
      alert
        ? ticketsForAlert(
            alert,
            tickets,
            ratings,
            fields,
            forms,
          )
        : [],
    [alert, fields, forms, ratings, tickets],
  );

  function openTicket(id: number) {
    router.push({
      pathname: '/ticket/[id]',
      params: { id: String(id) },
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
      <View style={s.header}>
        <Pressable
          onPress={() => router.back()}
          style={s.back}
        >
          <Text style={s.backText}>‹</Text>
        </Pressable>

        <View style={s.headerText}>
          <Text style={s.eyebrow}>ALERT DETAIL</Text>
          <Text style={s.title}>
            {alert?.title || 'Manager alert'}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={s.loading}>
          <ActivityIndicator color={colors.primary} />
          <Text style={s.loadingText}>
            Loading alert context…
          </Text>
        </View>
      ) : null}

      {error ? (
        <AppCard>
          <Text style={s.errorTitle}>
            Alert unavailable
          </Text>
          <Text style={s.errorText}>{error}</Text>
        </AppCard>
      ) : null}

      {!loading && !error && alert ? (
        <>
          <AppCard style={s.heroCard}>
            <View style={s.alertTop}>
              <Text style={s.severity}>
                {alert.severity.toUpperCase()}
              </Text>
              <Text style={s.signalCount}>
                {alert.count}
              </Text>
            </View>

            <Text style={s.message}>
              {alert.message}
            </Text>

            {alert.entityLabel ? (
              <View style={s.entityBadge}>
                <Text style={s.entityText}>
                  {alert.entityLabel}
                </Text>
              </View>
            ) : null}
          </AppCard>

          <View style={s.relatedHeader}>
            <View>
              <Text style={s.relatedEyebrow}>
                READ-ONLY TICKETS
              </Text>
              <Text style={s.relatedTitle}>
                Related tickets
              </Text>
            </View>
            <Text style={s.relatedCount}>
              {related.length}
            </Text>
          </View>

          {related.slice(0, 50).map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onPress={() => openTicket(ticket.id)}
            />
          ))}

          {!related.length ? (
            <View style={s.empty}>
              <Text style={s.emptyTitle}>
                No direct ticket list
              </Text>
              <Text style={s.emptyText}>
                This signal is aggregate-level and currently has no direct ticket subset.
              </Text>
            </View>
          ) : null}
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
    paddingBottom: 80,
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
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    color: colors.text,
    fontSize: 34,
    lineHeight: 36,
    marginTop: -3,
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 3,
  },
  loading: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    color: colors.muted,
    marginTop: 10,
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
  heroCard: {
    backgroundColor: '#F4FAF7',
  },
  alertTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  severity: {
    color: colors.warning,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  signalCount: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: '900',
  },
  message: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    marginTop: 12,
  },
  entityBadge: {
    marginTop: 13,
    alignSelf: 'flex-start',
    backgroundColor: colors.cyanSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  entityText: {
    color: colors.cyan,
    fontSize: 10,
    fontWeight: '900',
  },
  relatedHeader: {
    marginTop: 24,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  relatedEyebrow: {
    color: colors.cyan,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  relatedTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '900',
    marginTop: 3,
  },
  relatedCount: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: '900',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    color: colors.text,
    fontWeight: '900',
  },
  emptyText: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 5,
    textAlign: 'center',
  },
});
