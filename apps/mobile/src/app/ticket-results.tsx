
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
import {
  router,
  useLocalSearchParams,
} from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { SupportPeriodFilter } from '@/components/SupportPeriodFilter';
import {
  dimensionValue,
  isTruthyDimension,
  type SupportDimension,
} from '@/lib/support-dimensions';
import type { ZendeskTicket } from '@/lib/api';

export default function TicketResults() {
  const params = useLocalSearchParams<{
    role?: string;
    value?: string;
    formId?: string;
    title?: string;
    preset?: string;
  }>();

  const {
    session,
    ensureFreshSession,
  } = useAuth();

  const [snapshot, setSnapshot] =
    useState<ZendeskDbSnapshot | null>(
      () => peekZendeskDbSnapshot(),
    );
  const [period, setPeriod] =
    useState<SupportPeriod>(
      DEFAULT_SUPPORT_PERIOD,
    );
  const [query, setQuery] =
    useState('');
  const [status, setStatus] =
    useState('all');
  const [loading, setLoading] =
    useState(!peekZendeskDbSnapshot());
  const [refreshing, setRefreshing] =
    useState(false);
  const [error, setError] =
    useState('');

  const token = useCallback(async () => {
    const fresh = await ensureFreshSession();
    return (
      fresh?.accessToken ||
      session?.accessToken ||
      ''
    );
  }, [
    ensureFreshSession,
    session?.accessToken,
  ]);

  const load = useCallback(async () => {
    try {
      const accessToken = await token();
      if (!accessToken) return;

      const data =
        await getZendeskDbSnapshot(accessToken);
      setSnapshot(data);
    } catch (e: any) {
      setError(
        e?.message ||
          'Unable to load tickets.',
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!snapshot) void load();
  }, [load, snapshot]);

  async function refresh() {
    setRefreshing(true);
    try {
      const accessToken = await token();
      if (!accessToken) return;

      const data =
        await syncZendeskDb(accessToken);
      setSnapshot(data);
    } catch (e: any) {
      setError(
        e?.message ||
          'Unable to sync tickets.',
      );
    } finally {
      setRefreshing(false);
    }
  }

  const rows = useMemo(() => {
    if (!snapshot) return [];

    let tickets =
      filterTicketsBySupportPeriod(
        snapshot.tickets || [],
        period,
      );

    if (params.formId) {
      const formId = Number(params.formId);
      tickets = tickets.filter(
        (ticket) =>
          Number(ticket.ticket_form_id) ===
          formId,
      );
    }

    if (
      params.role &&
      params.value
    ) {
      const role =
        params.role as SupportDimension;
      const wanted =
        String(params.value)
          .trim()
          .toLowerCase();

      tickets = tickets.filter(
        (ticket) =>
          dimensionValue(
            ticket,
            snapshot.fields || [],
            role,
          )
            .split(',')
            .map((item: string) =>
              item.trim().toLowerCase(),
            )
            .includes(wanted),
      );
    }

    if (params.preset === 'open') {
      tickets = tickets.filter(
        (ticket) =>
          String(ticket.status).toLowerCase() ===
          'open',
      );
    }

    if (params.preset === 'faulty') {
      tickets = tickets.filter(
        (ticket) =>
          isTruthyDimension(
            dimensionValue(
              ticket,
              snapshot.fields || [],
              'faultCategory',
            ),
          ),
      );
    }

    if (params.preset === 'rma') {
      tickets = tickets.filter(
        (ticket) =>
          isTruthyDimension(
            dimensionValue(
              ticket,
              snapshot.fields || [],
              'rma',
            ),
          ),
      );
    }

    if (params.preset === 'unassigned') {
      tickets = tickets.filter(
        (ticket) => !ticket.assignee_id,
      );
    }

    if (status !== 'all') {
      tickets = tickets.filter(
        (ticket) =>
          String(ticket.status || '')
            .toLowerCase() === status,
      );
    }

    const needle =
      query.trim().toLowerCase();

    if (needle) {
      tickets = tickets.filter(
        (ticket) =>
          [
            ticket.id,
            ticket.subject || '',
            ticket.description || '',
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
    params.formId,
    params.preset,
    params.role,
    params.value,
    period,
    query,
    snapshot,
    status,
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
            onPress={() => router.back()}
            style={s.back}
            hitSlop={10}
          >
            <Ionicons
              name="chevron-back"
              size={23}
              color={colors.text}
            />
          </Pressable>

          <View style={s.headerCopy}>
            <Text style={s.eyebrow}>
              TICKET RESULTS
            </Text>
            <Text style={s.title}>
              {params.title || 'Tickets'}
            </Text>
            <Text style={s.caption}>
              {rows.length} matching tickets
            </Text>
          </View>
        </View>

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
            placeholder="Search tickets"
            placeholderTextColor={colors.muted}
            style={s.searchInput}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.statusRow}
        >
          {[
            'all',
            'new',
            'open',
            'pending',
            'hold',
            'solved',
          ].map((item: string) => (
            <Pressable
              key={item}
              onPress={() => setStatus(item)}
              style={[
                s.statusChip,
                status === item &&
                  s.statusActive,
              ]}
            >
              <Text
                style={[
                  s.statusText,
                  status === item &&
                    s.statusTextActive,
                ]}
              >
                {item === 'all'
                  ? 'All'
                  : item
                      .charAt(0)
                      .toUpperCase() +
                    item.slice(1)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {loading ? (
          <View style={s.loading}>
            <ActivityIndicator
              color={colors.primary}
            />
            <Text style={s.loadingText}>
              Initializing support data…
            </Text>
          </View>
        ) : null}

        {error ? (
          <View style={s.errorCard}>
            <Text style={s.errorTitle}>
              Data unavailable
            </Text>
            <Text style={s.errorText}>
              {error}
            </Text>
          </View>
        ) : null}

        {snapshot &&
          rows.map((ticket) => (
            <ResolvedTicketRow
              key={ticket.id}
              ticket={ticket}
              snapshot={snapshot}
            />
          ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function ResolvedTicketRow({
  ticket,
  snapshot,
}: {
  ticket: ZendeskTicket;
  snapshot: ZendeskDbSnapshot;
}) {
  const assignee =
    snapshot.agents.find(
      (item: any) =>
        Number(item.id) ===
        Number(ticket.assignee_id),
    ) as any;

  const group =
    snapshot.groups.find(
      (item: any) =>
        Number(item.id) ===
        Number(ticket.group_id),
    ) as any;

  const form =
    snapshot.forms.find(
      (item: any) =>
        Number(item.id) ===
        Number(ticket.ticket_form_id),
    ) as any;

  return (
    <Pressable
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
        <Text style={s.ticketId}>
          #{ticket.id}
        </Text>
        <Text style={s.ticketStatus}>
          {String(ticket.status || 'unknown')}
        </Text>
      </View>

      <Text
        style={s.subject}
        numberOfLines={2}
      >
        {ticket.subject || 'Untitled ticket'}
      </Text>

      <View style={s.metaGrid}>
        <Meta
          label="Assignee"
          value={
            assignee?.name ||
            assignee?.email ||
            'Unassigned'
          }
        />
        <Meta
          label="Group"
          value={
            group?.name ||
            'No group'
          }
        />
        <Meta
          label="Form"
          value={
            form?.display_name ||
            form?.name ||
            'Default'
          }
        />
      </View>

      <View style={s.ticketBottom}>
        <Text style={s.updated}>
          {ticket.updated_at
            ? new Date(
                ticket.updated_at,
              ).toLocaleString()
            : ''}
        </Text>
        <Ionicons
          name="chevron-forward"
          size={17}
          color={colors.cyan}
        />
      </View>
    </Pressable>
  );
}

function Meta({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={s.meta}>
      <Text style={s.metaLabel}>
        {label}
      </Text>
      <Text
        style={s.metaValue}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
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
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    marginBottom: 2,
  },
  back: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerCopy: {
    flex: 1,
    paddingTop: 1,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
  },
  caption: {
    color: colors.muted,
    fontSize: 9,
    marginTop: 2,
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
    marginTop: 3,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 11,
  },
  statusRow: {
    gap: 7,
    paddingVertical: 11,
  },
  statusChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  statusActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusText: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: '800',
  },
  statusTextActive: {
    color: '#FFFFFF',
  },
  loading: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    color: colors.text,
    fontWeight: '900',
    marginTop: 9,
    fontSize: 11,
  },
  errorCard: {
    padding: 14,
    borderRadius: 15,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  errorTitle: {
    color: colors.text,
    fontWeight: '900',
  },
  errorText: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 4,
  },
  ticket: {
    borderRadius: 17,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 13,
    marginBottom: 9,
  },
  ticketTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ticketId: {
    color: colors.primary,
    fontWeight: '900',
    fontSize: 10,
  },
  ticketStatus: {
    color: colors.muted,
    fontWeight: '800',
    fontSize: 9,
    textTransform: 'capitalize',
  },
  subject: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
    marginTop: 7,
  },
  metaGrid: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 10,
  },
  meta: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: colors.background,
    padding: 8,
  },
  metaLabel: {
    color: colors.muted,
    fontSize: 7,
    fontWeight: '800',
  },
  metaValue: {
    color: colors.text,
    fontSize: 9,
    fontWeight: '900',
    marginTop: 3,
  },
  ticketBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  updated: {
    color: colors.muted,
    fontSize: 8,
  },
});
