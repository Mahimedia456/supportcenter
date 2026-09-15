import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { WorkspaceHeader } from '@/components/WorkspaceHeader';
import { OverviewDateFilter } from '@/components/overview/OverviewDateFilter';
import { AppCard } from '@/components/AppCard';
import { MetricCard } from '@/components/overview/MetricCard';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import * as api from '@/lib/api';
import {
  overviewMetrics,
  ticketsForPeriod,
  ticketsForDateRange,
  type OverviewPeriod,
} from '@/lib/overview';

const PERIODS: Array<{ key: OverviewPeriod; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: 'all', label: 'All' },
];

export default function Overview() {
  const { session, ensureFreshSession } = useAuth();
  const [tickets, setTickets] = useState<api.ZendeskTicket[]>([]);
  const [health, setHealth] = useState<api.ZendeskHealth | null>(null);
  const [period, setPeriod] = useState<OverviewPeriod>('7d');
  const [customFrom, setCustomFrom] = useState(() => { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d; });
  const [customTo, setCustomTo] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
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
      setError(
        'Manager session is unavailable. Please sign in again.',
      );
      return;
    }

    let hasTickets = false;
    let recentError: unknown = null;

    try {
      // Fast first paint: recent ticket endpoint was already
      // stable before the 90-day analytics phase.
      const recentResult =
        await api.zendeskRecentTickets(
          token,
        );

      setTickets(
        recentResult.tickets || [],
      );
      hasTickets = true;
      setLoading(false);
    } catch (e) {
      recentError = e;
    }

    // Health must never block Overview ticket metrics.
    void api
      .zendeskHealth(token)
      .then(setHealth)
      .catch(() => setHealth(null));

    try {
      // Upgrade the screen with a larger dataset in the
      // background. If this endpoint fails, keep recent data.
      const analyticsResult =
        await api.zendeskAllTickets(
          token,
        );

      setTickets(
        analyticsResult.tickets || [],
      );
      hasTickets = true;
      setError('');
    } catch (analyticsError: any) {
      if (!hasTickets) {
        const fallbackError: any =
          recentError ||
          analyticsError;

        setError(
          fallbackError?.message ||
            'Unable to load overview ticket data.',
        );
      }
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

  const periodTickets = useMemo(
    () => period === 'custom' ? ticketsForDateRange(tickets, customFrom, customTo) : ticketsForPeriod(tickets, period),
    [period, tickets, customFrom, customTo],
  );

  const metrics = useMemo(
    () => overviewMetrics(periodTickets),
    [periodTickets],
  );

  function openManagerView(view: string) {
    router.push({
      pathname: '/(tabs)/tickets',
      params: { managerView: view, mode: 'manager' },
    });
  }

  function openRegion(name: string) {
    router.push({
      pathname: '/region/[name]',
      params: { name },
    });
  }

  const maxRegion = Math.max(1, ...metrics.regionRows.map((r) => r.count));

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
      }
    >
      <WorkspaceHeader />

      <View style={s.hero}>
        <View>
          <Text style={s.eyebrow}>MANAGER OVERVIEW</Text>
          <Text style={s.title}>Support at a glance</Text>
          <Text style={s.caption}>
            {period === 'custom' ? `${customFrom.toLocaleDateString()} — ${customTo.toLocaleDateString()}` : health?.ok ? 'Live Zendesk snapshot' : 'Workspace snapshot'}
          </Text>
        </View>

        <View style={s.live}>
          <View style={s.liveDot} />
          <Text style={s.liveText}>{health?.ok ? 'LIVE' : 'SYNC'}</Text>
        </View>
      </View>

      <OverviewDateFilter
        period={period}
        from={customFrom}
        to={customTo}
        onPreset={(next) => setPeriod(next)}
        onCustom={(from, to) => { setCustomFrom(from); setCustomTo(to); setPeriod('custom'); }}
      />

      {error ? (
        <AppCard style={s.errorCard}>
          <Text style={s.errorTitle}>Overview unavailable</Text>
          <Text style={s.errorText}>{error}</Text>
        </AppCard>
      ) : null}

      {loading ? (
        <View style={s.loading}>
          <ActivityIndicator color={colors.primary} />
          <Text style={s.loadingText}>Loading manager overview…</Text>
        </View>
      ) : (
        <>
          <View style={s.gridRow}>
            <MetricCard
              label="Total Tickets"
              value={metrics.total}
              caption="Created in selected period"
              tone="green"
              onPress={() => openManagerView('recent')}
            />
            <MetricCard
              label="Open"
              value={metrics.open}
              caption="New + open"
              tone="cyan"
              onPress={() => openManagerView('open')}
            />
          </View>

          <View style={s.gridRow}>
            <MetricCard
              label="High Priority"
              value={metrics.highPriority}
              caption="High + urgent"
              tone="lime"
              onPress={() => openManagerView('priority')}
            />
            <MetricCard
              label="Unassigned"
              value={metrics.unassigned}
              caption="Needs ownership"
              tone="neutral"
              onPress={() => openManagerView('unassigned')}
            />
          </View>

          <View style={s.sectionHeader}>
            <View>
              <Text style={s.sectionTitle}>Regions</Text>
              <Text style={s.sectionCaption}>
                Quick load distribution from ticket metadata/tags
              </Text>
            </View>
          </View>

          <AppCard>
            {metrics.regionRows.map((row, index) => (
              <Pressable
                key={row.name}
                onPress={() => openRegion(row.name)}
                style={[s.regionRow, index === metrics.regionRows.length - 1 && s.lastRow]}
              >
                <View style={s.regionInfo}>
                  <View style={s.regionNameRow}>
                    <Text style={s.regionName}>{row.name}</Text>
                    <Text style={s.regionCount}>{row.count}</Text>
                  </View>
                  <View style={s.barTrack}>
                    <View
                      style={[
                        s.barFill,
                        { width: `${Math.max(6, (row.count / maxRegion) * 100)}%` },
                      ]}
                    />
                  </View>
                </View>
                <Text style={s.chevron}>›</Text>
              </Pressable>
            ))}

            {!metrics.regionRows.length ? (
              <Text style={s.emptyText}>No regional data available yet.</Text>
            ) : null}
          </AppCard>

          <View style={s.sectionHeader}>
            <View>
              <Text style={s.sectionTitle}>Needs attention</Text>
              <Text style={s.sectionCaption}>Fast operational checks</Text>
            </View>
          </View>

          <View style={s.attentionGrid}>
            <Pressable onPress={() => openManagerView('priority')} style={s.attentionCard}>
              <Text style={s.attentionValue}>{metrics.highPriority}</Text>
              <Text style={s.attentionLabel}>High / Urgent</Text>
            </Pressable>
            <Pressable onPress={() => openManagerView('unassigned')} style={s.attentionCard}>
              <Text style={s.attentionValue}>{metrics.unassigned}</Text>
              <Text style={s.attentionLabel}>Unassigned</Text>
            </Pressable>
            <Pressable onPress={() => openManagerView('pending')} style={s.attentionCard}>
              <Text style={s.attentionValue}>{metrics.pending}</Text>
              <Text style={s.attentionLabel}>Pending</Text>
            </Pressable>
          </View>

          <View style={s.note}>
            <Text style={s.noteTitle}>Read-only manager view</Text>
            <Text style={s.noteText}>
              Counts are derived from live Zendesk data. Region mapping becomes exact when Phase 09 binds your real Zendesk region/custom-field IDs.
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen:{flex:1,backgroundColor:colors.background},
  content:{padding:18,paddingBottom:120},
  hero:{marginTop:8,flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start'},
  eyebrow:{color:colors.primary,fontSize:9,fontWeight:'900',letterSpacing:1.2},
  title:{color:colors.text,fontSize:29,fontWeight:'900',marginTop:4},
  caption:{color:colors.muted,fontSize:12,marginTop:4},
  live:{backgroundColor:colors.primarySoft,borderRadius:999,paddingHorizontal:10,paddingVertical:7,flexDirection:'row',alignItems:'center',gap:6},
  liveDot:{width:7,height:7,borderRadius:4,backgroundColor:colors.lime},
  liveText:{color:colors.primary,fontSize:9,fontWeight:'900'},
  periodTabs:{marginTop:18,flexDirection:'row',backgroundColor:'#EAF1EE',padding:4,borderRadius:14,gap:4},
  periodTab:{flex:1,alignItems:'center',paddingVertical:10,borderRadius:11},
  periodTabActive:{backgroundColor:colors.surface},
  periodText:{color:colors.muted,fontSize:11,fontWeight:'800'},
  periodTextActive:{color:colors.primary},
  gridRow:{flexDirection:'row',gap:10,marginTop:10},
  sectionHeader:{marginTop:22,marginBottom:10},
  sectionTitle:{color:colors.text,fontSize:18,fontWeight:'900'},
  sectionCaption:{color:colors.muted,fontSize:11,marginTop:3},
  regionRow:{minHeight:68,flexDirection:'row',alignItems:'center',borderBottomWidth:1,borderBottomColor:colors.border},
  lastRow:{borderBottomWidth:0},
  regionInfo:{flex:1,paddingRight:12},
  regionNameRow:{flexDirection:'row',justifyContent:'space-between'},
  regionName:{color:colors.text,fontWeight:'900',fontSize:13},
  regionCount:{color:colors.primary,fontWeight:'900',fontSize:12},
  barTrack:{marginTop:10,height:7,borderRadius:999,backgroundColor:'#EAF1EE',overflow:'hidden'},
  barFill:{height:'100%',borderRadius:999,backgroundColor:colors.cyan},
  chevron:{fontSize:24,color:colors.muted},
  attentionGrid:{flexDirection:'row',gap:8},
  attentionCard:{flex:1,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,borderRadius:16,padding:14},
  attentionValue:{color:colors.primary,fontWeight:'900',fontSize:22},
  attentionLabel:{color:colors.muted,fontSize:10,fontWeight:'800',marginTop:5},
  note:{marginTop:18,padding:16,borderRadius:16,backgroundColor:colors.primarySoft},
  noteTitle:{color:colors.primary,fontWeight:'900',fontSize:12},
  noteText:{color:colors.muted,fontSize:11,lineHeight:17,marginTop:4},
  loading:{alignItems:'center',paddingVertical:70},
  loadingText:{color:colors.muted,marginTop:10,fontSize:12},
  errorCard:{marginTop:16},
  errorTitle:{color:colors.danger,fontWeight:'900'},
  errorText:{color:colors.text,fontSize:12,marginTop:5},
  emptyText:{color:colors.muted,paddingVertical:12},
});
