
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
import {
  dimensionRows,
  fieldForDimension,
} from '@/lib/support-dimensions';

export default function Devices() {
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

      setSnapshot(
        await getZendeskDbSnapshot(accessToken),
      );
    } catch (e: any) {
      setError(
        e?.message ||
          'Unable to load devices.',
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
    } catch (e: any) {
      setError(
        e?.message ||
          'Unable to sync devices.',
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

  const rows = useMemo(
    () =>
      dimensionRows(
        tickets,
        snapshot?.fields || [],
        'device',
      ),
    [snapshot?.fields, tickets],
  );

  const detected =
    fieldForDimension(
      snapshot?.fields || [],
      'device',
    );

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
        DEVICE OPERATIONS
      </Text>
      <Text style={s.title}>
        Devices
      </Text>
      <Text style={s.caption}>
        Ticket activity grouped by device
      </Text>

      <SupportPeriodFilter
        value={period}
        onChange={setPeriod}
      />

      <View style={s.detected}>
        <Text style={s.detectedLabel}>
          DETECTED DEVICE FIELD
        </Text>
        <Text style={s.detectedValue}>
          {detected?.title || 'Not detected'}
        </Text>
      </View>

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
            Device data unavailable
          </Text>
          <Text style={s.errorText}>
            {error}
          </Text>
        </View>
      ) : null}

      {rows.map((row) => (
        <Pressable
          key={row.label}
          onPress={() =>
            router.push({
              pathname: '/device/[name]',
              params: {
                name: row.label,
              },
            })
          }
          style={s.card}
        >
          <View style={s.icon}>
            <Ionicons
              name="hardware-chip-outline"
              size={20}
              color={colors.primary}
            />
          </View>

          <View style={s.cardCopy}>
            <Text style={s.device}>
              {row.label}
            </Text>
            <Text style={s.count}>
              {row.count} tickets
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={18}
            color={colors.cyan}
          />
        </Pressable>
      ))}
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
  caption: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 4,
  },
  detected: {
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
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
    marginTop: 4,
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
  card: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 13,
    marginBottom: 9,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#E7F5EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCopy: {
    flex: 1,
  },
  device: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
  },
  count: {
    color: colors.muted,
    fontSize: 9,
    marginTop: 3,
  },
});
