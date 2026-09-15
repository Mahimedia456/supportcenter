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
import { router, type Href } from 'expo-router';
import { WorkspaceHeader } from '@/components/WorkspaceHeader';
import { AppCard } from '@/components/AppCard';
import { TicketCard } from '@/components/tickets/TicketCard';
import { AgentCard } from '@/components/team/AgentCard';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import * as api from '@/lib/api';
import {
  buildBreakdown,
  ticketsForDimension,
  type BreakdownRow,
} from '@/lib/insight-analytics';
import { detectedMapping } from '@/lib/zendesk-dimensions';
import {
  badFeedbackBreakdowns,
  buildAgentRows,
  feedbackSummary,
} from '@/lib/feedback-team';

type InsightTab =
  | 'forms'
  | 'issues'
  | 'devices'
  | 'regions'
  | 'feedback'
  | 'team';

const TABS: Array<{
  key: InsightTab;
  label: string;
}> = [
  { key: 'forms', label: 'Forms' },
  { key: 'issues', label: 'Issues' },
  { key: 'devices', label: 'Devices' },
  { key: 'regions', label: 'Regions' },
  { key: 'feedback', label: 'Feedback' },
  { key: 'team', label: 'Team' },
];

export default function Insights() {
  const { session, ensureFreshSession } = useAuth();

  const [tickets, setTickets] =
    useState<api.ZendeskTicket[]>([]);
  const [forms, setForms] =
    useState<api.ZendeskForm[]>([]);
  const [fields, setFields] =
    useState<api.ZendeskTicketField[]>([]);
  const [ratings, setRatings] =
    useState<api.ZendeskSatisfactionRating[]>([]);
  const [agents, setAgents] =
    useState<api.ZendeskUser[]>([]);
  const [tab, setTab] = useState<InsightTab>('forms');
  const [selected, setSelected] =
    useState<string | null>(null);
  const [refreshing, setRefreshing] =
    useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');

    const fresh = await ensureFreshSession();
    const token =
      fresh?.accessToken || session?.accessToken;

    if (!token) return;

    try {
      const [
        ticketResult,
        formResult,
        fieldResult,
        satisfactionResult,
        agentResult,
      ] = await Promise.all([
        api.zendeskAnalyticsTickets(token, 30),
        api.zendeskForms(token),
        api.zendeskFields(token),
        api.zendeskSatisfaction(token, 30),
        api.zendeskAgents(token),
      ]);

      setTickets(ticketResult.tickets || []);
      setForms(
        (formResult.ticket_forms || []).filter(
          (form) => form.active !== false,
        ),
      );
      setFields(
        (fieldResult.ticket_fields || []).filter(
          (field) => field.active !== false,
        ),
      );
      setRatings(satisfactionResult.ratings || []);
      setAgents(agentResult.users || []);
    } catch (e: any) {
      setError(
        e?.message ||
          'Unable to load Zendesk insight data.',
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

  const mapping = useMemo(
    () => detectedMapping(fields),
    [fields],
  );

  const feedback = useMemo(
    () => feedbackSummary(ratings),
    [ratings],
  );

  const bad = useMemo(
    () =>
      badFeedbackBreakdowns(
        ratings,
        tickets,
        fields,
        forms,
      ),
    [fields, forms, ratings, tickets],
  );

  const team = useMemo(
    () => buildAgentRows(agents, tickets, ratings),
    [agents, ratings, tickets],
  );

  const dimensionTab =
    tab === 'forms' ||
    tab === 'issues' ||
    tab === 'devices' ||
    tab === 'regions';

  const dimension =
    tab === 'forms'
      ? 'form'
      : tab === 'issues'
        ? 'issue'
        : tab === 'devices'
          ? 'device'
          : 'region';

  const rows = useMemo(
    () =>
      dimensionTab
        ? buildBreakdown(
            tickets,
            fields,
            forms,
            dimension,
          )
        : [],
    [dimension, dimensionTab, fields, forms, tickets],
  );

  const selectedTickets = useMemo(() => {
    if (!selected || !dimensionTab) return [];

    return ticketsForDimension(
      tickets,
      fields,
      forms,
      dimension,
      selected,
    );
  }, [
    dimension,
    dimensionTab,
    fields,
    forms,
    selected,
    tickets,
  ]);

  function switchTab(next: InsightTab) {
    setTab(next);
    setSelected(null);
  }

  function openTicket(id: number) {
    router.push({
      pathname: '/ticket/[id]',
      params: { id: String(id) },
    });
  }

  function openAgent(id: number) {
    router.push({
      pathname: '/agent/[id]',
      params: { id: String(id) },
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

      <View style={s.hero}>
        <View>
          <Text style={s.eyebrow}>
            30 DAY SUPPORT INSIGHTS
          </Text>
          <Text style={s.title}>
            Patterns that matter
          </Text>
          <Text style={s.caption}>
            Forms, issues, devices, regions, feedback and team workload
          </Text>
        </View>

        <View style={s.live}>
          <View style={s.liveDot} />
          <Text style={s.liveText}>LIVE</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.tabs}
      >
        {TABS.map((item) => (
          <Pressable
            key={item.key}
            onPress={() => switchTab(item.key)}
            style={[
              s.tab,
              tab === item.key && s.tabActive,
            ]}
          >
            <Text
              style={[
                s.tabText,
                tab === item.key && s.tabTextActive,
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {error ? (
        <AppCard style={s.errorCard}>
          <Text style={s.errorTitle}>
            Insights unavailable
          </Text>
          <Text style={s.errorText}>{error}</Text>
        </AppCard>
      ) : null}

      {loading ? (
        <View style={s.loading}>
          <ActivityIndicator color={colors.primary} />
          <Text style={s.loadingText}>
            Loading support insight dataâ€¦
          </Text>
        </View>
      ) : (
        <>
          {dimensionTab ? (
            <>
              <AppCard style={s.mappingCard}>
                <View style={s.mappingHeader}>
                  <Text style={s.mappingTitle}>
                    Custom-field mapping
                  </Text>
                  <Text style={s.mappingBadge}>
                    AUTO
                  </Text>
                </View>

                <MappingRow
                  label="Region"
                  value={
                    mapping.region
                      ? mapping.region.title
                      : 'Not detected'
                  }
                />
                <MappingRow
                  label="Device"
                  value={
                    mapping.device
                      ? mapping.device.title
                      : 'Not detected'
                  }
                />
                <MappingRow
                  label="Issue"
                  value={
                    mapping.issue
                      ? mapping.issue.title
                      : 'Not detected'
                  }
                />
              </AppCard>

              <View style={s.sectionHeader}>
                <View>
                  <Text style={s.sectionTitle}>
                    {
                      TABS.find(
                        (item) => item.key === tab,
                      )?.label
                    }
                  </Text>
                  <Text style={s.sectionCaption}>
                    Tap to see actual ticket subjects
                  </Text>
                </View>
                <Text style={s.countBadge}>
                  {rows.length}
                </Text>
              </View>

              <AppCard>
                {rows.slice(0, 30).map(
                  (row, index) => (
                    <InsightRow
                      key={row.key}
                      row={row}
                      last={
                        index ===
                        Math.min(rows.length, 30) - 1
                      }
                      selected={
                        selected === row.label
                      }
                      onPress={() =>
                        setSelected(
                          selected === row.label
                            ? null
                            : row.label,
                        )
                      }
                    />
                  ),
                )}
              </AppCard>

              {selected ? (
                <>
                  <View style={s.selectedHeader}>
                    <View>
                      <Text style={s.selectedEyebrow}>
                        RELATED TICKETS
                      </Text>
                      <Text style={s.selectedTitle}>
                        {selected}
                      </Text>
                    </View>
                    <Text style={s.selectedCount}>
                      {selectedTickets.length}
                    </Text>
                  </View>

                  {selectedTickets
                    .slice(0, 30)
                    .map((ticket) => (
                      <TicketCard
                        key={ticket.id}
                        ticket={ticket}
                        onPress={() =>
                          openTicket(ticket.id)
                        }
                      />
                    ))}
                </>
              ) : null}
            </>
          ) : null}

          {tab === 'feedback' ? (
            <>
              <View style={s.feedbackGrid}>
                <FeedbackCard
                  label="Total Ratings"
                  value={feedback.total}
                  tone="neutral"
                />
                <FeedbackCard
                  label="Good"
                  value={`${feedback.goodPct}%`}
                  caption={`${feedback.good} ratings`}
                  tone="good"
                />
                <FeedbackCard
                  label="Bad"
                  value={`${feedback.badPct}%`}
                  caption={`${feedback.bad} ratings`}
                  tone="bad"
                />
              </View>

              <BreakdownSection
                title="Bad feedback by device"
                rows={bad.devices}
              />
              <BreakdownSection
                title="Bad feedback by region"
                rows={bad.regions}
              />
              <BreakdownSection
                title="Bad feedback by form"
                rows={bad.forms}
              />

              <View style={s.selectedHeader}>
                <View>
                  <Text style={s.selectedEyebrow}>
                    BAD FEEDBACK TICKETS
                  </Text>
                  <Text style={s.selectedTitle}>
                    Recent negative ratings
                  </Text>
                </View>
                <Text style={s.selectedCount}>
                  {bad.rows.length}
                </Text>
              </View>

              {bad.rows.slice(0, 30).map(
                ({ rating, ticket }) =>
                  ticket ? (
                    <TicketCard
                      key={`${rating.id}-${ticket.id}`}
                      ticket={ticket}
                      onPress={() =>
                        openTicket(ticket.id)
                      }
                    />
                  ) : null,
              )}
            </>
          ) : null}

          {tab === 'team' ? (
            <>
              <View style={s.sectionHeader}>
                <View>
                  <Text style={s.sectionTitle}>
                    Team workload
                  </Text>
                  <Text style={s.sectionCaption}>
                    Assigned/open/high tickets + CSAT
                  </Text>
                </View>
                <Text style={s.countBadge}>
                  {team.length}
                </Text>
              </View>

              {team.map((row) => (
                <AgentCard
                  key={row.id}
                  row={row}
                  onPress={() => openAgent(row.id)}
                />
              ))}

              {!team.length ? (
                <View style={s.empty}>
                  <Text style={s.emptyText}>
                    No active agents returned.
                  </Text>
                </View>
              ) : null}
            </>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

function MappingRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={s.mapRow}>
      <Text style={s.mapLabel}>{label}</Text>
      <Text style={s.mapValue}>{value}</Text>
    </View>
  );
}

function InsightRow({
  row,
  last,
  selected,
  onPress,
}: {
  row: BreakdownRow;
  last: boolean;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        s.row,
        last && s.lastRow,
        selected && s.rowSelected,
      ]}
    >
      <View style={s.rowMain}>
        <Text style={s.rowLabel}>
          {row.label}
        </Text>
        <Text style={s.rowStats}>
          Open {row.open} â€¢ High {row.high} â€¢ Unassigned {row.unassigned}
        </Text>
      </View>

      <Text style={s.rowCount}>{row.count}</Text>
    </Pressable>
  );
}

function FeedbackCard({
  label,
  value,
  caption,
  tone,
}: {
  label: string;
  value: number | string;
  caption?: string;
  tone: 'neutral' | 'good' | 'bad';
}) {
  const bg =
    tone === 'good'
      ? colors.primarySoft
      : tone === 'bad'
        ? '#FDECEC'
        : colors.surface;

  const fg =
    tone === 'good'
      ? colors.primary
      : tone === 'bad'
        ? colors.danger
        : colors.text;

  return (
    <View style={[s.feedbackCard, { backgroundColor: bg }]}>
      <Text style={s.feedbackLabel}>{label}</Text>
      <Text style={[s.feedbackValue, { color: fg }]}>
        {value}
      </Text>
      {caption ? (
        <Text style={s.feedbackCaption}>
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

function BreakdownSection({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; count: number }>;
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));

  return (
    <>
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>{title}</Text>
      </View>
      <AppCard>
        {rows.slice(0, 8).map((row, index) => (
          <View
            key={row.label}
            style={[
              s.breakRow,
              index ===
                Math.min(rows.length, 8) - 1 &&
                s.lastRow,
            ]}
          >
            <View style={s.breakTop}>
              <Text style={s.breakLabel}>
                {row.label}
              </Text>
              <Text style={s.breakValue}>
                {row.count}
              </Text>
            </View>
            <View style={s.breakTrack}>
              <View
                style={[
                  s.breakFill,
                  {
                    width: `${Math.max(
                      6,
                      (row.count / max) * 100,
                    )}%`,
                  },
                ]}
              />
            </View>
          </View>
        ))}

        {!rows.length ? (
          <Text style={s.emptyText}>
            No bad feedback data available.
          </Text>
        ) : null}
      </AppCard>
    </>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 18,
    paddingBottom: 120,
  },
  hero: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  title: {
    color: colors.text,
    fontSize: 29,
    fontWeight: '900',
    marginTop: 4,
  },
  caption: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 4,
    maxWidth: 270,
  },
  live: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignSelf: 'flex-start',
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
  tabs: {
    paddingVertical: 16,
    gap: 7,
  },
  tab: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '800',
  },
  tabTextActive: {
    color: '#fff',
  },
  errorCard: {
    marginBottom: 12,
  },
  errorTitle: {
    color: colors.danger,
    fontWeight: '900',
  },
  errorText: {
    color: colors.text,
    marginTop: 5,
    fontSize: 12,
  },
  loading: {
    alignItems: 'center',
    paddingVertical: 70,
  },
  loadingText: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 10,
  },
  mappingCard: {
    backgroundColor: '#F4FAF7',
  },
  mappingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  mappingTitle: {
    color: colors.text,
    fontWeight: '900',
    fontSize: 13,
  },
  mappingBadge: {
    color: colors.cyan,
    backgroundColor: colors.cyanSoft,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 9,
    fontWeight: '900',
  },
  mapRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  mapLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
  },
  mapValue: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
  },
  sectionHeader: {
    marginTop: 22,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  countBadge: {
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: 10,
    fontWeight: '900',
    alignSelf: 'flex-start',
  },
  row: {
    minHeight: 64,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  rowSelected: {
    backgroundColor: '#F4FAF7',
  },
  rowMain: {
    flex: 1,
    paddingRight: 10,
  },
  rowLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  rowStats: {
    color: colors.muted,
    fontSize: 9,
    marginTop: 5,
  },
  rowCount: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  selectedHeader: {
    marginTop: 24,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  selectedEyebrow: {
    color: colors.cyan,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  selectedTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '900',
    marginTop: 3,
  },
  selectedCount: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: '900',
  },
  feedbackGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  feedbackCard: {
    flex: 1,
    minHeight: 116,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 17,
    padding: 14,
  },
  feedbackLabel: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: '800',
  },
  feedbackValue: {
    fontSize: 26,
    fontWeight: '900',
    marginTop: 11,
  },
  feedbackCaption: {
    color: colors.muted,
    fontSize: 9,
    marginTop: 5,
  },
  breakRow: {
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  breakTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  breakLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
    flex: 1,
  },
  breakValue: {
    color: colors.danger,
    fontWeight: '900',
    fontSize: 11,
  },
  breakTrack: {
    height: 6,
    backgroundColor: '#EEF2F1',
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 8,
  },
  breakFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.cyan,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 11,
    paddingVertical: 8,
  },
});





