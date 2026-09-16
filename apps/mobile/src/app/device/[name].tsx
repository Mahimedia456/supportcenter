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
import { ViewDeviceTicketsButton } from '@/components/devices/ViewDeviceTicketsButton';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import * as api from '@/lib/api';
import {
  buildDeviceHealth,
  deviceTickets,
  regionsForDevice,
  topIssuesForDevice,
  type DeviceBreakdownRow,
} from '@/lib/device-health';

export default function DeviceDetail() {
  const params =
    useLocalSearchParams<{ name: string }>();

  const name = Array.isArray(params.name)
    ? params.name[0]
    : params.name || 'Unknown device';

  const {
    session,
    ensureFreshSession,
  } = useAuth();

  const [tickets, setTickets] =
    useState<api.ZendeskTicket[]>([]);
  const [forms, setForms] =
    useState<api.ZendeskForm[]>([]);
  const [fields, setFields] =
    useState<api.ZendeskTicketField[]>([]);
  const [agents, setAgents] =
    useState<api.ZendeskUser[]>([]);
  const [groups, setGroups] =
    useState<api.ZendeskGroup[]>([]);

  const [refreshing, setRefreshing] =
    useState(false);
  const [loading, setLoading] =
    useState(true);
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
      const [
        ticketResult,
        formResult,
        fieldResult,
        agentResult,
        groupResult,
      ] = await Promise.all([
        api.zendeskAllTickets(token),
        api.zendeskForms(token),
        api.zendeskFields(token),
        api.zendeskAgents(token),
        api.zendeskGroups(token),
      ]);

      setTickets(
        ticketResult.tickets || [],
      );
      setForms(
        formResult.ticket_forms || [],
      );
      setFields(
        fieldResult.ticket_fields || [],
      );
      setAgents(
        agentResult.users || [],
      );
      setGroups(
        groupResult.groups || [],
      );
    } catch (e: any) {
      setError(
        e?.message ||
          'Unable to load device detail.',
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

  const row = useMemo(
    () =>
      buildDeviceHealth(
        tickets,
        fields,
        forms,
      ).find(
        (item) =>
          item.device.toLowerCase() ===
          name.toLowerCase(),
      ),
    [fields, forms, name, tickets],
  );

  const related = useMemo<
    api.ZendeskTicket[]
  >(
    () =>
      deviceTickets(
        tickets,
        fields,
        forms,
        name,
      ),
    [fields, forms, name, tickets],
  );

  const issues = useMemo<
    DeviceBreakdownRow[]
  >(
    () =>
      topIssuesForDevice(
        tickets,
        fields,
        forms,
        name,
      ),
    [fields, forms, name, tickets],
  );

  const regions = useMemo<
    DeviceBreakdownRow[]
  >(
    () =>
      regionsForDevice(
        tickets,
        fields,
        forms,
        name,
      ),
    [fields, forms, name, tickets],
  );

  function openTicket(id: number) {
    router.push({
      pathname: '/ticket/[id]',
      params: { id: String(id) },
    });
  }

  const maxIssue = Math.max(
    1,
    ...issues.map(
      (item: DeviceBreakdownRow) =>
        item.count,
    ),
  );

  const maxRegion = Math.max(
    1,
    ...regions.map(
      (item: DeviceBreakdownRow) =>
        item.count,
    ),
  );

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
            style={({ pressed }) => [
              s.back,
              pressed && s.backPressed,
            ]}
            hitSlop={10}
          >
            <Ionicons
              name="chevron-back"
              size={23}
              color={colors.text}
            />
          </Pressable>

          <View style={s.headerText}>
            <Text style={s.eyebrow}>
              DEVICE HEALTH
            </Text>
            <Text
              style={s.title}
              numberOfLines={2}
            >
              {name}
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={s.loading}>
            <ActivityIndicator
              color={colors.primary}
            />
            <Text style={s.loadingText}>
              Loading device health…
            </Text>
          </View>
        ) : null}

        {error ? (
          <AppCard>
            <Text style={s.errorTitle}>
              Device data unavailable
            </Text>
            <Text style={s.errorText}>
              {error}
            </Text>
          </AppCard>
        ) : null}

        {!loading &&
        !error &&
        row ? (
          <>
            <View style={s.kpiGrid}>
              <Kpi
                label="Tickets"
                value={row.total}
              />
              <Kpi
                label="Open"
                value={row.open}
              />
              <Kpi
                label="Faulty"
                value={row.faulty}
                accent
              />
              <Kpi
                label="RMA"
                value={row.rma}
              />
            </View>

            <AppCard
              style={s.trendCard}
            >
              <View>
                <Text
                  style={s.trendLabel}
                >
                  LAST 7 DAYS
                </Text>
                <Text
                  style={s.trendValue}
                >
                  {row.last7Days}
                </Text>
              </View>

              <View
                style={s.trendDivider}
              />

              <View>
                <Text
                  style={s.trendLabel}
                >
                  PREVIOUS 7 DAYS
                </Text>
                <Text
                  style={s.trendValue}
                >
                  {row.previous7Days}
                </Text>
              </View>

              <View
                style={s.trendBadge}
              >
                <Text
                  style={
                    s.trendBadgeText
                  }
                >
                  {row.trendPct ===
                  null
                    ? '—'
                    : `${row.trendPct > 0 ? '+' : ''}${row.trendPct}%`}
                </Text>
              </View>
            </AppCard>

            <SectionTitle
              title="Top faults / issues"
              caption="Derived from Fault Category, Category and Support Type"
            />

            <AppCard>
              {issues
                .slice(0, 10)
                .map(
                  (
                    item: DeviceBreakdownRow,
                    index: number,
                  ) => (
                    <BarRow
                      key={item.label}
                      label={item.label}
                      value={item.count}
                      max={maxIssue}
                      last={
                        index ===
                        Math.min(
                          issues.length,
                          10,
                        ) -
                          1
                      }
                    />
                  ),
                )}

              {!issues.length ? (
                <Text
                  style={s.emptyText}
                >
                  No fault/category data
                  for this device.
                </Text>
              ) : null}
            </AppCard>

            <SectionTitle
              title="Regions"
              caption="Where this product is generating support load"
            />

            <AppCard>
              {regions
                .slice(0, 10)
                .map(
                  (
                    item: DeviceBreakdownRow,
                    index: number,
                  ) => (
                    <BarRow
                      key={item.label}
                      label={item.label}
                      value={item.count}
                      max={maxRegion}
                      cyan
                      last={
                        index ===
                        Math.min(
                          regions.length,
                          10,
                        ) -
                          1
                      }
                    />
                  ),
                )}
            </AppCard>

            <View
              style={s.relatedHeader}
            >
              <View>
                <Text
                  style={
                    s.relatedEyebrow
                  }
                >
                  READ-ONLY TICKETS
                </Text>
                <Text
                  style={
                    s.relatedTitle
                  }
                >
                  Related tickets
                </Text>
              </View>

              <Text
                style={s.relatedCount}
              >
                {related.length}
              </Text>
            </View>

            {related
              .slice(0, 40)
              .map(
                (
                  ticket: api.ZendeskTicket,
                ) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    agents={agents}
                    groups={groups}
                    forms={forms}
                    onPress={() =>
                      openTicket(
                        ticket.id,
                      )
                    }
                  />
                ),
              )}
          </>
        ) : null}

        {!loading &&
        !error &&
        !row ? (
          <AppCard>
            <Text style={s.emptyTitle}>
              Device not found
            </Text>
            <Text style={s.emptyText}>
              No ticket/custom-field data
              matched {name}.
            </Text>
          </AppCard>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Kpi({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <View style={s.kpi}>
      <Text
        style={[
          s.kpiValue,
          accent &&
            s.kpiValueAccent,
        ]}
      >
        {value}
      </Text>
      <Text style={s.kpiLabel}>
        {label}
      </Text>
    </View>
  );
}

function SectionTitle({
  title,
  caption,
}: {
  title: string;
  caption: string;
}) {
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionTitle}>
        {title}
      </Text>
      <Text
        style={s.sectionCaption}
      >
        {caption}
      </Text>
    </View>
  );
}

function BarRow({
  label,
  value,
  max,
  last,
  cyan = false,
}: {
  label: string;
  value: number;
  max: number;
  last: boolean;
  cyan?: boolean;
}) {
  return (
    <View
      style={[
        s.barRow,
        last && s.lastRow,
      ]}
    >
      <View style={s.barTop}>
        <Text style={s.barLabel}>
          {label}
        </Text>
        <Text style={s.barValue}>
          {value}
        </Text>
      </View>

      <View style={s.barTrack}>
        <View
          style={[
            s.barFill,
            cyan && s.barFillCyan,
            {
              width: `${Math.max(
                6,
                (value / max) * 100,
              )}%`,
            },
          ]}
        />
      </View>
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
    backgroundColor: colors.background,
  },
  content: {
    padding: 18,
    paddingTop: 10,
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
  backPressed: {
    backgroundColor: colors.primarySoft,
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
    paddingVertical: 65,
  },
  loadingText: {
    marginTop: 10,
    color: colors.muted,
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
  kpiGrid: {
    flexDirection: 'row',
    gap: 7,
  },
  kpi: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 15,
    padding: 12,
  },
  kpiValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  kpiValueAccent: {
    color: colors.primary,
  },
  kpiLabel: {
    color: colors.muted,
    fontSize: 8,
    fontWeight: '800',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  trendCard: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: '#F4FAF7',
  },
  trendLabel: {
    color: colors.muted,
    fontSize: 8,
    fontWeight: '800',
  },
  trendValue: {
    color: colors.text,
    fontSize: 21,
    fontWeight: '900',
    marginTop: 4,
  },
  trendDivider: {
    width: 1,
    height: 42,
    backgroundColor: colors.border,
  },
  trendBadge: {
    marginLeft: 'auto',
    backgroundColor: colors.cyanSoft,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  trendBadgeText: {
    color: colors.cyan,
    fontSize: 10,
    fontWeight: '900',
  },
  sectionHeader: {
    marginTop: 22,
    marginBottom: 10,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  sectionCaption: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 3,
  },
  barRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  barTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  barLabel: {
    flex: 1,
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  barValue: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
  },
  barTrack: {
    marginTop: 8,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#EAF1EE',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  barFillCyan: {
    backgroundColor: colors.cyan,
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
  emptyTitle: {
    color: colors.text,
    fontWeight: '900',
  },
  emptyText: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 15,
    paddingVertical: 10,
  },
});
