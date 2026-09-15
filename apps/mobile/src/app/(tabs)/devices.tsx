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
import { Ionicons } from '@expo/vector-icons';
import {
  router,
  type Href,
} from 'expo-router';
import { WorkspaceHeader } from '@/components/WorkspaceHeader';
import { AppCard } from '@/components/AppCard';
import { DeviceHealthCard } from '@/components/devices/DeviceHealthCard';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import * as api from '@/lib/api';
import {
  buildDeviceHealth,
} from '@/lib/device-health';
import {
  detectedMapping,
} from '@/lib/zendesk-dimensions';

type Filter =
  | 'all'
  | 'with-cases'
  | 'faulty'
  | 'rma'
  | 'rising';

const FILTERS: Array<{
  key: Filter;
  label: string;
}> = [
  { key: 'all', label: 'All Products' },
  {
    key: 'with-cases',
    label: 'With Tickets',
  },
  { key: 'faulty', label: 'Faulty' },
  { key: 'rma', label: 'RMA' },
  { key: 'rising', label: 'Rising' },
];

export default function Devices() {
  const {
    session,
    ensureFreshSession,
  } = useAuth();

  const [tickets, setTickets] =
    useState<api.ZendeskTicket[]>([]);
  const [forms, setForms] =
    useState<api.ZendeskForm[]>([]);
  const [fields, setFields] =
    useState<
      api.ZendeskTicketField[]
    >([]);

  const [filter, setFilter] =
    useState<Filter>('all');
  const [query, setQuery] =
    useState('');
  const [refreshing, setRefreshing] =
    useState(false);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] = useState('');
  const [metadataError, setMetadataError] =
    useState('');

  const load = useCallback(async () => {
    setError('');
    setMetadataError('');

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

      const [
        formResult,
        fieldResult,
      ] = await Promise.allSettled([
        api.zendeskForms(token),
        api.zendeskFields(token),
      ]);

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
        formResult.status ===
          'rejected' ||
        fieldResult.status ===
          'rejected'
      ) {
        setMetadataError(
          'Some Zendesk product metadata could not be loaded.',
        );
      }
    } catch (e: any) {
      setError(
        e?.message ||
          'Unable to load product health.',
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

  const rows = useMemo(
    () =>
      buildDeviceHealth(
        tickets,
        fields,
        forms,
      ),
    [fields, forms, tickets],
  );

  const mapping = useMemo(
    () => detectedMapping(fields),
    [fields],
  );

  const filtered = useMemo(() => {
    const needle =
      query.trim().toLowerCase();

    return rows.filter((row) => {
      if (
        needle &&
        !row.device
          .toLowerCase()
          .includes(needle)
      ) {
        return false;
      }

      if (
        filter === 'with-cases'
      ) {
        return row.total > 0;
      }

      if (filter === 'faulty') {
        return row.faulty > 0;
      }

      if (filter === 'rma') {
        return row.rma > 0;
      }

      if (filter === 'rising') {
        return (
          (row.trendPct || 0) > 0
        );
      }

      return true;
    });
  }, [filter, query, rows]);

  const totals = useMemo(
    () => ({
      products: rows.length,
      cases: rows.reduce(
        (sum, row) =>
          sum + row.total,
        0,
      ),
      faulty: rows.reduce(
        (sum, row) =>
          sum + row.faulty,
        0,
      ),
      rma: rows.reduce(
        (sum, row) =>
          sum + row.rma,
        0,
      ),
    }),
    [rows],
  );

  function openDevice(
    name: string,
  ) {
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
        <View style={s.heroCopy}>
          <Text style={s.eyebrow}>
            ZENDESK PRODUCT HEALTH
          </Text>
          <Text style={s.title}>
            Devices
          </Text>
          <Text style={s.caption}>
            Atomos product custom fields
            mapped to support load
          </Text>
        </View>

        <View style={s.live}>
          <View style={s.liveDot} />
          <Text style={s.liveText}>
            LIVE
          </Text>
        </View>
      </View>

      <AppCard style={s.mappingCard}>
        <Text style={s.mappingLabel}>
          PRODUCT FIELD
        </Text>
        <Text style={s.mappingValue}>
          {mapping.device?.title ||
            'No product/device field detected'}
        </Text>
      </AppCard>

      <View style={s.summaryGrid}>
        <Summary
          label="Products"
          value={totals.products}
        />
        <Summary
          label="Tickets"
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
          accent
        />
      </View>

      <View style={s.searchWrap}>
        <Ionicons
          name="search-outline"
          size={19}
          color={colors.muted}
        />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search product / device"
          placeholderTextColor={colors.muted}
          style={s.searchInput}
          autoCorrect={false}
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
              color={colors.muted}
            />
          </Pressable>
        ) : null}
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

      {metadataError ? (
        <Text style={s.metadataError}>
          {metadataError}
        </Text>
      ) : null}

      {error ? (
        <AppCard>
          <Text style={s.errorTitle}>
            Product health unavailable
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
            Loading Zendesk products…
          </Text>
        </View>
      ) : (
        <>
          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>
              Product health
            </Text>
            <Text style={s.count}>
              {filtered.length}
            </Text>
          </View>

          {filtered.map((row) => (
            <DeviceHealthCard
              key={row.device}
              row={row}
              onPress={() =>
                openDevice(row.device)
              }
            />
          ))}

          {!filtered.length &&
          !error ? (
            <View style={s.empty}>
              <Ionicons
                name="hardware-chip-outline"
                size={34}
                color={colors.muted}
              />
              <Text style={s.emptyTitle}>
                No product values found
              </Text>
              <Text style={s.emptyText}>
                Check the Zendesk custom
                field mapping shown above.
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
          accent &&
            s.summaryValueAccent,
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
  mappingCard: {
    marginTop: 16,
    backgroundColor: '#F5FBF8',
  },
  mappingLabel: {
    color: colors.muted,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  mappingValue: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
    marginTop: 5,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 10,
  },
  summary: {
    flex: 1,
    minHeight: 75,
    borderRadius: 15,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 11,
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
  },
  searchWrap: {
    minHeight: 52,
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  filters: {
    gap: 8,
    paddingVertical: 13,
  },
  filter: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: '800',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  metadataError: {
    color: colors.warning,
    fontSize: 9,
    marginBottom: 8,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 10,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  count: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    color: colors.text,
    fontWeight: '900',
    marginTop: 12,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 5,
  },
});
