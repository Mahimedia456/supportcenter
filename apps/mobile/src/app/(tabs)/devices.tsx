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
import { router, type Href } from 'expo-router';
import { WorkspaceHeader } from '@/components/WorkspaceHeader';
import { AppCard } from '@/components/AppCard';
import { DeviceHealthCard } from '@/components/devices/DeviceHealthCard';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import * as api from '@/lib/api';
import { buildDeviceHealth } from '@/lib/device-health';

type Filter = 'all' | 'faulty' | 'rma' | 'rising';

const FILTERS: Array<{
  key: Filter;
  label: string;
}> = [
  { key: 'all', label: 'All Devices' },
  { key: 'faulty', label: 'Faulty' },
  { key: 'rma', label: 'RMA' },
  { key: 'rising', label: 'Rising' },
];

export default function Devices() {
  const { session, ensureFreshSession } = useAuth();

  const [tickets, setTickets] =
    useState<api.ZendeskTicket[]>([]);
  const [forms, setForms] =
    useState<api.ZendeskForm[]>([]);
  const [fields, setFields] =
    useState<api.ZendeskTicketField[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');

    const fresh = await ensureFreshSession();
    const token =
      fresh?.accessToken || session?.accessToken;

    if (!token) return;

    try {
      const [ticketResult, formResult, fieldResult] =
        await Promise.all([
          api.zendeskAnalyticsTickets(token, 30),
          api.zendeskForms(token),
          api.zendeskFields(token),
        ]);

      setTickets(ticketResult.tickets || []);
      setForms(formResult.ticket_forms || []);
      setFields(fieldResult.ticket_fields || []);
    } catch (e: any) {
      setError(
        e?.message || 'Unable to load device health.',
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

  const rows = useMemo(
    () => buildDeviceHealth(tickets, fields, forms),
    [fields, forms, tickets],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return rows.filter((row) => {
      if (
        needle &&
        !row.device.toLowerCase().includes(needle)
      ) {
        return false;
      }

      if (filter === 'faulty') return row.faulty > 0;
      if (filter === 'rma') return row.rma > 0;
      if (filter === 'rising')
        return (row.trendPct || 0) > 0;

      return true;
    });
  }, [filter, query, rows]);

  const totals = useMemo(
    () => ({
      devices: rows.length,
      cases: rows.reduce(
        (sum, row) => sum + row.total,
        0,
      ),
      faulty: rows.reduce(
        (sum, row) => sum + row.faulty,
        0,
      ),
      rma: rows.reduce(
        (sum, row) => sum + row.rma,
        0,
      ),
    }),
    [rows],
  );

  function openDevice(name: string) {
    router.push({
      pathname: '/device/[name]',
      params: { name },
    } as unknown as Href);
  }

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled"
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
            30 DAY DEVICE HEALTH
          </Text>
          <Text style={s.title}>Devices</Text>
          <Text style={s.caption}>
            Which products are generating the most support load?
          </Text>
        </View>

        <View style={s.live}>
          <View style={s.liveDot} />
          <Text style={s.liveText}>LIVE</Text>
        </View>
      </View>

      <View style={s.summaryGrid}>
        <Summary
          label="Devices"
          value={totals.devices}
        />
        <Summary
          label="Cases"
          value={totals.cases}
        />
        <Summary
          label="Faulty"
          value={totals.faulty}
          accent
        />
        <Summary
          label="RMA"
          value={totals.rma}
        />
      </View>

      <View style={s.search}>
        <Text style={s.searchIcon}>âŒ•</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search device or product..."
          placeholderTextColor={colors.muted}
          style={s.searchInput}
          autoCorrect={false}
        />
        {query ? (
          <Pressable onPress={() => setQuery('')}>
            <Text style={s.clear}>Ã—</Text>
          </Pressable>
        ) : null}
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
        <AppCard style={s.errorCard}>
          <Text style={s.errorTitle}>
            Device health unavailable
          </Text>
          <Text style={s.errorText}>{error}</Text>
        </AppCard>
      ) : null}

      {loading ? (
        <View style={s.loading}>
          <ActivityIndicator color={colors.primary} />
          <Text style={s.loadingText}>
            Analysing Zendesk device dataâ€¦
          </Text>
        </View>
      ) : (
        <>
          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>
              Device health
            </Text>
            <Text style={s.count}>{filtered.length}</Text>
          </View>

          {filtered.map((row) => (
            <DeviceHealthCard
              key={row.device.toLowerCase()}
              row={row}
              onPress={() =>
                openDevice(row.device)
              }
            />
          ))}

          {!filtered.length && !error ? (
            <View style={s.empty}>
              <View style={s.emptyIcon}>
                <Text style={s.emptyIconText}>D</Text>
              </View>
              <Text style={s.emptyTitle}>
                No matching devices
              </Text>
              <Text style={s.emptyText}>
                Try another filter or clear the search.
              </Text>
            </View>
          ) : null}

          <View style={s.note}>
            <Text style={s.noteTitle}>
              Faulty / RMA logic
            </Text>
            <Text style={s.noteText}>
              RMA and faulty signals are detected from real Zendesk form, issue and tag values. Phase 11 will add customer feedback and agent context around these device cases.
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
  accent = false,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <View style={s.summary}>
      <Text
        style={[
          s.summaryValue,
          accent && s.summaryValueAccent,
        ]}
      >
        {value}
      </Text>
      <Text style={s.summaryLabel}>{label}</Text>
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
    maxWidth: 270,
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
  summaryGrid: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 18,
  },
  summary: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  summaryValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  summaryValueAccent: {
    color: colors.primary,
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 8,
    fontWeight: '800',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  search: {
    marginTop: 15,
    backgroundColor: colors.surface,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 50,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIcon: {
    color: colors.cyan,
    fontSize: 21,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 13,
  },
  clear: {
    color: colors.muted,
    fontSize: 24,
    paddingLeft: 8,
  },
  filters: {
    paddingVertical: 12,
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
  errorCard: {
    marginBottom: 12,
  },
  errorTitle: {
    color: colors.danger,
    fontWeight: '900',
  },
  errorText: {
    color: colors.text,
    marginTop: 5,
    fontSize: 12,
  },
  loading: {
    paddingVertical: 70,
    alignItems: 'center',
  },
  loadingText: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 10,
  },
  sectionRow: {
    marginTop: 5,
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
    fontWeight: '900',
    fontSize: 10,
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





