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
import { AppCard } from '@/components/AppCard';
import { TicketCard } from '@/components/tickets/TicketCard';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import * as api from '@/lib/api';
import {
  buildAgentRows,
} from '@/lib/feedback-team';

export default function AgentDetail() {
  const params =
    useLocalSearchParams<{ id: string }>();
  const agentId = Number(
    Array.isArray(params.id)
      ? params.id[0]
      : params.id,
  );

  const { session, ensureFreshSession } = useAuth();

  const [tickets, setTickets] =
    useState<api.ZendeskTicket[]>([]);
  const [ratings, setRatings] =
    useState<api.ZendeskSatisfactionRating[]>([]);
  const [agents, setAgents] =
    useState<api.ZendeskUser[]>([]);
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
        agentResult,
      ] = await Promise.all([
        api.zendeskAnalyticsTickets(token, 30),
        api.zendeskSatisfaction(token, 30),
        api.zendeskAgents(token),
      ]);

      setTickets(ticketResult.tickets || []);
      setRatings(ratingResult.ratings || []);
      setAgents(agentResult.users || []);
    } catch (e: any) {
      setError(
        e?.message || 'Unable to load agent detail.',
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

  const row = useMemo(
    () =>
      buildAgentRows(
        agents,
        tickets,
        ratings,
      ).find((item) => item.id === agentId),
    [agentId, agents, ratings, tickets],
  );

  const assignedTickets = useMemo(
    () =>
      tickets.filter(
        (ticket) =>
          ticket.assignee_id === agentId,
      ),
    [agentId, tickets],
  );

  function openTicket(id: number) {
    router.push({
      pathname: '/ticket/[id]',
      params: { id: String(id) },
    });
  }

  const goodPct =
    row && row.feedbackTotal
      ? Math.round(
          (row.good / row.feedbackTotal) * 100,
        )
      : null;

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
          <Text style={s.eyebrow}>
            TEAM MEMBER
          </Text>
          <Text style={s.title}>
            {row?.name || `Agent #${agentId}`}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={s.loading}>
          <ActivityIndicator
            color={colors.primary}
          />
          <Text style={s.loadingText}>
            Loading agent workload…
          </Text>
        </View>
      ) : null}

      {error ? (
        <AppCard>
          <Text style={s.errorTitle}>
            Agent data unavailable
          </Text>
          <Text style={s.errorText}>{error}</Text>
        </AppCard>
      ) : null}

      {!loading && !error && row ? (
        <>
          <AppCard style={s.profile}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>
                {row.name.slice(0, 1).toUpperCase()}
              </Text>
            </View>

            <View style={s.profileText}>
              <Text style={s.profileName}>
                {row.name}
              </Text>
              <Text style={s.profileEmail}>
                {row.email || `Agent #${row.id}`}
              </Text>
            </View>
          </AppCard>

          <View style={s.kpiGrid}>
            <Kpi
              label="Assigned"
              value={row.assigned}
            />
            <Kpi
              label="Open"
              value={row.open}
            />
            <Kpi
              label="High"
              value={row.high}
              warning
            />
            <Kpi
              label="CSAT"
              value={
                goodPct === null
                  ? '—'
                  : `${goodPct}%`
              }
              accent
            />
          </View>

          <View style={s.feedbackBox}>
            <View>
              <Text style={s.feedbackLabel}>
                GOOD
              </Text>
              <Text style={s.feedbackGood}>
                {row.good}
              </Text>
            </View>

            <View style={s.divider} />

            <View>
              <Text style={s.feedbackLabel}>
                BAD
              </Text>
              <Text style={s.feedbackBad}>
                {row.bad}
              </Text>
            </View>

            <View style={s.divider} />

            <View>
              <Text style={s.feedbackLabel}>
                PENDING
              </Text>
              <Text style={s.feedbackNeutral}>
                {row.pending}
              </Text>
            </View>
          </View>

          <View style={s.relatedHeader}>
            <View>
              <Text style={s.relatedEyebrow}>
                READ-ONLY TICKETS
              </Text>
              <Text style={s.relatedTitle}>
                Assigned tickets
              </Text>
            </View>

            <Text style={s.relatedCount}>
              {assignedTickets.length}
            </Text>
          </View>

          {assignedTickets
            .slice(0, 40)
            .map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                onPress={() =>
                  openTicket(ticket.id)
                }
              />
            ))}
        </>
      ) : null}
    </ScrollView>
  );
}

function Kpi({
  label,
  value,
  accent = false,
  warning = false,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
  warning?: boolean;
}) {
  return (
    <View style={s.kpi}>
      <Text
        style={[
          s.kpiValue,
          accent && s.kpiAccent,
          warning && s.kpiWarning,
        ]}
      >
        {value}
      </Text>
      <Text style={s.kpiLabel}>{label}</Text>
    </View>
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
    fontSize: 27,
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
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: '900',
  },
  profileText: {
    marginLeft: 13,
    flex: 1,
  },
  profileName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  profileEmail: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 4,
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 12,
  },
  kpi: {
    flex: 1,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12,
  },
  kpiValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  kpiAccent: {
    color: colors.primary,
  },
  kpiWarning: {
    color: colors.warning,
  },
  kpiLabel: {
    color: colors.muted,
    fontSize: 8,
    fontWeight: '800',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  feedbackBox: {
    marginTop: 12,
    backgroundColor: '#F4FAF7',
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  feedbackLabel: {
    color: colors.muted,
    fontSize: 8,
    fontWeight: '900',
  },
  feedbackGood: {
    color: colors.primary,
    fontSize: 21,
    fontWeight: '900',
    marginTop: 4,
  },
  feedbackBad: {
    color: colors.danger,
    fontSize: 21,
    fontWeight: '900',
    marginTop: 4,
  },
  feedbackNeutral: {
    color: colors.cyan,
    fontSize: 21,
    fontWeight: '900',
    marginTop: 4,
  },
  divider: {
    width: 1,
    height: 36,
    backgroundColor: colors.border,
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
});
