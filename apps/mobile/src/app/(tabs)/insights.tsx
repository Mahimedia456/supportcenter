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
import { WorkspaceHeader } from '@/components/WorkspaceHeader';
import { AppCard } from '@/components/AppCard';
import { AgentCard } from '@/components/team/AgentCard';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import * as api from '@/lib/api';
import {
  buildBreakdown,
} from '@/lib/insight-analytics';
import {
  detectedMapping,
  fieldValue,
} from '@/lib/zendesk-dimensions';
import {
  buildAgentRows,
  feedbackSummary,
} from '@/lib/feedback-team';

type Tab =
  | 'forms'
  | 'issues'
  | 'products'
  | 'regions'
  | 'custom'
  | 'feedback'
  | 'team';

const TABS: Array<{
  key: Tab;
  label: string;
}> = [
  { key: 'forms', label: 'Forms' },
  { key: 'issues', label: 'Issues' },
  {
    key: 'products',
    label: 'Products',
  },
  {
    key: 'regions',
    label: 'Regions',
  },
  { key: 'custom', label: 'Custom' },
  {
    key: 'feedback',
    label: 'Feedback',
  },
  { key: 'team', label: 'Team' },
];

export default function Insights() {
  const {
    session,
    ensureFreshSession,
  } = useAuth();

  const [tickets, setTickets] =
    useState<api.ZendeskTicket[]>([]);
  const [forms, setForms] =
    useState<api.ZendeskForm[]>([]);
  const [fields, setFields] =
    useState<
      api.ZendeskTicketField[]
    >([]);
  const [ratings, setRatings] =
    useState<
      api.ZendeskSatisfactionRating[]
    >([]);
  const [agents, setAgents] =
    useState<api.ZendeskUser[]>([]);

  const [tab, setTab] =
    useState<Tab>('forms');
  const [loading, setLoading] =
    useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [error, setError] = useState('');
  const [
    feedbackAvailable,
    setFeedbackAvailable,
  ] = useState(true);

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
      const ticketResult =
        await api.zendeskAllTickets(
          token,
        );

      setTickets(
        ticketResult.tickets || [],
      );

      const results =
        await Promise.allSettled([
          api.zendeskForms(token),
          api.zendeskFields(token),
          api.zendeskSatisfaction(
            token,
            365,
          ),
          api.zendeskAgents(token),
        ]);

      const [
        formResult,
        fieldResult,
        satisfactionResult,
        agentResult,
      ] = results;

      if (
        formResult.status ===
        'fulfilled'
      ) {
        setForms(
          formResult.value
            .ticket_forms || [],
        );
      }

      if (
        fieldResult.status ===
        'fulfilled'
      ) {
        setFields(
          fieldResult.value
            .ticket_fields || [],
        );
      }

      if (
        satisfactionResult.status ===
        'fulfilled'
      ) {
        setRatings(
          satisfactionResult.value
            .ratings || [],
        );
        setFeedbackAvailable(true);
      } else {
        setFeedbackAvailable(false);
      }

      if (
        agentResult.status ===
        'fulfilled'
      ) {
        setAgents(
          agentResult.value.users ||
            [],
        );
      }
    } catch (e: any) {
      setError(
        e?.message ||
          'Unable to load Zendesk tickets.',
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

  const mapping = useMemo(
    () => detectedMapping(fields),
    [fields],
  );

  const dimension =
    tab === 'forms'
      ? 'form'
      : tab === 'issues'
        ? 'issue'
        : tab === 'products'
          ? 'device'
          : 'region';

  const breakdown = useMemo(
    () =>
      [
        'forms',
        'issues',
        'products',
        'regions',
      ].includes(tab)
        ? buildBreakdown(
            tickets,
            fields,
            forms,
            dimension as
              | 'form'
              | 'issue'
              | 'device'
              | 'region',
          )
        : [],
    [
      dimension,
      fields,
      forms,
      tab,
      tickets,
    ],
  );

  const customRows = useMemo(() => {
    const rows: Array<{
      fieldId: number;
      field: string;
      value: string;
      count: number;
    }> = [];

    for (const field of fields.filter(
      (item) =>
        item.active !== false &&
        item.custom !== false,
    )) {
      const counts =
        new Map<string, number>();

      for (const ticket of tickets) {
        const value =
          fieldValue(
            ticket,
            field,
          );

        if (!value) continue;

        counts.set(
          value,
          (counts.get(value) || 0) +
            1,
        );
      }

      for (const [
        value,
        count,
      ] of counts) {
        rows.push({
          fieldId: field.id,
          field: field.title,
          value,
          count,
        });
      }
    }

    return rows.sort(
      (a, b) =>
        b.count - a.count,
    );
  }, [fields, tickets]);

  const feedback = useMemo(
    () => feedbackSummary(ratings),
    [ratings],
  );

  const team = useMemo(
    () =>
      buildAgentRows(
        agents,
        tickets,
        ratings,
      ),
    [agents, ratings, tickets],
  );

  function openDimension(
    value: string,
  ) {
    router.push({
      pathname: '/insight-results',
      params: {
        dimension,
        value,
        title: value,
      },
    } as unknown as Href);
  }

  function openCustom(
    row: {
      fieldId: number;
      field: string;
      value: string;
    },
  ) {
    router.push({
      pathname: '/insight-results',
      params: {
        mode: 'custom-field',
        fieldId: String(
          row.fieldId,
        ),
        value: row.value,
        title: `${row.field}: ${row.value}`,
      },
    } as unknown as Href);
  }

  function openFeedback(
    score:
      | 'good'
      | 'bad'
      | 'all',
  ) {
    router.push({
      pathname: '/insight-results',
      params: {
        mode: 'feedback',
        score,
        title:
          score === 'all'
            ? 'All feedback'
            : `${score
                .charAt(0)
                .toUpperCase()}${score.slice(
                1,
              )} feedback`,
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

      <Text style={s.eyebrow}>
        ZENDESK INSIGHTS
      </Text>
      <Text style={s.title}>
        Support intelligence
      </Text>
      <Text style={s.caption}>
        Forms, issues, Atomos products,
        custom fields, feedback and team
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={
          false
        }
        contentContainerStyle={s.tabs}
      >
        {TABS.map((item) => (
          <Pressable
            key={item.key}
            onPress={() =>
              setTab(item.key)
            }
            style={[
              s.tab,
              tab === item.key &&
                s.tabActive,
            ]}
          >
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

      {error ? (
        <AppCard>
          <Text style={s.error}>
            {error}
          </Text>
        </AppCard>
      ) : null}

      {loading ? (
        <View style={s.loading}>
          <ActivityIndicator
            color={colors.primary}
          />
        </View>
      ) : null}

      {!loading &&
      [
        'forms',
        'issues',
        'products',
        'regions',
      ].includes(tab) ? (
        <>
          <AppCard style={s.mapping}>
            <MappingRow
              label="Product"
              value={
                mapping.device
                  ?.title ||
                'Not detected'
              }
            />
            <MappingRow
              label="Issue"
              value={
                mapping.issue?.title ||
                'Not detected'
              }
            />
            <MappingRow
              label="Region"
              value={
                mapping.region
                  ?.title ||
                'Not detected'
              }
              last
            />
          </AppCard>

          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>
              {
                TABS.find(
                  (item) =>
                    item.key === tab,
                )?.label
              }
            </Text>
            <Text style={s.count}>
              {breakdown.length}
            </Text>
          </View>

          <AppCard>
            {breakdown.map(
              (row, index) => (
                <Pressable
                  key={row.key}
                  onPress={() =>
                    openDimension(
                      row.label,
                    )
                  }
                  style={[
                    s.row,
                    index ===
                      breakdown.length -
                        1 &&
                      s.lastRow,
                  ]}
                >
                  <View style={s.rowCopy}>
                    <Text
                      style={s.rowTitle}
                    >
                      {row.label}
                    </Text>
                    <Text
                      style={s.rowMeta}
                    >
                      {row.open} open ·{' '}
                      {row.high} high ·{' '}
                      {row.unassigned}{' '}
                      unassigned
                    </Text>
                  </View>
                  <Text style={s.rowCount}>
                    {row.count}
                  </Text>
                  <Text style={s.chevron}>
                    ›
                  </Text>
                </Pressable>
              ),
            )}
          </AppCard>
        </>
      ) : null}

      {!loading &&
      tab === 'custom' ? (
        <>
          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>
              Custom fields
            </Text>
            <Text style={s.count}>
              {customRows.length}
            </Text>
          </View>

          <AppCard>
            {customRows
              .slice(0, 160)
              .map(
                (
                  row,
                  index,
                ) => (
                  <Pressable
                    key={`${row.fieldId}:${row.value}`}
                    onPress={() =>
                      openCustom(row)
                    }
                    style={[
                      s.row,
                      index ===
                        Math.min(
                          customRows.length,
                          160,
                        ) -
                          1 &&
                        s.lastRow,
                    ]}
                  >
                    <View
                      style={s.rowCopy}
                    >
                      <Text
                        style={
                          s.fieldName
                        }
                      >
                        {row.field}
                      </Text>
                      <Text
                        style={
                          s.rowTitle
                        }
                      >
                        {row.value}
                      </Text>
                    </View>
                    <Text
                      style={s.rowCount}
                    >
                      {row.count}
                    </Text>
                    <Text
                      style={s.chevron}
                    >
                      ›
                    </Text>
                  </Pressable>
                ),
              )}
          </AppCard>
        </>
      ) : null}

      {!loading &&
      tab === 'feedback' ? (
        feedbackAvailable ? (
          <View style={s.feedbackGrid}>
            <FeedbackCard
              label="Good"
              value={feedback.good}
              percent={
                feedback.goodPct
              }
              onPress={() =>
                openFeedback('good')
              }
            />
            <FeedbackCard
              label="Bad"
              value={feedback.bad}
              percent={
                feedback.badPct
              }
              danger
              onPress={() =>
                openFeedback('bad')
              }
            />
            <FeedbackCard
              label="All"
              value={feedback.total}
              percent={100}
              onPress={() =>
                openFeedback('all')
              }
            />
          </View>
        ) : (
          <AppCard>
            <Text
              style={
                s.unavailableTitle
              }
            >
              Feedback unavailable
            </Text>
            <Text
              style={
                s.unavailableText
              }
            >
              Zendesk Satisfaction
              Ratings could not be loaded
              for this account/token.
            </Text>
          </AppCard>
        )
      ) : null}

      {!loading && tab === 'team' ? (
        <>
          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>
              Team
            </Text>
            <Text style={s.count}>
              {team.length}
            </Text>
          </View>

          {team.map((row) => (
            <AgentCard
              key={row.id}
              row={row}
              onPress={() =>
                router.push({
                  pathname:
                    '/agent/[id]',
                  params: {
                    id: String(
                      row.id,
                    ),
                  },
                } as unknown as Href)
              }
            />
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

function MappingRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View
      style={[
        s.mappingRow,
        last && s.lastRow,
      ]}
    >
      <Text style={s.mappingLabel}>
        {label}
      </Text>
      <Text style={s.mappingValue}>
        {value}
      </Text>
    </View>
  );
}

function FeedbackCard({
  label,
  value,
  percent,
  danger = false,
  onPress,
}: {
  label: string;
  value: number;
  percent: number;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        s.feedbackCard,
        danger &&
          s.feedbackDanger,
      ]}
    >
      <Text style={s.feedbackLabel}>
        {label}
      </Text>
      <Text style={s.feedbackValue}>
        {value}
      </Text>
      <Text style={s.feedbackMeta}>
        {percent}% · View tickets ›
      </Text>
    </Pressable>
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
    marginTop: 5,
  },
  caption: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 5,
  },
  tabs: {
    gap: 8,
    paddingVertical: 16,
  },
  tab: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
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
    fontWeight: '900',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  error: {
    color: colors.danger,
    fontWeight: '700',
  },
  loading: {
    paddingVertical: 65,
    alignItems: 'center',
  },
  mapping: {
    marginBottom: 15,
  },
  mappingRow: {
    minHeight: 42,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  mappingLabel: {
    color: colors.muted,
    fontSize: 10,
  },
  mappingValue: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'right',
    flex: 1,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 9,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  count: {
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: 10,
    fontWeight: '900',
  },
  row: {
    minHeight: 61,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
  },
  rowCopy: {
    flex: 1,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
  },
  rowMeta: {
    color: colors.muted,
    fontSize: 9,
    marginTop: 4,
  },
  fieldName: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '900',
    marginBottom: 4,
  },
  rowCount: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  chevron: {
    color: colors.muted,
    fontSize: 23,
  },
  feedbackGrid: {
    gap: 10,
  },
  feedbackCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#CDE7DC',
    backgroundColor: '#EEF8F3',
    padding: 17,
  },
  feedbackDanger: {
    backgroundColor: '#FFF3F3',
    borderColor: '#F1D2D2',
  },
  feedbackLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '900',
  },
  feedbackValue: {
    color: colors.text,
    fontSize: 31,
    fontWeight: '900',
    marginTop: 7,
  },
  feedbackMeta: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 4,
  },
  unavailableTitle: {
    color: colors.warning,
    fontWeight: '900',
  },
  unavailableText: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 5,
  },
});
