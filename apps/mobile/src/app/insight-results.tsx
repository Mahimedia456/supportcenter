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
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppCard } from '@/components/AppCard';
import { TicketCard } from '@/components/tickets/TicketCard';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import * as api from '@/lib/api';
import {
  ticketsForRoleValue,
  type AtomosFieldRole,
} from '@/lib/zendesk-dimensions';

export default function InsightResults() {
  const params =
    useLocalSearchParams<{
      mode?: string;
      role?: string;
      value?: string;
      title?: string;
      dimension?: string;
      score?: string;
    }>();

  const {
    session,
    ensureFreshSession,
  } = useAuth();

  const [tickets, setTickets] =
    useState<api.ZendeskTicket[]>([]);
  const [fields, setFields] =
    useState<
      api.ZendeskTicketField[]
    >([]);
  const [forms, setForms] =
    useState<api.ZendeskForm[]>([]);
  const [agents, setAgents] =
    useState<api.ZendeskUser[]>([]);
  const [groups, setGroups] =
    useState<api.ZendeskGroup[]>([]);
  const [ratings, setRatings] =
    useState<
      api.ZendeskSatisfactionRating[]
    >([]);

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
        await api.zendeskAllTickets(
          token,
        );

      setTickets(
        ticketResult.tickets || [],
      );

      const results =
        await Promise.allSettled([
          api.zendeskFields(token),
          api.zendeskForms(token),
          api.zendeskAgents(token),
          api.zendeskGroups(token),
          api.zendeskSatisfaction(
            token,
            365,
          ),
        ]);

      const [
        fieldResult,
        formResult,
        agentResult,
        groupResult,
        ratingResult,
      ] = results;

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
        formResult.status ===
        'fulfilled'
      ) {
        setForms(
          formResult.value
            .ticket_forms || [],
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

      if (
        ratingResult.status ===
        'fulfilled'
      ) {
        setRatings(
          ratingResult.value
            .ratings || [],
        );
      }
    } catch (e: any) {
      setError(
        e?.message ||
          'Unable to load results.',
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

  const result = useMemo(() => {
    if (
      params.mode ===
        'atomos-field' &&
      params.role &&
      params.value
    ) {
      return ticketsForRoleValue(
        tickets,
        fields,
        params.role as
          AtomosFieldRole,
        String(params.value),
      );
    }

    if (
      params.mode === 'feedback'
    ) {
      const wanted =
        String(
          params.score || 'all',
        ).toLowerCase();

      const ids = new Set(
        ratings
          .filter((rating) => {
            const score = String(
              rating.score || '',
            ).toLowerCase();

            return wanted === 'all'
              ? [
                  'good',
                  'bad',
                ].includes(score)
              : score === wanted;
          })
          .map((rating) =>
            Number(
              rating.ticket_id,
            ),
          )
          .filter(Number.isFinite),
      );

      return tickets.filter(
        (ticket) =>
          ids.has(ticket.id),
      );
    }

    return tickets;
  }, [
    fields,
    params.mode,
    params.role,
    params.score,
    params.value,
    ratings,
    tickets,
  ]);

  return (
    <SafeAreaView
      style={s.safe}
      edges={['top', 'left', 'right']}
    >
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
            onPress={() =>
              router.back()
            }
            style={s.back}
          >
            <Ionicons
              name="chevron-back"
              size={23}
              color={colors.text}
            />
          </Pressable>

          <View style={s.headerCopy}>
            <Text style={s.eyebrow}>
              INSIGHT RESULTS
            </Text>
            <Text style={s.title}>
              {params.title ||
                params.value ||
                'Results'}
            </Text>
            <Text style={s.caption}>
              {result.length} matching
              tickets
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
          result.map((ticket) => (
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

        {!loading &&
        !error &&
        !result.length ? (
          <AppCard>
            <Text style={s.empty}>
              No matching tickets found.
            </Text>
          </AppCard>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screen: {
    flex: 1,
  },
  content: {
    padding: 18,
    paddingTop: 10,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  headerCopy: {
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
    fontSize: 22,
    fontWeight: '900',
    marginTop: 4,
  },
  caption: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 4,
  },
  loading: {
    paddingVertical: 60,
  },
  error: {
    color: colors.danger,
    fontWeight: '700',
  },
  empty: {
    color: colors.muted,
    textAlign: 'center',
  },
});
