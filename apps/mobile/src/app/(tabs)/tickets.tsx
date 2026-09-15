import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { router } from 'expo-router';
import { WorkspaceHeader } from '@/components/WorkspaceHeader';
import { AppCard } from '@/components/AppCard';
import { TicketCard } from '@/components/tickets/TicketCard';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import * as api from '@/lib/api';
import {
  MANAGER_VIEWS,
  applyManagerView,
  sortTickets,
  ticketMatchesSearch,
  type ManagerViewKey,
  type TicketSortKey,
} from '@/types/ticket-filters';

type SourceMode = 'zendesk' | 'manager' | 'all';

const SORT_OPTIONS: Array<{ key: TicketSortKey; label: string }> = [
  { key: 'updated_desc', label: 'Latest' },
  { key: 'priority', label: 'Priority' },
  { key: 'created_desc', label: 'Newest' },
  { key: 'updated_asc', label: 'Oldest update' },
];

export default function Tickets() {
  const { session, ensureFreshSession } = useAuth();

  const [mode, setMode] = useState<SourceMode>('zendesk');
  const [views, setViews] = useState<api.ZendeskView[]>([]);
  const [tickets, setTickets] = useState<api.ZendeskTicket[]>([]);
  const [selectedView, setSelectedView] = useState<number | null>(null);
  const [managerView, setManagerView] = useState<ManagerViewKey>('attention');
  const [sort, setSort] = useState<TicketSortKey>('updated_desc');
  const [query, setQuery] = useState('');
  const [health, setHealth] = useState<api.ZendeskHealth | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const getToken = useCallback(async () => {
    const fresh = await ensureFreshSession();
    return fresh?.accessToken || session?.accessToken || null;
  }, [ensureFreshSession, session?.accessToken]);

  const loadBase = useCallback(
    async (targetMode: SourceMode = mode, targetView?: number | null) => {
      setError('');
      const accessToken = await getToken();
      if (!accessToken) return;

      try {
        const healthResult = await api.zendeskHealth(accessToken);
        setHealth(healthResult);

        if (targetMode === 'zendesk') {
          const viewResult = await api.zendeskViews(accessToken);
          const activeViews = (viewResult.views || []).filter(
            (view) => view.active !== false,
          );

          setViews(activeViews);

          const id = targetView ?? selectedView ?? activeViews[0]?.id ?? null;

          if (id) {
            setSelectedView(id);
            const result = await api.zendeskViewTickets(accessToken, id);
            setTickets(result.tickets || []);
          } else {
            setTickets([]);
          }
        } else {
          const result = await api.zendeskRecentTickets(accessToken);
          setTickets(result.tickets || []);
        }
      } catch (e: any) {
        setError(e?.message || 'Unable to load Zendesk tickets.');
      } finally {
        setLoading(false);
      }
    },
    [getToken, mode, selectedView],
  );

  useEffect(() => {
    void loadBase('zendesk');
  }, []);

  async function changeMode(next: SourceMode) {
    setMode(next);
    setLoading(true);
    await loadBase(next);
  }

  async function chooseZendeskView(id: number) {
    setSelectedView(id);
    setLoading(true);
    await loadBase('zendesk', id);
  }

  async function refresh() {
    setRefreshing(true);
    await loadBase(mode);
    setRefreshing(false);
  }

  const workingTickets = useMemo(() => {
    let result = tickets;

    if (mode === 'manager') {
      result = applyManagerView(result, managerView);
    }

    result = result.filter((ticket) => ticketMatchesSearch(ticket, query));
    return sortTickets(result, sort);
  }, [tickets, managerView, mode, query, sort]);

  const sourceTitle = useMemo(() => {
    if (mode === 'all') return 'All recent tickets';

    if (mode === 'manager') {
      return (
        MANAGER_VIEWS.find((item) => item.key === managerView)?.title ||
        'Manager View'
      );
    }

    return views.find((view) => view.id === selectedView)?.title || 'Zendesk View';
  }, [managerView, mode, selectedView, views]);

  function openTicket(ticketId: number) {
    router.push({
      pathname: '/ticket/[id]',
      params: { id: String(ticketId) },
    });
  }

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
      }
    >
      <WorkspaceHeader />

      <View style={s.hero}>
        <View style={s.heroText}>
          <Text style={s.eyebrow}>SUPPORT OPERATIONS</Text>
          <Text style={s.title}>Tickets</Text>
          <Text style={s.caption}>
            {health?.ok ? 'Zendesk connected' : 'Workspace tickets'} • read only
          </Text>
        </View>

        <View style={s.live}>
          <View style={s.liveDot} />
          <Text style={s.liveText}>{health?.ok ? 'LIVE' : 'SYNC'}</Text>
        </View>
      </View>

      <View style={s.modeTabs}>
        {[
          ['zendesk', 'Zendesk Views'],
          ['manager', 'Manager Views'],
          ['all', 'All Tickets'],
        ].map(([key, label]) => (
          <Pressable
            key={key}
            onPress={() => void changeMode(key as SourceMode)}
            style={[s.modeTab, mode === key && s.modeTabActive]}
          >
            <Text style={[s.modeTabText, mode === key && s.modeTabTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={s.searchBox}>
        <Text style={s.searchIcon}>⌕</Text>
        <TextInput
          placeholder="Search ticket #, subject, status, priority, tag..."
          placeholderTextColor={colors.muted}
          value={query}
          onChangeText={setQuery}
          style={s.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {query ? (
          <Pressable onPress={() => setQuery('')}>
            <Text style={s.clear}>×</Text>
          </Pressable>
        ) : null}
      </View>

      {mode === 'zendesk' ? (
        <>
          <Text style={s.sectionLabel}>ZENDESK VIEWS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.horizontalChips}>
            {views.map((view) => (
              <Pressable
                key={view.id}
                onPress={() => void chooseZendeskView(view.id)}
                style={[s.chip, selectedView === view.id && s.chipActive]}
              >
                <Text style={[s.chipText, selectedView === view.id && s.chipTextActive]}>
                  {view.title}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </>
      ) : null}

      {mode === 'manager' ? (
        <>
          <Text style={s.sectionLabel}>MANAGER QUICK VIEWS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.horizontalChips}>
            {MANAGER_VIEWS.map((item) => (
              <Pressable
                key={item.key}
                onPress={() => setManagerView(item.key)}
                style={[s.chip, managerView === item.key && s.chipActive]}
              >
                <Text style={[s.chipText, managerView === item.key && s.chipTextActive]}>
                  {item.title}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <AppCard style={s.managerInfo}>
            <Text style={s.managerInfoTitle}>
              {MANAGER_VIEWS.find((item) => item.key === managerView)?.title}
            </Text>
            <Text style={s.managerInfoText}>
              {MANAGER_VIEWS.find((item) => item.key === managerView)?.caption}
            </Text>
          </AppCard>
        </>
      ) : null}

      <View style={s.sortHeader}>
        <View>
          <Text style={s.resultTitle}>{sourceTitle}</Text>
          <Text style={s.resultCaption}>
            {workingTickets.length} ticket{workingTickets.length === 1 ? '' : 's'}
          </Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.sortChips}>
          {SORT_OPTIONS.map((item) => (
            <Pressable
              key={item.key}
              onPress={() => setSort(item.key)}
              style={[s.sortChip, sort === item.key && s.sortChipActive]}
            >
              <Text style={[s.sortChipText, sort === item.key && s.sortChipTextActive]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {error ? (
        <AppCard style={s.errorCard}>
          <Text style={s.errorTitle}>Zendesk data unavailable</Text>
          <Text style={s.errorText}>{error}</Text>
          <Text style={s.errorHint}>Pull down to retry.</Text>
        </AppCard>
      ) : null}

      {loading ? (
        <View style={s.loading}>
          <ActivityIndicator color={colors.primary} />
          <Text style={s.loadingText}>Loading support tickets…</Text>
        </View>
      ) : null}

      {!loading &&
        workingTickets.map((ticket) => (
          <TicketCard
            key={ticket.id}
            ticket={ticket}
            onPress={() => openTicket(ticket.id)}
          />
        ))}

      {!loading && !error && workingTickets.length === 0 ? (
        <View style={s.empty}>
          <View style={s.emptyIcon}>
            <Text style={s.emptyIconText}>✓</Text>
          </View>
          <Text style={s.emptyTitle}>Nothing to show here</Text>
          <Text style={s.emptyText}>
            Try another view, clear the search, or pull down to sync.
          </Text>
        </View>
      ) : null}

      <View style={s.readOnlyFooter}>
        <Text style={s.readOnlyFooterTitle}>Manager view only</Text>
        <Text style={s.readOnlyFooterText}>
          Ticket replies, assignments, internal notes and status changes stay in Zendesk.
        </Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen:{flex:1,backgroundColor:colors.background},
  content:{padding:18,paddingBottom:120},
  hero:{marginTop:8,flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start'},
  heroText:{flex:1,paddingRight:12},
  eyebrow:{color:colors.primary,fontWeight:'900',letterSpacing:1.2,fontSize:9},
  title:{color:colors.text,fontSize:30,fontWeight:'900',marginTop:3},
  caption:{color:colors.muted,fontSize:12,marginTop:3},
  live:{backgroundColor:colors.primarySoft,borderRadius:999,flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:10,paddingVertical:7},
  liveDot:{width:7,height:7,borderRadius:4,backgroundColor:colors.lime},
  liveText:{color:colors.primary,fontSize:9,fontWeight:'900'},
  modeTabs:{marginTop:18,flexDirection:'row',backgroundColor:'#EAF1EE',borderRadius:14,padding:4,gap:4},
  modeTab:{flex:1,alignItems:'center',paddingVertical:10,borderRadius:11},
  modeTabActive:{backgroundColor:colors.surface},
  modeTabText:{color:colors.muted,fontSize:10,fontWeight:'800'},
  modeTabTextActive:{color:colors.primary},
  searchBox:{marginTop:14,minHeight:50,backgroundColor:colors.surface,borderRadius:15,borderWidth:1,borderColor:colors.border,paddingHorizontal:14,flexDirection:'row',alignItems:'center'},
  searchIcon:{color:colors.cyan,fontSize:21,marginRight:8},
  searchInput:{flex:1,color:colors.text,fontSize:13},
  clear:{color:colors.muted,fontSize:24,paddingLeft:10},
  sectionLabel:{marginTop:18,color:colors.muted,fontWeight:'900',letterSpacing:1,fontSize:9},
  horizontalChips:{paddingVertical:11,gap:8},
  chip:{backgroundColor:colors.surface,borderRadius:999,borderWidth:1,borderColor:colors.border,paddingHorizontal:13,paddingVertical:9},
  chipActive:{backgroundColor:colors.primary,borderColor:colors.primary},
  chipText:{color:colors.muted,fontSize:11,fontWeight:'800'},
  chipTextActive:{color:'#fff'},
  managerInfo:{backgroundColor:'#F1F8F5',marginBottom:8},
  managerInfoTitle:{color:colors.text,fontWeight:'900',fontSize:13},
  managerInfoText:{marginTop:4,color:colors.muted,fontSize:11,lineHeight:16},
  sortHeader:{marginTop:10,marginBottom:12},
  resultTitle:{color:colors.text,fontSize:18,fontWeight:'900'},
  resultCaption:{color:colors.muted,fontSize:11,marginTop:3},
  sortChips:{paddingTop:10,gap:7},
  sortChip:{borderRadius:999,paddingHorizontal:10,paddingVertical:7,backgroundColor:'#EEF4F2'},
  sortChipActive:{backgroundColor:colors.cyanSoft},
  sortChipText:{color:colors.muted,fontSize:10,fontWeight:'800'},
  sortChipTextActive:{color:colors.cyan},
  loading:{alignItems:'center',paddingVertical:50},
  loadingText:{marginTop:10,color:colors.muted,fontSize:12},
  errorCard:{marginBottom:12},
  errorTitle:{color:colors.danger,fontWeight:'900',fontSize:13},
  errorText:{color:colors.text,fontSize:12,marginTop:5},
  errorHint:{color:colors.muted,fontSize:11,marginTop:6},
  empty:{alignItems:'center',paddingVertical:52,paddingHorizontal:28},
  emptyIcon:{width:48,height:48,borderRadius:24,backgroundColor:colors.primarySoft,alignItems:'center',justifyContent:'center'},
  emptyIconText:{color:colors.primary,fontSize:20,fontWeight:'900'},
  emptyTitle:{color:colors.text,fontWeight:'900',fontSize:16,marginTop:12},
  emptyText:{color:colors.muted,fontSize:12,textAlign:'center',marginTop:5,lineHeight:18},
  readOnlyFooter:{marginTop:16,padding:16,borderRadius:16,backgroundColor:colors.primarySoft},
  readOnlyFooterTitle:{color:colors.primary,fontWeight:'900',fontSize:12},
  readOnlyFooterText:{color:colors.muted,fontSize:11,lineHeight:17,marginTop:4},
});
