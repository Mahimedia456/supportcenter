
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
import { TicketCard } from '@/components/tickets/TicketCard';
import { AppCard } from '@/components/AppCard';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import {
  getZendeskDbSnapshot,
  syncZendeskDb,
  type ZendeskDbSnapshot,
} from '@/lib/zendesk-db';
import {
  applyTicketUiFilters,
  drilldownTickets,
  type TicketResultMode,
} from '@/lib/ticket-results';
import type {
  AtomosFieldRole,
} from '@/lib/zendesk-dimensions';

const STATUS = [
  'all',
  'new',
  'open',
  'pending',
  'hold',
  'solved',
];

const PRIORITY = [
  'all',
  'urgent',
  'high',
  'normal',
  'low',
];

const ASSIGNMENT = [
  'all',
  'assigned',
  'unassigned',
];

export default function TicketResults() {
  const params =
    useLocalSearchParams<{
      mode?: string;
      role?: string;
      value?: string;
      formId?: string;
      ids?: string;
      title?: string;
    }>();

  const {
    session,
    ensureFreshSession,
  } = useAuth();

  const [snapshot, setSnapshot] =
    useState<ZendeskDbSnapshot | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [error, setError] =
    useState('');

  const [query, setQuery] =
    useState('');
  const [status, setStatus] =
    useState('all');
  const [priority, setPriority] =
    useState('all');
  const [assignment, setAssignment] =
    useState('all');
  const [sort, setSort] =
    useState('newest');

  const token =
    useCallback(async () => {
      const fresh =
        await ensureFreshSession();

      return (
        fresh?.accessToken ||
        session?.accessToken ||
        ''
      );
    }, [
      ensureFreshSession,
      session?.accessToken,
    ]);

  const load =
    useCallback(async () => {
      setError('');

      try {
        const accessToken =
          await token();

        if (!accessToken) {
          return;
        }

        const data =
          await getZendeskDbSnapshot(
            accessToken,
          );

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
    void load();
  }, [load]);

  async function refresh() {
    setRefreshing(true);

    try {
      const accessToken =
        await token();

      if (accessToken) {
        const data =
          await syncZendeskDb(
            accessToken,
          );

        setSnapshot(data);
      }
    } catch (e: any) {
      setError(
        e?.message ||
          'Unable to sync tickets.',
      );
    } finally {
      setRefreshing(false);
    }
  }

  const base = useMemo(() => {
    if (!snapshot) return [];

    const ids = String(
      params.ids || '',
    )
      .split(',')
      .map(Number)
      .filter(Number.isFinite);

    return drilldownTickets({
      tickets:
        snapshot.tickets || [],
      fields:
        snapshot.fields || [],
      forms:
        snapshot.forms || [],
      mode:
        (params.mode ||
          'all') as TicketResultMode,
      role:
        params.role as
          | AtomosFieldRole
          | undefined,
      value:
        params.value,
      formId:
        params.formId
          ? Number(
              params.formId,
            )
          : undefined,
      ids,
    });
  }, [
    params.formId,
    params.ids,
    params.mode,
    params.role,
    params.value,
    snapshot,
  ]);

  const rows = useMemo(
    () =>
      applyTicketUiFilters(
        base,
        {
          query,
          status,
          priority,
          assignment,
          sort,
        },
      ),
    [
      assignment,
      base,
      priority,
      query,
      sort,
      status,
    ],
  );

  return (
    <SafeAreaView
      style={s.safe}
      edges={[
        'top',
        'left',
        'right',
      ]}
    >
      <ScrollView
        style={s.screen}
        contentContainerStyle={
          s.content
        }
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={refresh}
            tintColor={
              colors.primary
            }
          />
        }
      >
        <View style={s.header}>
          <Pressable
            onPress={() =>
              router.back()
            }
            hitSlop={10}
            style={s.back}
          >
            <Ionicons
              name="chevron-back"
              size={23}
              color={colors.text}
            />
          </Pressable>

          <View
            style={s.headerCopy}
          >
            <Text
              style={s.eyebrow}
            >
              TICKET RESULTS
            </Text>
            <Text
              style={s.title}
              numberOfLines={2}
            >
              {params.title ||
                'Filtered tickets'}
            </Text>
            <Text
              style={s.caption}
            >
              Last 90 days ·{' '}
              {rows.length} shown
            </Text>
          </View>
        </View>

        <View style={s.search}>
          <Ionicons
            name="search-outline"
            size={19}
            color={colors.muted}
          />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search ticket, subject or tag"
            placeholderTextColor={
              colors.muted
            }
            style={s.searchInput}
          />
          {query ? (
            <Pressable
              onPress={() =>
                setQuery('')
              }
            >
              <Ionicons
                name="close-circle"
                size={19}
                color={
                  colors.muted
                }
              />
            </Pressable>
          ) : null}
        </View>

        <FilterStrip
          title="Status"
          values={STATUS}
          value={status}
          onChange={setStatus}
        />

        <FilterStrip
          title="Priority"
          values={PRIORITY}
          value={priority}
          onChange={setPriority}
        />

        <FilterStrip
          title="Assignment"
          values={ASSIGNMENT}
          value={assignment}
          onChange={
            setAssignment
          }
        />

        <View style={s.sortRow}>
          <Text
            style={s.filterLabel}
          >
            SORT
          </Text>

          <View style={s.sortActions}>
            {[
              ['newest', 'Newest'],
              ['oldest', 'Oldest'],
            ].map(
              ([key, label]) => (
                <Pressable
                  key={key}
                  onPress={() =>
                    setSort(key)
                  }
                  style={[
                    s.sortChip,
                    sort === key &&
                      s.chipActive,
                  ]}
                >
                  <Text
                    style={[
                      s.chipText,
                      sort === key &&
                        s.chipTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              ),
            )}
          </View>
        </View>

        {snapshot ? (
          <View style={s.syncRow}>
            <Ionicons
              name="cloud-done-outline"
              size={15}
              color={colors.primary}
            />
            <Text style={s.syncText}>
              DB snapshot ·{' '}
              {snapshot.syncedAt
                ? new Date(
                    snapshot.syncedAt,
                  ).toLocaleString()
                : 'not synced yet'}
            </Text>
          </View>
        ) : null}

        {loading ? (
          <View style={s.loading}>
            <ActivityIndicator
              color={
                colors.primary
              }
            />
            <Text
              style={s.loadingText}
            >
              Initializing support
              data…
            </Text>
          </View>
        ) : null}

        {error ? (
          <AppCard>
            <Text
              style={s.errorTitle}
            >
              Tickets unavailable
            </Text>
            <Text
              style={s.errorText}
            >
              {error}
            </Text>
          </AppCard>
        ) : null}

        {!loading &&
          rows.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              agents={
                snapshot?.agents ||
                []
              }
              groups={
                snapshot?.groups ||
                []
              }
              forms={
                snapshot?.forms ||
                []
              }
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
        !rows.length ? (
          <AppCard>
            <Text
              style={s.emptyTitle}
            >
              No tickets match
            </Text>
            <Text
              style={s.emptyText}
            >
              Change the filters or
              pull down to sync.
            </Text>
          </AppCard>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function FilterStrip({
  title,
  values,
  value,
  onChange,
}: {
  title: string;
  values: string[];
  value: string;
  onChange: (
    value: string,
  ) => void;
}) {
  return (
    <View style={s.filterBlock}>
      <Text style={s.filterLabel}>
        {title.toUpperCase()}
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={
          false
        }
        contentContainerStyle={
          s.chips
        }
      >
        {values.map((item) => (
          <Pressable
            key={item}
            onPress={() =>
              onChange(item)
            }
            style={[
              s.chip,
              value === item &&
                s.chipActive,
            ]}
          >
            <Text
              style={[
                s.chipText,
                value === item &&
                  s.chipTextActive,
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
    </View>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor:
      colors.background,
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
    marginBottom: 14,
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor:
      colors.surface,
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
    fontSize: 23,
    fontWeight: '900',
    marginTop: 3,
  },
  caption: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 4,
  },
  search: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor:
      colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 11,
  },
  filterBlock: {
    marginTop: 13,
  },
  filterLabel: {
    color: colors.muted,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 7,
  },
  chips: {
    gap: 7,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor:
      colors.surface,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor:
      colors.primary,
    borderColor:
      colors.primary,
  },
  chipText: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: '800',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  sortRow: {
    marginTop: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
  },
  sortActions: {
    flexDirection: 'row',
    gap: 7,
  },
  sortChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor:
      colors.surface,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    marginBottom: 7,
  },
  syncText: {
    color: colors.muted,
    fontSize: 9,
  },
  loading: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    color: colors.text,
    fontWeight: '900',
    fontSize: 12,
    marginTop: 10,
  },
  errorTitle: {
    color: colors.danger,
    fontWeight: '900',
  },
  errorText: {
    color: colors.text,
    fontSize: 10,
    marginTop: 4,
  },
  emptyTitle: {
    color: colors.text,
    fontWeight: '900',
  },
  emptyText: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 4,
  },
});
