
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
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WorkspaceHeader } from '@/components/WorkspaceHeader';
import { SupportPeriodFilter } from '@/components/SupportPeriodFilter';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import {
  getZendeskDbSnapshot,
  peekZendeskDbSnapshot,
  syncZendeskDb,
  type ZendeskDbSnapshot,
} from '@/lib/zendesk-db';
import {
  DEFAULT_SUPPORT_PERIOD,
  filterTicketsBySupportPeriod,
  type SupportPeriod,
} from '@/lib/support-period';

export default function Tickets() {
  const {
    session,
    ensureFreshSession,
  } = useAuth();

  const cached = peekZendeskDbSnapshot();

  const [snapshot, setSnapshot] =
    useState<ZendeskDbSnapshot | null>(cached);
  const [period, setPeriod] =
    useState<SupportPeriod>(DEFAULT_SUPPORT_PERIOD);
  const [query, setQuery] = useState('');
  const [loading, setLoading] =
    useState(!cached);
  const [refreshing, setRefreshing] =
    useState(false);

  const token = useCallback(async () => {
    const fresh = await ensureFreshSession();
    return fresh?.accessToken || session?.accessToken || '';
  }, [
    ensureFreshSession,
    session?.accessToken,
  ]);

  const load = useCallback(async () => {
    try {
      const accessToken = await token();
      if (!accessToken) return;

      setSnapshot(
        await getZendeskDbSnapshot(accessToken),
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!cached) void load();
  }, [cached, load]);

  async function refresh() {
    setRefreshing(true);
    try {
      const accessToken = await token();
      if (!accessToken) return;

      setSnapshot(
        await syncZendeskDb(accessToken),
      );
    } finally {
      setRefreshing(false);
    }
  }

  const rows = useMemo(() => {
    let tickets =
      filterTicketsBySupportPeriod(
        snapshot?.tickets || [],
        period,
      );

    const needle =
      query.trim().toLowerCase();

    if (needle) {
      tickets = tickets.filter(
        (ticket) =>
          [
            ticket.id,
            ticket.subject || '',
            ...(ticket.tags || []),
          ]
            .join(' ')
            .toLowerCase()
            .includes(needle),
      );
    }

    return [...tickets].sort(
      (a, b) =>
        new Date(
          b.updated_at ||
            b.created_at ||
            0,
        ).getTime() -
        new Date(
          a.updated_at ||
            a.created_at ||
            0,
        ).getTime(),
    );
  }, [
    period,
    query,
    snapshot?.tickets,
  ]);

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

      <Text style={s.eyebrow}>
        TICKET OPERATIONS
      </Text>
      <Text style={s.title}>
        Tickets
      </Text>

      <SupportPeriodFilter
        value={period}
        onChange={setPeriod}
      />

      <View style={s.search}>
        <Ionicons
          name="search-outline"
          size={18}
          color={colors.muted}
        />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search ticket"
          placeholderTextColor={colors.muted}
          style={s.searchInput}
        />
      </View>

      {loading ? (
        <View style={s.loading}>
          <ActivityIndicator color={colors.primary} />
          <Text style={s.loadingText}>
            Initializing support data…
          </Text>
        </View>
      ) : null}

      {snapshot &&
        rows.map((ticket) => {
          const agent: any =
            snapshot.agents.find(
              (item: any) =>
                Number(item.id) ===
                Number(ticket.assignee_id),
            );

          const group: any =
            snapshot.groups.find(
              (item: any) =>
                Number(item.id) ===
                Number(ticket.group_id),
            );

          const form: any =
            snapshot.forms.find(
              (item: any) =>
                Number(item.id) ===
                Number(ticket.ticket_form_id),
            );

          return (
            <Pressable
              key={ticket.id}
              onPress={() =>
                router.push({
                  pathname: '/ticket/[id]',
                  params: {
                    id: String(ticket.id),
                  },
                })
              }
              style={s.ticket}
            >
              <View style={s.ticketTop}>
                <Text style={s.id}>
                  #{ticket.id}
                </Text>
                <Text style={s.status}>
                  {ticket.status}
                </Text>
              </View>

              <Text
                style={s.subject}
                numberOfLines={2}
              >
                {ticket.subject ||
                  'Untitled ticket'}
              </Text>

              <Text style={s.meta}>
                {agent?.name || 'Unassigned'}
                {'  ·  '}
                {group?.name || 'No group'}
                {'  ·  '}
                {form?.display_name ||
                  form?.name ||
                  'Default form'}
              </Text>
            </Pressable>
          );
        })}
    </ScrollView>
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
  eyebrow: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
    marginTop: 4,
  },
  search: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 11,
  },
  loading: {
    alignItems: 'center',
    paddingVertical: 55,
  },
  loadingText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '900',
    marginTop: 9,
  },
  ticket: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 13,
    marginBottom: 9,
  },
  ticketTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  id: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '900',
  },
  status: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  subject: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
    marginTop: 7,
  },
  meta: {
    color: colors.muted,
    fontSize: 8,
    marginTop: 8,
  },
});
