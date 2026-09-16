
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
} from '@/lib/support-dimensions';

export default function DeviceDetail() {
  const { name = '' } =
    useLocalSearchParams<{ name: string }>();

  const device =
    decodeURIComponent(String(name));

  const {
    session,
    ensureFreshSession,
  } = useAuth();

  const cached = peekZendeskDbSnapshot();

  const [snapshot, setSnapshot] =
    useState<ZendeskDbSnapshot | null>(cached);
  const [period, setPeriod] =
    useState<SupportPeriod>(DEFAULT_SUPPORT_PERIOD);
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

  const deviceTickets = useMemo(() => {
    if (!snapshot) return [];

    const periodTickets =
      filterTicketsBySupportPeriod(
        snapshot.tickets || [],
        period,
      );

    const wanted =
      device.trim().toLowerCase();

    return periodTickets.filter(
      (ticket) =>
        dimensionValue(
          ticket,
          snapshot.fields || [],
          'device',
        )
          .split(',')
          .map((item: string) =>
            item.trim().toLowerCase(),
          )
          .includes(wanted),
    );
  }, [
    device,
    period,
    snapshot,
  ]);

  const openCount =
    deviceTickets.filter(
      (ticket) =>
        String(ticket.status || '').toLowerCase() ===
        'open',
    ).length;

  const faultyCount =
    deviceTickets.filter(
      (ticket) =>
        isTruthyDimension(
          dimensionValue(
            ticket,
            snapshot?.fields || [],
            'faultCategory',
          ),
        ),
    ).length;

  const rmaCount =
    deviceTickets.filter(
      (ticket) =>
        isTruthyDimension(
          dimensionValue(
            ticket,
            snapshot?.fields || [],
            'rma',
          ),
        ),
    ).length;

  const unassignedCount =
    deviceTickets.filter(
      (ticket) => !ticket.assignee_id,
    ).length;

  function openTickets(
    title: string,
    preset?: string,
  ) {
    router.push({
      pathname: '/ticket-results',
      params: {
        role: 'device',
        value: device,
        title,
        ...(preset
          ? { preset }
          : {}),
      },
    });
  }

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
          >
            <Ionicons
              name="chevron-back"
              size={23}
              color={colors.text}
            />
          </Pressable>

          <View style={s.headerCopy}>
            <Text style={s.eyebrow}>
              DEVICE
            </Text>
            <Text
              style={s.title}
              numberOfLines={2}
            >
              {device}
            </Text>
            <Text style={s.caption}>
              Device-specific support activity
            </Text>
          </View>
        </View>

        <SupportPeriodFilter
          value={period}
          onChange={setPeriod}
        />

        {loading ? (
          <View style={s.loading}>
            <ActivityIndicator
              color={colors.primary}
            />
            <Text style={s.loadingText}>
              Initializing support data…
            </Text>
          </View>
        ) : (
          <>
            <View style={s.grid}>
              <Metric
                label="Open"
                value={openCount}
                icon="folder-open-outline"
                onPress={() =>
                  openTickets(
                    `${device} · Open`,
                    'open',
                  )
                }
              />
              <Metric
                label="Faulty"
                value={faultyCount}
                icon="warning-outline"
                onPress={() =>
                  openTickets(
                    `${device} · Faulty`,
                    'faulty',
                  )
                }
              />
              <Metric
                label="RMA"
                value={rmaCount}
                icon="repeat-outline"
                onPress={() =>
                  openTickets(
                    `${device} · RMA`,
                    'rma',
                  )
                }
              />
              <Metric
                label="Unassigned"
                value={unassignedCount}
                icon="person-remove-outline"
                onPress={() =>
                  openTickets(
                    `${device} · Unassigned`,
                    'unassigned',
                  )
                }
              />
            </View>

            <Pressable
              onPress={() =>
                openTickets(
                  `${device} · All tickets`,
                )
              }
              style={s.allButton}
            >
              <Text style={s.allButtonText}>
                View all {deviceTickets.length} tickets
              </Text>
              <Ionicons
                name="arrow-forward"
                size={18}
                color="#FFFFFF"
              />
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({
  label,
  value,
  icon,
  onPress,
}: {
  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={s.metric}
    >
      <View style={s.metricIcon}>
        <Ionicons
          name={icon}
          size={19}
          color={colors.primary}
        />
      </View>
      <Text style={s.metricValue}>
        {value}
      </Text>
      <Text style={s.metricLabel}>
        {label}
      </Text>
    </Pressable>
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
    gap: 11,
    alignItems: 'flex-start',
  },
  back: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },
  title: {
    color: colors.text,
    fontSize: 23,
    fontWeight: '900',
    marginTop: 2,
  },
  caption: {
    color: colors.muted,
    fontSize: 9,
    marginTop: 3,
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    marginTop: 8,
  },
  metric: {
    width: '48%',
    minHeight: 125,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  metricIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#E7F5EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    color: colors.text,
    fontSize: 25,
    fontWeight: '900',
    marginTop: 12,
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: '900',
    marginTop: 3,
  },
  allButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 13,
  },
  allButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 11,
  },
});
