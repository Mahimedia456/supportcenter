import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { HealthStatusCard } from '@/components/account/HealthStatusCard';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import {
  systemHealth,
  type SystemHealthSnapshot,
} from '@/lib/system-health';
import {
  cacheSummary,
  clearSupportCache,
  freshnessLabel,
} from '@/lib/cache';

type CacheSnapshot = Awaited<
  ReturnType<typeof cacheSummary>
>;

function readable(value?: string | null) {
  if (!value) return 'Not available';

  return new Date(value).toLocaleString(
    undefined,
    {
      dateStyle: 'medium',
      timeStyle: 'short',
    },
  );
}

export default function SystemHealthScreen() {
  const { session, ensureFreshSession } = useAuth();

  const [snapshot, setSnapshot] =
    useState<SystemHealthSnapshot | null>(null);
  const [cache, setCache] =
    useState<CacheSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');

    const fresh = await ensureFreshSession();
    const token =
      fresh?.accessToken || session?.accessToken;

    if (!token) {
      setError('Authenticated session unavailable.');
      setLoading(false);
      return;
    }

    try {
      const [healthResult, cacheResult] =
        await Promise.all([
          systemHealth(token),
          cacheSummary(),
        ]);

      setSnapshot(healthResult);
      setCache(cacheResult);
    } catch (e: any) {
      setError(
        e?.message ||
          'Unable to check system health.',
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

  function confirmClearCache() {
    Alert.alert(
      'Clear cached support data?',
      'Live data will be loaded again from the backend on the next screen refresh.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear Cache',
          style: 'destructive',
          onPress: async () => {
            await clearSupportCache();
            setCache(await cacheSummary());
          },
        },
      ],
    );
  }

  const healthy =
    snapshot &&
    [
      snapshot.backend,
      snapshot.database,
      snapshot.session,
      snapshot.zendesk,
    ].every((item) => item.state === 'healthy');

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
      <View style={s.header}>
        <Pressable
          onPress={() => router.back()}
          style={s.back}
        >
          <Text style={s.backText}>‹</Text>
        </Pressable>

        <View style={s.headerText}>
          <Text style={s.eyebrow}>
            SYSTEM STATUS
          </Text>
          <Text style={s.title}>
            System Health
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={s.loading}>
          <ActivityIndicator
            color={colors.primary}
          />
          <Text style={s.loadingText}>
            Checking services…
          </Text>
        </View>
      ) : null}

      {error ? (
        <View style={s.errorBox}>
          <Text style={s.errorTitle}>
            Health check incomplete
          </Text>
          <Text style={s.errorText}>{error}</Text>
        </View>
      ) : null}

      {snapshot ? (
        <>
          <View
            style={[
              s.summary,
              healthy
                ? s.summaryHealthy
                : s.summaryWarning,
            ]}
          >
            <View>
              <Text style={s.summaryEyebrow}>
                CURRENT STATE
              </Text>
              <Text style={s.summaryTitle}>
                {healthy
                  ? 'All core systems healthy'
                  : 'Attention may be required'}
              </Text>
              <Text style={s.summaryTime}>
                Checked {readable(snapshot.checkedAt)}
              </Text>
            </View>

            <View
              style={[
                s.summaryDot,
                {
                  backgroundColor: healthy
                    ? colors.lime
                    : colors.warning,
                },
              ]}
            />
          </View>

          <HealthStatusCard
            label={snapshot.backend.label}
            detail={snapshot.backend.detail}
            state={snapshot.backend.state}
          />
          <HealthStatusCard
            label={snapshot.database.label}
            detail={snapshot.database.detail}
            state={snapshot.database.state}
          />
          <HealthStatusCard
            label={snapshot.zendesk.label}
            detail={snapshot.zendesk.detail}
            state={snapshot.zendesk.state}
          />
          <HealthStatusCard
            label={snapshot.session.label}
            detail={snapshot.session.detail}
            state={snapshot.session.state}
          />

          <View style={s.cacheHeader}>
            <View>
              <Text style={s.cacheTitle}>
                Local data cache
              </Text>
              <Text style={s.cacheCaption}>
                Faster screens + stale fallback during temporary network issues
              </Text>
            </View>
          </View>

          <View style={s.cacheGrid}>
            <View style={s.cacheMetric}>
              <Text style={s.cacheValue}>
                {cache?.count ?? 0}
              </Text>
              <Text style={s.cacheLabel}>
                Cached resources
              </Text>
            </View>

            <View style={s.cacheMetric}>
              <Text style={s.cacheValue}>
                {cache?.staleFallbacks ?? 0}
              </Text>
              <Text style={s.cacheLabel}>
                Stale fallbacks
              </Text>
            </View>
          </View>

          <View style={s.freshnessCard}>
            <Text style={s.freshnessLabel}>
              LATEST NETWORK CACHE
            </Text>
            <Text style={s.freshnessValue}>
              {freshnessLabel(
                cache?.latestSavedAt,
              )}
            </Text>
            <Text style={s.freshnessTime}>
              {readable(cache?.latestSavedAt)}
            </Text>
          </View>

          <Pressable
            onPress={confirmClearCache}
            style={s.clearButton}
          >
            <Text style={s.clearButtonText}>
              Clear local support cache
            </Text>
          </Pressable>

          <View style={s.note}>
            <Text style={s.noteTitle}>
              Performance policy
            </Text>
            <Text style={s.noteText}>
              Zendesk metadata is cached longer than live ticket lists. Ticket lists automatically retry temporary failures and respect Retry-After on HTTP 429. If the network is unavailable, the most recent cached response is used when possible.
            </Text>
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 18,
    paddingTop: 22,
    paddingBottom: 80,
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
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    color: colors.text,
    fontSize: 34,
    lineHeight: 36,
    marginTop: -3,
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
    color: colors.muted,
    marginTop: 10,
  },
  errorBox: {
    backgroundColor: '#FFF5F5',
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
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
  summary: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 17,
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryHealthy: {
    backgroundColor: '#F2FAF6',
  },
  summaryWarning: {
    backgroundColor: '#FFF8E8',
  },
  summaryEyebrow: {
    color: colors.muted,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },
  summaryTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
    marginTop: 5,
  },
  summaryTime: {
    color: colors.muted,
    fontSize: 9,
    marginTop: 5,
  },
  summaryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 2,
  },
  cacheHeader: {
    marginTop: 22,
    marginBottom: 10,
  },
  cacheTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  cacheCaption: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
  },
  cacheGrid: {
    flexDirection: 'row',
    gap: 9,
  },
  cacheMetric: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  cacheValue: {
    color: colors.primary,
    fontSize: 23,
    fontWeight: '900',
  },
  cacheLabel: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: '800',
    marginTop: 5,
  },
  freshnessCard: {
    marginTop: 10,
    backgroundColor: colors.cyanSoft,
    borderRadius: 16,
    padding: 15,
  },
  freshnessLabel: {
    color: colors.cyan,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  freshnessValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
    marginTop: 6,
  },
  freshnessTime: {
    color: colors.muted,
    fontSize: 9,
    marginTop: 4,
  },
  clearButton: {
    marginTop: 10,
    minHeight: 48,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '900',
  },
  note: {
    marginTop: 14,
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
