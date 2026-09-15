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
import { router, useLocalSearchParams } from 'expo-router';
import { AppCard } from '@/components/AppCard';
import { TicketCard } from '@/components/tickets/TicketCard';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import * as api from '@/lib/api';
import { deriveRegion, overviewMetrics } from '@/lib/overview';

export default function RegionDetail() {
  const params = useLocalSearchParams<{ name: string }>();
  const name = Array.isArray(params.name) ? params.name[0] : params.name || 'Other';

  const { session, ensureFreshSession } = useAuth();
  const [tickets, setTickets] = useState<api.ZendeskTicket[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    const fresh = await ensureFreshSession();
    const token = fresh?.accessToken || session?.accessToken;
    if (!token) return;

    try {
      const result = await api.zendeskRecentTickets(token);
      setTickets(result.tickets || []);
    } catch (e: any) {
      setError(e?.message || 'Unable to load region tickets.');
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

  const regionTickets = useMemo(
    () => tickets.filter((ticket) => deriveRegion(ticket) === name),
    [name, tickets],
  );

  const metrics = useMemo(() => overviewMetrics(regionTickets), [regionTickets]);

  function openTicket(id: number) {
    router.push({
      pathname: '/ticket/[id]',
      params: { id: String(id) },
    });
  }

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
    >
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.back}>
          <Text style={s.backText}>‹</Text>
        </Pressable>
        <View>
          <Text style={s.eyebrow}>REGION</Text>
          <Text style={s.title}>{name}</Text>
        </View>
      </View>

      {loading ? (
        <View style={s.loading}>
          <ActivityIndicator color={colors.primary} />
          <Text style={s.loadingText}>Loading region…</Text>
        </View>
      ) : null}

      {error ? (
        <AppCard>
          <Text style={s.error}>{error}</Text>
        </AppCard>
      ) : null}

      {!loading && !error ? (
        <>
          <View style={s.kpiRow}>
            <View style={s.kpi}>
              <Text style={s.kpiValue}>{metrics.total}</Text>
              <Text style={s.kpiLabel}>Tickets</Text>
            </View>
            <View style={s.kpi}>
              <Text style={s.kpiValue}>{metrics.open}</Text>
              <Text style={s.kpiLabel}>Open</Text>
            </View>
            <View style={s.kpi}>
              <Text style={s.kpiValue}>{metrics.highPriority}</Text>
              <Text style={s.kpiLabel}>High</Text>
            </View>
            <View style={s.kpi}>
              <Text style={s.kpiValue}>{metrics.unassigned}</Text>
              <Text style={s.kpiLabel}>Unassigned</Text>
            </View>
          </View>

          <Text style={s.sectionTitle}>Related tickets</Text>
          <Text style={s.sectionCaption}>
            Ticket subjects and current Zendesk status
          </Text>

          {regionTickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} onPress={() => openTicket(ticket.id)} />
          ))}

          {!regionTickets.length ? (
            <View style={s.empty}>
              <Text style={s.emptyTitle}>No tickets mapped to {name}</Text>
              <Text style={s.emptyText}>
                Exact region custom-field mapping will be added in Phase 09.
              </Text>
            </View>
          ) : null}
        </>
      ) : null}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen:{flex:1,backgroundColor:colors.background},
  content:{padding:18,paddingTop:22,paddingBottom:80},
  header:{flexDirection:'row',alignItems:'center',gap:12,marginBottom:18},
  back:{width:44,height:44,borderRadius:22,backgroundColor:colors.surface,borderWidth:1,borderColor:colors.border,alignItems:'center',justifyContent:'center'},
  backText:{fontSize:34,lineHeight:36,color:colors.text,marginTop:-3},
  eyebrow:{fontSize:9,fontWeight:'900',letterSpacing:1.2,color:colors.primary},
  title:{fontSize:28,fontWeight:'900',color:colors.text,marginTop:2},
  loading:{alignItems:'center',paddingVertical:60},
  loadingText:{marginTop:10,color:colors.muted},
  error:{color:colors.danger,fontWeight:'700'},
  kpiRow:{flexDirection:'row',gap:7,marginBottom:20},
  kpi:{flex:1,backgroundColor:colors.surface,borderRadius:15,borderWidth:1,borderColor:colors.border,paddingVertical:13,paddingHorizontal:8},
  kpiValue:{color:colors.primary,fontWeight:'900',fontSize:20},
  kpiLabel:{color:colors.muted,fontSize:9,fontWeight:'800',marginTop:4},
  sectionTitle:{color:colors.text,fontSize:18,fontWeight:'900'},
  sectionCaption:{color:colors.muted,fontSize:11,marginTop:4,marginBottom:12},
  empty:{alignItems:'center',paddingVertical:45},
  emptyTitle:{color:colors.text,fontWeight:'900'},
  emptyText:{color:colors.muted,fontSize:11,textAlign:'center',marginTop:5},
});
