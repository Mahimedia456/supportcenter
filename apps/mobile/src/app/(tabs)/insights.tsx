
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
import {
  dimensionRows,
  fieldForDimension,
  type SupportDimension,
} from '@/lib/support-dimensions';

type Tab =
  | 'forms'
  | 'supportType'
  | 'device'
  | 'region'
  | 'category'
  | 'faultCategory'
  | 'rma';

const TABS: Array<{
  key: Tab;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { key: 'forms', label: 'Forms', icon: 'document-text-outline' },
  { key: 'supportType', label: 'Support', icon: 'help-buoy-outline' },
  { key: 'device', label: 'Devices', icon: 'hardware-chip-outline' },
  { key: 'region', label: 'Regions', icon: 'globe-outline' },
  { key: 'category', label: 'Category', icon: 'grid-outline' },
  { key: 'faultCategory', label: 'Fault', icon: 'warning-outline' },
  { key: 'rma', label: 'RMA', icon: 'repeat-outline' },
];

export default function Insights() {
  const {
    session,
    ensureFreshSession,
  } = useAuth();

  const cached = peekZendeskDbSnapshot();

  const [snapshot, setSnapshot] =
    useState<ZendeskDbSnapshot | null>(cached);
  const [period, setPeriod] =
    useState<SupportPeriod>(DEFAULT_SUPPORT_PERIOD);
  const [tab, setTab] =
    useState<Tab>('forms');
  const [loading, setLoading] =
    useState(!cached);
  const [refreshing, setRefreshing] =
    useState(false);
  const [error, setError] =
    useState('');

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

      const data =
        await getZendeskDbSnapshot(accessToken);
      setSnapshot(data);
    } catch (e: any) {
      setError(
        e?.message ||
          'Unable to load insights.',
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

      const data =
        await syncZendeskDb(accessToken);
      setSnapshot(data);
    } catch (e: any) {
      setError(
        e?.message ||
          'Unable to sync insights.',
      );
    } finally {
      setRefreshing(false);
    }
  }

  const tickets = useMemo(
    () =>
      filterTicketsBySupportPeriod(
        snapshot?.tickets || [],
        period,
      ),
    [period, snapshot?.tickets],
  );

  const forms =
    snapshot?.forms || [];
  const fields =
    snapshot?.fields || [];

  const formRows = useMemo(() => {
    const counts =
      new Map<number, number>();

    for (const ticket of tickets) {
      if (ticket.ticket_form_id) {
        counts.set(
          Number(ticket.ticket_form_id),
          (counts.get(
            Number(ticket.ticket_form_id),
          ) || 0) + 1,
        );
      }
    }

    return forms
      .map((form: any) => ({
        id: Number(form.id),
        label:
          form.display_name ||
          form.name ||
          `Form ${form.id}`,
        count:
          counts.get(Number(form.id)) || 0,
      }))
      .filter((row) => row.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [forms, tickets]);

  const semanticRows = useMemo(() => {
    if (tab === 'forms') return [];

    return dimensionRows(
      tickets,
      fields,
      tab as SupportDimension,
    );
  }, [fields, tab, tickets]);

  const rows =
    tab === 'forms'
      ? formRows
      : semanticRows.map(
          (row, index) => ({
            id: index,
            ...row,
          }),
        );

  const max =
    Math.max(
      1,
      ...rows.map((row) => row.count),
    );

  const active =
    tickets.filter((ticket) =>
      ['new', 'open', 'pending', 'hold'].includes(
        String(ticket.status || '').toLowerCase(),
      ),
    ).length;

  const unassigned =
    tickets.filter(
      (ticket) => !ticket.assignee_id,
    ).length;

  function openRow(row: any) {
    if (tab === 'forms') {
      router.push({
        pathname: '/ticket-results',
        params: {
          formId: String(row.id),
          title: row.label,
        },
      } as unknown as Href);
      return;
    }

    router.push({
      pathname: '/ticket-results',
      params: {
        role: tab,
        value: row.label,
        title: row.label,
      },
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

      <View style={s.head}>
        <View>
          <Text style={s.eyebrow}>
            SUPPORT INTELLIGENCE
          </Text>
          <Text style={s.title}>
            Insights
          </Text>
        </View>

        <View style={s.scopePill}>
          <Text style={s.scopeText}>
            DB SNAPSHOT
          </Text>
        </View>
      </View>

      <SupportPeriodFilter
        value={period}
        onChange={setPeriod}
      />

      <View style={s.kpis}>
        <Kpi label="Tickets" value={tickets.length} />
        <Kpi label="Active" value={active} />
        <Kpi label="Unassigned" value={unassigned} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.tabs}
      >
        {TABS.map((item) => (
          <Pressable
            key={item.key}
            onPress={() => setTab(item.key)}
            style={[
              s.tab,
              tab === item.key && s.tabActive,
            ]}
          >
            <Ionicons
              name={item.icon}
              size={15}
              color={
                tab === item.key
                  ? '#FFFFFF'
                  : colors.muted
              }
            />
            <Text
              style={[
                s.tabText,
                tab === item.key &&
                  s.tabTextActive,
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {tab !== 'forms' ? (
        <View style={s.detected}>
          <Text style={s.detectedLabel}>
            DETECTED FIELD
          </Text>
          <Text style={s.detectedValue}>
            {fieldForDimension(
              fields,
              tab as SupportDimension,
            )?.title || 'Not detected'}
          </Text>
        </View>
      ) : null}

      {loading ? (
        <View style={s.loading}>
          <ActivityIndicator color={colors.primary} />
          <Text style={s.loadingText}>
            Initializing support data…
          </Text>
        </View>
      ) : null}

      {error ? (
        <View style={s.error}>
          <Text style={s.errorTitle}>
            Insights unavailable
          </Text>
          <Text style={s.errorText}>
            {error}
          </Text>
        </View>
      ) : null}

      {!loading ? (
        <View style={s.panel}>
          <View style={s.sectionHead}>
            <Text style={s.sectionTitle}>
              {
                TABS.find(
                  (item) => item.key === tab,
                )?.label
              }
            </Text>
            <Text style={s.sectionCount}>
              {rows.length}
            </Text>
          </View>

          {rows.map((row) => (
            <Pressable
              key={`${row.id}-${row.label}`}
              onPress={() => openRow(row)}
              style={s.row}
            >
              <View style={s.rowBody}>
                <View style={s.rowTop}>
                  <Text
                    style={s.rowTitle}
                    numberOfLines={2}
                  >
                    {row.label}
                  </Text>
                  <Text style={s.rowCount}>
                    {row.count}
                  </Text>
                </View>

                <View style={s.track}>
                  <View
                    style={[
                      s.fill,
                      {
                        width: `${Math.max(
                          3,
                          (row.count / max) * 100,
                        )}%`,
                      },
                    ]}
                  />
                </View>
              </View>

              <Ionicons
                name="chevron-forward"
                size={17}
                color={colors.cyan}
              />
            </Pressable>
          ))}

          {!rows.length ? (
            <View style={s.empty}>
              <Ionicons
                name="analytics-outline"
                size={30}
                color={colors.muted}
              />
              <Text style={s.emptyTitle}>
                No values for this period
              </Text>
              <Text style={s.emptyText}>
                Pull down to resync the 90-day snapshot.
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

function Kpi({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <View style={s.kpi}>
      <Text style={s.kpiValue}>
        {value}
      </Text>
      <Text style={s.kpiLabel}>
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
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
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
  scopePill: {
    borderRadius: 999,
    backgroundColor: '#E7F5EF',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  scopeText: {
    color: colors.primary,
    fontSize: 8,
    fontWeight: '900',
  },
  kpis: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 4,
  },
  kpi: {
    flex: 1,
    minHeight: 70,
    borderRadius: 15,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 11,
  },
  kpiValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  kpiLabel: {
    color: colors.muted,
    fontSize: 8,
    fontWeight: '800',
    marginTop: 4,
  },
  tabs: {
    gap: 7,
    paddingVertical: 14,
  },
  tab: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 11,
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: '900',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  detected: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    borderRadius: 13,
    backgroundColor: '#F2F8F5',
    padding: 11,
    marginBottom: 10,
  },
  detectedLabel: {
    color: colors.muted,
    fontSize: 8,
    fontWeight: '900',
  },
  detectedValue: {
    flex: 1,
    color: colors.primary,
    textAlign: 'right',
    fontSize: 9,
    fontWeight: '900',
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
  error: {
    borderRadius: 15,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 13,
  },
  errorTitle: {
    color: colors.text,
    fontWeight: '900',
  },
  errorText: {
    color: colors.muted,
    fontSize: 9,
    marginTop: 4,
  },
  panel: {
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 13,
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  sectionCount: {
    color: colors.primary,
    fontWeight: '900',
  },
  row: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 10,
  },
  rowBody: {
    flex: 1,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  rowTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 11,
    fontWeight: '900',
  },
  rowCount: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
  },
  track: {
    height: 5,
    borderRadius: 999,
    backgroundColor: '#E8F0ED',
    marginTop: 8,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 35,
  },
  emptyTitle: {
    color: colors.text,
    fontWeight: '900',
    marginTop: 8,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 9,
    marginTop: 4,
    textAlign: 'center',
  },
});
