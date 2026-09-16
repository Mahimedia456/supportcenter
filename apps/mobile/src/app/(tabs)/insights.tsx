
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
import { Ionicons } from '@expo/vector-icons';
import { WorkspaceHeader } from '@/components/WorkspaceHeader';
import { AppCard } from '@/components/AppCard';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import {
  getZendeskDbSnapshot,
  syncZendeskDb,
  type ZendeskDbSnapshot,
} from '@/lib/zendesk-db';
import {
  detectedMapping,
  roleValues,
  type AtomosFieldRole,
} from '@/lib/zendesk-dimensions';

type Tab =
  | 'forms'
  | 'supportType'
  | 'products'
  | 'regions'
  | 'category'
  | 'faultCategory'
  | 'rma';

const TABS: Array<{
  key: Tab;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  {
    key: 'forms',
    label: 'Forms',
    icon: 'document-text-outline',
  },
  {
    key: 'supportType',
    label: 'Support Type',
    icon: 'help-buoy-outline',
  },
  {
    key: 'products',
    label: 'Products',
    icon: 'hardware-chip-outline',
  },
  {
    key: 'regions',
    label: 'Regions',
    icon: 'globe-outline',
  },
  {
    key: 'category',
    label: 'Category',
    icon: 'grid-outline',
  },
  {
    key: 'faultCategory',
    label: 'Fault',
    icon: 'warning-outline',
  },
  {
    key: 'rma',
    label: 'RMA',
    icon: 'repeat-outline',
  },
];

function role(
  tab: Tab,
): AtomosFieldRole | null {
  if (tab === 'supportType') {
    return 'supportType';
  }
  if (tab === 'products') {
    return 'device';
  }
  if (tab === 'regions') {
    return 'region';
  }
  if (tab === 'category') {
    return 'category';
  }
  if (tab === 'faultCategory') {
    return 'faultCategory';
  }
  if (tab === 'rma') {
    return 'rma';
  }
  return null;
}

export default function Insights() {
  const {
    session,
    ensureFreshSession,
  } = useAuth();

  const [snapshot, setSnapshot] =
    useState<ZendeskDbSnapshot | null>(
      null,
    );
  const [tab, setTab] =
    useState<Tab>('forms');
  const [loading, setLoading] =
    useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [error, setError] =
    useState('');

  const token =
    useCallback(async () => {
      const fresh =
        await ensureFreshSession();

      return (
        fresh?.accessToken ||
        session?.accessToken ||
        ''
      );
    }, [
      ensureFreshSession,
      session?.accessToken,
    ]);

  const load =
    useCallback(async () => {
      setError('');

      try {
        const accessToken =
          await token();

        if (!accessToken) {
          return;
        }

        const data =
          await getZendeskDbSnapshot(
            accessToken,
          );

        setSnapshot(data);
      } catch (e: any) {
        setError(
          e?.message ||
            'Unable to load insights.',
        );
      } finally {
        setLoading(false);
      }
    }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function refresh() {
    setRefreshing(true);
    try {
      const accessToken =
        await token();

      if (accessToken) {
        const data =
          await syncZendeskDb(
            accessToken,
          );
        setSnapshot(data);
      }
    } catch (e: any) {
      setError(
        e?.message ||
          'Unable to sync insights.',
      );
    } finally {
      setRefreshing(false);
    }
  }

  const tickets =
    snapshot?.tickets || [];
  const forms =
    snapshot?.forms || [];
  const fields =
    snapshot?.fields || [];

  const mapping = useMemo(
    () =>
      detectedMapping(fields),
    [fields],
  );

  const formRows = useMemo(() => {
    const counts =
      new Map<number, number>();

    for (const ticket of tickets) {
      if (
        ticket.ticket_form_id
      ) {
        counts.set(
          ticket.ticket_form_id,
          (counts.get(
            ticket.ticket_form_id,
          ) || 0) + 1,
        );
      }
    }

    return forms
      .filter(
        (form) =>
          form.active !== false,
      )
      .map((form) => ({
        id: form.id,
        label:
          form.display_name ||
          form.name ||
          `Form #${form.id}`,
        count:
          counts.get(form.id) ||
          0,
      }))
      .sort(
        (a, b) =>
          b.count - a.count,
      );
  }, [forms, tickets]);

  const rows = useMemo(() => {
    const currentRole =
      role(tab);

    if (!currentRole) {
      return [];
    }

    return roleValues(
      tickets,
      fields,
      currentRole,
    );
  }, [fields, tab, tickets]);

  const total =
    tickets.length;
  const open =
    tickets.filter((ticket) =>
      [
        'new',
        'open',
        'pending',
      ].includes(
        String(
          ticket.status || '',
        ).toLowerCase(),
      ),
    ).length;

  const high =
    tickets.filter((ticket) =>
      ['high', 'urgent'].includes(
        String(
          ticket.priority || '',
        ).toLowerCase(),
      ),
    ).length;

  const unassigned =
    tickets.filter(
      (ticket) =>
        !ticket.assignee_id,
    ).length;

  function openForm(
    id: number,
    title: string,
  ) {
    router.push({
      pathname:
        '/ticket-results',
      params: {
        mode: 'form',
        formId:
          String(id),
        title,
      },
    } as unknown as Href);
  }

  function openRole(
    currentRole:
      AtomosFieldRole,
    value: string,
  ) {
    router.push({
      pathname:
        '/ticket-results',
      params: {
        mode:
          'atomos-field',
        role:
          currentRole,
        value,
        title: value,
      },
    } as unknown as Href);
  }

  const activeRows =
    tab === 'forms'
      ? formRows
      : rows.map(
          (item, index) => ({
            id: `${item.label}-${index}`,
            label: item.label,
            count: item.count,
          }),
        );

  const max = Math.max(
    1,
    ...activeRows.map(
      (row) => row.count,
    ),
  );

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={
        s.content
      }
      refreshControl={
        <RefreshControl
          refreshing={
            refreshing
          }
          onRefresh={refresh}
          tintColor={
            colors.primary
          }
        />
      }
    >
      <WorkspaceHeader />

      <View style={s.hero}>
        <View style={s.heroCopy}>
          <Text
            style={s.eyebrow}
          >
            90-DAY SUPPORT INTELLIGENCE
          </Text>
          <Text style={s.title}>
            Insights
          </Text>
          <Text
            style={s.caption}
          >
            Synced Zendesk operational
            patterns
          </Text>
        </View>

        <View style={s.period}>
          <Text
            style={s.periodText}
          >
            90D
          </Text>
        </View>
      </View>

      <View style={s.kpis}>
        <Kpi
          label="Tickets"
          value={total}
        />
        <Kpi
          label="Active"
          value={open}
        />
        <Kpi
          label="High"
          value={high}
          accent
        />
        <Kpi
          label="Unassigned"
          value={unassigned}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={
          false
        }
        contentContainerStyle={
          s.tabs
        }
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
            <Ionicons
              name={item.icon}
              size={16}
              color={
                tab === item.key
                  ? '#FFFFFF'
                  : colors.muted
              }
            />
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

      {snapshot ? (
        <AppCard
          style={s.mappingCard}
        >
          <View
            style={s.mappingTop}
          >
            <Text
              style={s.mappingTitle}
            >
              Zendesk field map
            </Text>
            <Text
              style={s.synced}
            >
              {snapshot.syncedAt
                ? `Synced ${new Date(
                    snapshot.syncedAt,
                  ).toLocaleString()}`
                : 'Not synced'}
            </Text>
          </View>

          <View
            style={s.mappingGrid}
          >
            <Mapping
              label="Product"
              value={
                mapping.device
                  ?.title ||
                'Not detected'
              }
            />
            <Mapping
              label="Region"
              value={
                mapping.region
                  ?.title ||
                'Not detected'
              }
            />
            <Mapping
              label="Fault"
              value={
                mapping
                  .faultCategory
                  ?.title ||
                'Not detected'
              }
            />
            <Mapping
              label="RMA"
              value={
                mapping.rma
                  ?.title ||
                'Not detected'
              }
            />
          </View>
        </AppCard>
      ) : null}

      {loading ? (
        <View style={s.loading}>
          <ActivityIndicator
            color={
              colors.primary
            }
          />
          <Text
            style={s.loadingText}
          >
            Initializing support
            data…
          </Text>
        </View>
      ) : null}

      {error ? (
        <AppCard>
          <Text
            style={s.errorTitle}
          >
            Insights unavailable
          </Text>
          <Text
            style={s.errorText}
          >
            {error}
          </Text>
        </AppCard>
      ) : null}

      {!loading ? (
        <>
          <View
            style={s.sectionRow}
          >
            <View>
              <Text
                style={
                  s.sectionTitle
                }
              >
                {
                  TABS.find(
                    (item) =>
                      item.key ===
                      tab,
                  )?.label
                }
              </Text>
              <Text
                style={
                  s.sectionCaption
                }
              >
                Tap a row to open
                ticket results
              </Text>
            </View>

            <Text style={s.count}>
              {
                activeRows.length
              }
            </Text>
          </View>

          <AppCard>
            {activeRows
              .slice(0, 30)
              .map(
                (
                  row,
                  index,
                ) => (
                  <Pressable
                    key={String(
                      row.id,
                    )}
                    onPress={() => {
                      if (
                        tab ===
                        'forms'
                      ) {
                        openForm(
                          Number(
                            row.id,
                          ),
                          row.label,
                        );
                      } else {
                        openRole(
                          role(
                            tab,
                          ) as AtomosFieldRole,
                          row.label,
                        );
                      }
                    }}
                    style={[
                      s.resultRow,
                      index ===
                        Math.min(
                          activeRows.length,
                          30,
                        ) -
                          1 &&
                        s.lastRow,
                    ]}
                  >
                    <View
                      style={
                        s.resultCopy
                      }
                    >
                      <View
                        style={
                          s.resultTop
                        }
                      >
                        <Text
                          style={
                            s.resultTitle
                          }
                          numberOfLines={
                            2
                          }
                        >
                          {
                            row.label
                          }
                        </Text>

                        <Text
                          style={
                            s.resultCount
                          }
                        >
                          {
                            row.count
                          }
                        </Text>
                      </View>

                      <View
                        style={
                          s.barTrack
                        }
                      >
                        <View
                          style={[
                            s.barFill,
                            {
                              width: `${Math.max(
                                4,
                                (row.count /
                                  max) *
                                  100,
                              )}%`,
                            },
                          ]}
                        />
                      </View>
                    </View>

                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={
                        colors.cyan
                      }
                    />
                  </Pressable>
                ),
              )}

            {!activeRows.length ? (
              <View
                style={s.empty}
              >
                <Ionicons
                  name="analytics-outline"
                  size={30}
                  color={
                    colors.muted
                  }
                />
                <Text
                  style={
                    s.emptyTitle
                  }
                >
                  No values found
                </Text>
                <Text
                  style={
                    s.emptyText
                  }
                >
                  Pull down to sync the
                  latest 90-day Zendesk
                  snapshot.
                </Text>
              </View>
            ) : null}
          </AppCard>
        </>
      ) : null}
    </ScrollView>
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
            s.kpiAccent,
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

function Mapping({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={s.mappingItem}>
      <Text
        style={s.mappingLabel}
      >
        {label}
      </Text>
      <Text
        style={s.mappingValue}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor:
      colors.background,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 120,
  },
  hero: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
    gap: 12,
  },
  heroCopy: {
    flex: 1,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  title: {
    color: colors.text,
    fontSize: 29,
    fontWeight: '900',
    marginTop: 5,
  },
  caption: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 5,
  },
  period: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor:
      colors.primarySoft,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  periodText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
  },
  kpis: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 15,
  },
  kpi: {
    flex: 1,
    minHeight: 76,
    borderRadius: 15,
    backgroundColor:
      colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 11,
  },
  kpiValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  kpiAccent: {
    color: colors.danger,
  },
  kpiLabel: {
    color: colors.muted,
    fontSize: 8,
    fontWeight: '800',
    marginTop: 5,
  },
  tabs: {
    gap: 8,
    paddingVertical: 15,
  },
  tab: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 14,
    backgroundColor:
      colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
  },
  tabActive: {
    backgroundColor:
      colors.primary,
    borderColor:
      colors.primary,
  },
  tabText: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: '900',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  mappingCard: {
    backgroundColor:
      '#F5FBF8',
  },
  mappingTop: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
    gap: 10,
  },
  mappingTitle: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '900',
  },
  synced: {
    flex: 1,
    textAlign: 'right',
    color: colors.muted,
    fontSize: 8,
  },
  mappingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  mappingItem: {
    width: '48%',
    borderRadius: 12,
    backgroundColor:
      colors.surface,
    padding: 10,
  },
  mappingLabel: {
    color: colors.muted,
    fontSize: 8,
    fontWeight: '800',
  },
  mappingValue: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '900',
    marginTop: 4,
  },
  loading: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
    marginTop: 10,
  },
  errorTitle: {
    color: colors.danger,
    fontWeight: '900',
  },
  errorText: {
    color: colors.text,
    fontSize: 10,
    marginTop: 4,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 10,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  sectionCaption: {
    color: colors.muted,
    fontSize: 9,
    marginTop: 3,
  },
  count: {
    color: colors.primary,
    backgroundColor:
      colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: 10,
    fontWeight: '900',
  },
  resultRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor:
      colors.border,
    paddingVertical: 11,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  resultCopy: {
    flex: 1,
  },
  resultTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
    gap: 10,
  },
  resultTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
  },
  resultCount: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  barTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor:
      '#EAF1EE',
    marginTop: 9,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor:
      colors.primary,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 35,
  },
  emptyTitle: {
    color: colors.text,
    fontWeight: '900',
    marginTop: 8,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 9,
    textAlign: 'center',
    marginTop: 4,
  },
});
