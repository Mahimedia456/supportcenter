import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SupportPeriodFilter } from '@/components/SupportPeriodFilter';
import { colors } from '@/constants/theme';
import { useGlobalSupportSnapshot } from '@/hooks/useGlobalSupportSnapshot';
import {
  DEFAULT_SUPPORT_PERIOD,
  filterTicketsBySupportPeriod,
  type SupportPeriod,
} from '@/lib/support-period';
import {
  dispositionLabel,
  rmaCategoryRows,
  rmaTicketInfo,
  shipmentLabel,
  type RmaDisposition,
  type RmaShipmentState,
} from '@/lib/rma-analytics';
import type { ZendeskTicket } from '@/lib/api';

type StatusFilter = 'all' | 'new' | 'open' | 'pending' | 'hold' | 'solved';
type ShipmentFilter = 'all' | RmaShipmentState;
type OutcomeFilter = 'all' | RmaDisposition;

export default function RmaResults() {
  const params = useLocalSearchParams<{
    device?: string;
    category?: string;
    workflow?: string;
    outcome?: string;
    title?: string;
  }>();

  const { snapshot, loading, refreshing, error, refresh } = useGlobalSupportSnapshot();
  const [period, setPeriod] = useState<SupportPeriod>(DEFAULT_SUPPORT_PERIOD);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [shipment, setShipment] = useState<ShipmentFilter>(
    isShipment(params.workflow) ? params.workflow : 'all',
  );
  const [outcome, setOutcome] = useState<OutcomeFilter>(
    isOutcome(params.outcome) ? params.outcome : 'all',
  );
  const [category, setCategory] = useState(String(params.category || ''));

  const fields = snapshot?.fields || [];
  const forms = snapshot?.forms || [];

  const categories = useMemo(() => {
    if (!snapshot) return [];
    const tickets = filterTicketsBySupportPeriod(snapshot.tickets, period);
    return rmaCategoryRows(tickets, fields, forms);
  }, [snapshot, period, fields, forms]);

  const rows = useMemo(() => {
    if (!snapshot) return [];

    let tickets = filterTicketsBySupportPeriod(snapshot.tickets, period).filter(
      (ticket) => rmaTicketInfo(ticket, fields, forms).isRma,
    );

    const deviceWanted = String(params.device || '').trim().toLowerCase();
    if (deviceWanted) {
      tickets = tickets.filter(
        (ticket) => rmaTicketInfo(ticket, fields, forms).device.toLowerCase() === deviceWanted,
      );
    }

    if (category) {
      const wanted = category.trim().toLowerCase();
      tickets = tickets.filter(
        (ticket) => rmaTicketInfo(ticket, fields, forms).category.toLowerCase() === wanted,
      );
    }

    if (shipment !== 'all') {
      tickets = tickets.filter(
        (ticket) => rmaTicketInfo(ticket, fields, forms).shipment === shipment,
      );
    }

    if (outcome !== 'all') {
      tickets = tickets.filter(
        (ticket) => rmaTicketInfo(ticket, fields, forms).disposition === outcome,
      );
    }

    if (status !== 'all') {
      tickets = tickets.filter(
        (ticket) => String(ticket.status || '').toLowerCase() === status,
      );
    }

    const needle = query.trim().toLowerCase();
    if (needle) {
      tickets = tickets.filter((ticket) => {
        const info = rmaTicketInfo(ticket, fields, forms);
        return [
          ticket.id,
          ticket.subject || '',
          ticket.description || '',
          ticket.status || '',
          ticket.priority || '',
          info.device,
          info.category,
          shipmentLabel(info.shipment),
          dispositionLabel(info.disposition),
          ...(ticket.tags || []),
        ]
          .join(' ')
          .toLowerCase()
          .includes(needle);
      });
    }

    return [...tickets].sort(
      (a, b) =>
        new Date(b.updated_at || b.created_at || 0).getTime() -
        new Date(a.updated_at || a.created_at || 0).getTime(),
    );
  }, [snapshot, period, fields, forms, params.device, category, shipment, outcome, status, query]);

  const header = (
    <>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.back}>
          <Ionicons name="chevron-back" size={23} color={colors.text} />
        </Pressable>
        <View style={s.headerCopy}>
          <Text style={s.eyebrow}>RMA TICKET RESULTS</Text>
          <Text style={s.title} numberOfLines={2}>
            {params.title || params.device || category || 'RMA tickets'}
          </Text>
          <Text style={s.caption}>{rows.length} matching RMA tickets</Text>
        </View>
      </View>

      <SupportPeriodFilter value={period} onChange={setPeriod} />

      <View style={s.search}>
        <Ionicons name="search-outline" size={18} color={colors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search RMA tickets"
          placeholderTextColor={colors.muted}
          style={s.searchInput}
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>

      <FilterLabel text="Ticket status" />
      <HorizontalChips
        items={['all', 'new', 'open', 'pending', 'hold', 'solved']}
        value={status}
        onChange={(value) => setStatus(value as StatusFilter)}
        label={(value) => capitalize(value)}
      />

      <FilterLabel text="RMA workflow" />
      <HorizontalChips
        items={['all', 'pending_ship', 'shipped', 'returned', 'unknown']}
        value={shipment}
        onChange={(value) => setShipment(value as ShipmentFilter)}
        label={(value) => (value === 'all' ? 'All' : shipmentLabel(value as RmaShipmentState))}
      />

      <FilterLabel text="Repair outcome" />
      <HorizontalChips
        items={['all', 'repair', 'replacement', 'unknown']}
        value={outcome}
        onChange={(value) => setOutcome(value as OutcomeFilter)}
        label={(value) => (value === 'all' ? 'All' : dispositionLabel(value as RmaDisposition))}
      />

      {categories.length ? (
        <>
          <FilterLabel text="RMA category" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
            <Chip label="All categories" active={!category} onPress={() => setCategory('')} />
            {categories.map((item) => (
              <Chip
                key={item.category}
                label={`${item.category} (${item.count})`}
                active={category === item.category}
                onPress={() => setCategory(item.category)}
              />
            ))}
          </ScrollView>
        </>
      ) : null}

      {error ? (
        <View style={s.state}>
          <Text style={s.errorTitle}>Using saved RMA data</Text>
          <Text style={s.stateText}>{error}</Text>
        </View>
      ) : null}

      {loading && !snapshot ? (
        <View style={s.state}>
          <Text style={s.stateTitle}>Initializing RMA data...</Text>
        </View>
      ) : null}
    </>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
      <FlatList
        style={s.screen}
        contentContainerStyle={s.content}
        data={rows}
        keyExtractor={(ticket) => String(ticket.id)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
        }
        ListHeaderComponent={header}
        renderItem={({ item }) => (
          <RmaTicketCard ticket={item} snapshot={snapshot} />
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={s.empty}>
              <Ionicons name="repeat-outline" size={30} color={colors.primary} />
              <Text style={s.emptyTitle}>No RMA tickets match these filters</Text>
              <Text style={s.emptyText}>Change the period, workflow, outcome or category filter.</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

function RmaTicketCard({ ticket, snapshot }: { ticket: ZendeskTicket; snapshot: any }) {
  const info = rmaTicketInfo(ticket, snapshot?.fields || [], snapshot?.forms || []);
  const agent = snapshot?.agents?.find((x: any) => Number(x.id) === Number(ticket.assignee_id));

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/ticket/[id]', params: { id: String(ticket.id) } } as unknown as Href)}
      style={({ pressed }) => [s.ticket, pressed && { opacity: 0.76 }]}
    >
      <View style={s.ticketTop}>
        <Text style={s.ticketId}>#{ticket.id}</Text>
        <Text style={s.ticketStatus}>{String(ticket.status || '')}</Text>
      </View>

      <Text style={s.subject} numberOfLines={2}>
        {ticket.subject || 'Untitled RMA ticket'}
      </Text>

      <View style={s.badges}>
        <Badge text={shipmentLabel(info.shipment)} />
        <Badge text={dispositionLabel(info.disposition)} secondary />
      </View>

      <View style={s.metaGrid}>
        <Meta label="Device" value={info.device} />
        <Meta label="RMA category" value={info.category} />
        <Meta label="Assignee" value={agent?.name || agent?.email || 'Unassigned'} />
      </View>

      {info.shippedDate || info.returnedDate ? (
        <View style={s.dateRow}>
          {info.shippedDate ? <Text style={s.dateText}>Shipped: {info.shippedDate}</Text> : null}
          {info.returnedDate ? <Text style={s.dateText}>Returned: {info.returnedDate}</Text> : null}
        </View>
      ) : null}
    </Pressable>
  );
}

function FilterLabel({ text }: { text: string }) {
  return <Text style={s.filterLabel}>{text.toUpperCase()}</Text>;
}

function HorizontalChips({
  items,
  value,
  onChange,
  label,
}: {
  items: string[];
  value: string;
  onChange: (value: string) => void;
  label: (value: string) => string;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
      {items.map((item) => (
        <Chip key={item} label={label(item)} active={value === item} onPress={() => onChange(item)} />
      ))}
    </ScrollView>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, active && s.chipActive]}>
      <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Badge({ text, secondary = false }: { text: string; secondary?: boolean }) {
  return (
    <View style={[s.badge, secondary && s.badgeSecondary]}>
      <Text style={[s.badgeText, secondary && s.badgeTextSecondary]}>{text}</Text>
    </View>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.meta}>
      <Text style={s.metaLabel}>{label}</Text>
      <Text style={s.metaValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function isShipment(value: unknown): value is RmaShipmentState {
  return ['pending_ship', 'shipped', 'returned', 'unknown'].includes(String(value || ''));
}

function isOutcome(value: unknown): value is RmaDisposition {
  return ['repair', 'replacement', 'unknown'].includes(String(value || ''));
}

function capitalize(value: string) {
  if (value === 'all') return 'All';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  screen: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 5, paddingBottom: 100 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, marginBottom: 2 },
  back: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1 },
  eyebrow: { color: colors.primary, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  title: { color: colors.text, fontSize: 22, fontWeight: '900', marginTop: 2 },
  caption: { color: colors.muted, fontSize: 9, marginTop: 2 },
  search: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 12 },
  searchInput: { flex: 1, color: colors.text, fontSize: 11 },
  filterLabel: { color: colors.primary, fontSize: 8, fontWeight: '900', letterSpacing: 0.7, marginTop: 12, marginBottom: -3 },
  chips: { gap: 7, paddingVertical: 10 },
  chip: { borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 11, paddingVertical: 7 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.muted, fontSize: 9, fontWeight: '800' },
  chipTextActive: { color: '#fff' },
  state: { borderRadius: 15, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 10 },
  stateTitle: { color: colors.text, fontWeight: '900' },
  stateText: { color: colors.muted, fontSize: 9, marginTop: 4 },
  errorTitle: { color: '#B42318', fontWeight: '900' },
  ticket: { borderRadius: 17, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 13, marginBottom: 9 },
  ticketTop: { flexDirection: 'row', justifyContent: 'space-between' },
  ticketId: { color: colors.primary, fontWeight: '900', fontSize: 10 },
  ticketStatus: { color: colors.muted, fontWeight: '800', fontSize: 9, textTransform: 'capitalize' },
  subject: { color: colors.text, fontSize: 13, fontWeight: '900', marginTop: 7 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  badge: { borderRadius: 999, backgroundColor: colors.primarySoft, paddingHorizontal: 9, paddingVertical: 5 },
  badgeSecondary: { backgroundColor: '#EEF7FA' },
  badgeText: { color: colors.primary, fontSize: 8, fontWeight: '900' },
  badgeTextSecondary: { color: colors.cyan },
  metaGrid: { flexDirection: 'row', gap: 7, marginTop: 10 },
  meta: { flex: 1, minHeight: 53, borderRadius: 10, backgroundColor: colors.background, padding: 8 },
  metaLabel: { color: colors.muted, fontSize: 7, fontWeight: '800' },
  metaValue: { color: colors.text, fontSize: 9, fontWeight: '900', marginTop: 3 },
  dateRow: { marginTop: 9, gap: 3 },
  dateText: { color: colors.muted, fontSize: 8, fontWeight: '700' },
  empty: { paddingVertical: 36, alignItems: 'center' },
  emptyTitle: { color: colors.text, fontSize: 12, fontWeight: '900', marginTop: 9 },
  emptyText: { color: colors.muted, fontSize: 9, lineHeight: 14, marginTop: 4, textAlign: 'center' },
});
