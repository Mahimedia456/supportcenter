
import React, {
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  router,
} from 'expo-router';
import {
  Ionicons,
} from '@expo/vector-icons';
import {
  WorkspaceHeader,
} from '@/components/WorkspaceHeader';
import {
  SupportPeriodFilter,
} from '@/components/SupportPeriodFilter';
import {
  colors,
} from '@/constants/theme';
import {
  useGlobalSupportSnapshot,
} from '@/hooks/useGlobalSupportSnapshot';
import {
  DEFAULT_SUPPORT_PERIOD,
  filterTicketsBySupportPeriod,
  type SupportPeriod,
} from '@/lib/support-period';

function safeText(
  value: unknown,
  fallback = '',
) {
  if (
    value === null ||
    value === undefined
  ) {
    return fallback;
  }

  if (
    typeof value ===
      'string' ||
    typeof value ===
      'number' ||
    typeof value ===
      'boolean'
  ) {
    return String(value);
  }

  return fallback;
}

function shortDate(
  value?: string | null,
) {
  if (!value) {
    return '—';
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return '—';
  }

  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  const month =
    months[
      date.getMonth()
    ];

  const day =
    date.getDate();

  const hour24 =
    date.getHours();

  const minute =
    String(
      date.getMinutes(),
    ).padStart(2, '0');

  const suffix =
    hour24 >= 12
      ? 'PM'
      : 'AM';

  const hour =
    hour24 % 12 || 12;

  return `${month} ${day}, ${hour}:${minute} ${suffix}`;
}

function statusTone(
  status: string,
) {
  switch (
    status.toLowerCase()
  ) {
    case 'new':
      return {
        bg: '#EAF3FF',
        fg: '#1D63B8',
      };

    case 'open':
      return {
        bg: '#EAF7F1',
        fg: colors.primary,
      };

    case 'pending':
      return {
        bg: '#FFF5DF',
        fg: colors.warning,
      };

    case 'hold':
      return {
        bg: '#F1EDFF',
        fg: '#7256B5',
      };

    default:
      return {
        bg: '#EEF1F3',
        fg: colors.muted,
      };
  }
}

export default function Tickets() {
  const {
    snapshot,
    loading,
    refreshing,
    error,
    refresh,
  } =
    useGlobalSupportSnapshot();

  const [period, setPeriod] =
    useState<SupportPeriod>(
      DEFAULT_SUPPORT_PERIOD,
    );

  const [query, setQuery] =
    useState('');

  const tickets =
    snapshot?.tickets || [];

  const agents =
    snapshot?.agents || [];

  const groups =
    snapshot?.groups || [];

  const forms =
    snapshot?.forms || [];

  const agentMap =
    useMemo(
      () =>
        new Map(
          agents.map(
            (item: any) => [
              Number(
                item.id,
              ),
              item,
            ],
          ),
        ),
      [agents],
    );

  const groupMap =
    useMemo(
      () =>
        new Map(
          groups.map(
            (item: any) => [
              Number(
                item.id,
              ),
              item,
            ],
          ),
        ),
      [groups],
    );

  const formMap =
    useMemo(
      () =>
        new Map(
          forms.map(
            (item: any) => [
              Number(
                item.id,
              ),
              item,
            ],
          ),
        ),
      [forms],
    );

  const rows =
    useMemo(() => {
      let filtered =
        filterTicketsBySupportPeriod(
          tickets,
          period,
        );

      const needle =
        query
          .trim()
          .toLowerCase();

      if (needle) {
        filtered =
          filtered.filter(
            (ticket) =>
              [
                ticket.id,
                ticket.subject ||
                  '',
                ticket.status ||
                  '',
                ticket.priority ||
                  '',
                ...(ticket.tags ||
                  []),
              ]
                .join(' ')
                .toLowerCase()
                .includes(
                  needle,
                ),
          );
      }

      return [
        ...filtered,
      ].sort(
        (a, b) =>
          new Date(
            b.updated_at ||
              b.created_at ||
              0,
          ).getTime() -
          new Date(
            a.updated_at ||
              a.created_at ||
              0,
          ).getTime(),
      );
    }, [
      period,
      query,
      tickets,
    ]);

  const header = (
    <>
      <WorkspaceHeader />

      <View style={s.head}>
        <View
          style={
            s.headCopy
          }
        >
          <Text
            style={s.eyebrow}
          >
            TICKET OPERATIONS
          </Text>

          <Text
            style={s.title}
          >
            Tickets
          </Text>

          <Text
            style={s.caption}
          >
            {rows.length} tickets in selected period
          </Text>
        </View>

        <View
          style={s.total}
        >
          <Text
            style={
              s.totalValue
            }
          >
            {rows.length}
          </Text>

          <Text
            style={
              s.totalLabel
            }
          >
            TOTAL
          </Text>
        </View>
      </View>

      <SupportPeriodFilter
        value={period}
        onChange={setPeriod}
      />

      <View style={s.search}>
        <Ionicons
          name="search-outline"
          size={18}
          color={
            colors.muted
          }
        />

        <TextInput
          value={query}
          onChangeText={
            setQuery
          }
          placeholder="Search ID, subject, status, priority"
          placeholderTextColor={
            colors.muted
          }
          style={
            s.searchInput
          }
        />

        {query ? (
          <Pressable
            onPress={() =>
              setQuery('')
            }
            hitSlop={8}
          >
            <Ionicons
              name="close-circle"
              size={18}
              color={
                colors.muted
              }
            />
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <View
          style={s.error}
        >
          <Text
            style={
              s.errorTitle
            }
          >
            Using saved support data
          </Text>

          <Text
            style={
              s.errorText
            }
          >
            Live refresh is temporarily unavailable. The last saved snapshot stays visible.
          </Text>
        </View>
      ) : null}
    </>
  );

  return (
    <FlatList
      style={s.screen}
      contentContainerStyle={
        s.content
      }
      data={rows}
      keyExtractor={(
        item,
      ) =>
        String(item.id)
      }
      initialNumToRender={12}
      maxToRenderPerBatch={12}
      windowSize={7}
      removeClippedSubviews
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={
            refreshing
          }
          onRefresh={
            refresh
          }
          tintColor={
            colors.primary
          }
        />
      }
      ListHeaderComponent={
        header
      }
      ListEmptyComponent={
        loading &&
        !snapshot ? (
          <View
            style={s.loading}
          >
            <ActivityIndicator
              color={
                colors.primary
              }
            />

            <Text
              style={
                s.loadingText
              }
            >
              Loading saved support snapshot…
            </Text>
          </View>
        ) : (
          <View
            style={s.empty}
          >
            <Ionicons
              name="file-tray-outline"
              size={38}
              color={
                colors.primary
              }
            />

            <Text
              style={
                s.emptyTitle
              }
            >
              No tickets found
            </Text>

            <Text
              style={
                s.emptyText
              }
            >
              Change the period or search filter.
            </Text>
          </View>
        )
      }
      renderItem={({
        item: ticket,
      }) => {
        const agent: any =
          agentMap.get(
            Number(
              ticket.assignee_id,
            ),
          );

        const group: any =
          groupMap.get(
            Number(
              ticket.group_id,
            ),
          );

        const form: any =
          formMap.get(
            Number(
              ticket.ticket_form_id,
            ),
          );

        const status =
          safeText(
            ticket.status,
            'unknown',
          );

        const priority =
          safeText(
            ticket.priority,
            'normal',
          );

        const tone =
          statusTone(
            status,
          );

        const important =
          [
            'high',
            'urgent',
          ].includes(
            priority.toLowerCase(),
          );

        return (
          <Pressable
            onPress={() =>
              router.push({
                pathname:
                  '/ticket/[id]',
                params: {
                  id: String(
                    ticket.id,
                  ),
                },
              })
            }
            style={({
              pressed,
            }) => [
              s.card,
              pressed &&
                s.pressed,
            ]}
          >
            <View style={s.top}>
              <View
                style={
                  s.topLeft
                }
              >
                <Text
                  style={s.id}
                >
                  #{ticket.id}
                </Text>

                <View
                  style={[
                    s.pill,
                    {
                      backgroundColor:
                        tone.bg,
                    },
                  ]}
                >
                  <Text
                    style={[
                      s.pillText,
                      {
                        color:
                          tone.fg,
                      },
                    ]}
                  >
                    {status}
                  </Text>
                </View>

                <View
                  style={
                    s.priority
                  }
                >
                  <Ionicons
                    name={
                      important
                        ? 'flag'
                        : 'flag-outline'
                    }
                    size={10}
                    color={
                      important
                        ? colors.warning
                        : colors.muted
                    }
                  />

                  <Text
                    style={
                      s.priorityText
                    }
                  >
                    {priority}
                  </Text>
                </View>
              </View>

              <Ionicons
                name="chevron-forward"
                size={18}
                color={
                  colors.cyan
                }
              />
            </View>

            <Text
              style={s.subject}
              numberOfLines={2}
            >
              {safeText(
                ticket.subject,
                'Untitled ticket',
              )}
            </Text>

            <View style={s.meta}>
              <Meta
                icon="person-outline"
                label="Assignee"
                value={safeText(
                  agent?.name ||
                    agent?.email,
                  'Unassigned',
                )}
              />

              <Meta
                icon="people-outline"
                label="Group"
                value={safeText(
                  group?.name,
                  'No group',
                )}
              />

              <Meta
                icon="document-text-outline"
                label="Form"
                value={safeText(
                  form?.display_name ||
                    form?.name,
                  'Default form',
                )}
              />
            </View>

            <View
              style={
                s.footer
              }
            >
              <View
                style={
                  s.timeRow
                }
              >
                <Ionicons
                  name="time-outline"
                  size={13}
                  color={
                    colors.muted
                  }
                />

                <Text
                  style={
                    s.timeText
                  }
                >
                  Updated{' '}
                  {shortDate(
                    ticket.updated_at ||
                      ticket.created_at,
                  )}
                </Text>
              </View>

              <Text
                style={s.open}
              >
                Open ticket
              </Text>
            </View>
          </Pressable>
        );
      }}
    />
  );
}

function Meta({
  icon,
  label,
  value,
}: {
  icon:
    keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={s.metaRow}>
      <Ionicons
        name={icon}
        size={14}
        color={
          colors.muted
        }
      />

      <Text
        style={s.metaLabel}
      >
        {label}
      </Text>

      <Text
        style={s.metaValue}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

const s =
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor:
        colors.background,
    },
    content: {
      paddingHorizontal:
        18,
      paddingTop: 8,
      paddingBottom:
        120,
    },
    head: {
      flexDirection:
        'row',
      justifyContent:
        'space-between',
      gap: 12,
    },
    headCopy: {
      flex: 1,
    },
    eyebrow: {
      color:
        colors.primary,
      fontSize: 9,
      fontWeight:
        '900',
      letterSpacing: 1,
    },
    title: {
      color:
        colors.text,
      fontSize: 29,
      fontWeight:
        '900',
      marginTop: 4,
    },
    caption: {
      color:
        colors.muted,
      fontSize: 10,
      marginTop: 4,
    },
    total: {
      minWidth: 58,
      minHeight: 54,
      borderRadius: 16,
      backgroundColor:
        colors.primarySoft,
      borderWidth: 1,
      borderColor:
        colors.border,
      alignItems:
        'center',
      justifyContent:
        'center',
      paddingHorizontal:
        8,
    },
    totalValue: {
      color:
        colors.primary,
      fontSize: 18,
      fontWeight:
        '900',
    },
    totalLabel: {
      color:
        colors.muted,
      fontSize: 7,
      fontWeight:
        '900',
    },
    search: {
      minHeight: 49,
      flexDirection:
        'row',
      alignItems:
        'center',
      gap: 9,
      borderRadius: 15,
      borderWidth: 1,
      borderColor:
        colors.border,
      backgroundColor:
        colors.surface,
      paddingHorizontal:
        13,
      marginBottom: 12,
    },
    searchInput: {
      flex: 1,
      color:
        colors.text,
      fontSize: 11,
    },
    error: {
      borderRadius: 15,
      borderWidth: 1,
      borderColor:
        '#F3D7A5',
      backgroundColor:
        '#FFF9EC',
      padding: 12,
      marginBottom: 10,
    },
    errorTitle: {
      color:
        colors.warning,
      fontSize: 10,
      fontWeight:
        '900',
    },
    errorText: {
      color:
        colors.muted,
      fontSize: 9,
      lineHeight: 14,
      marginTop: 3,
    },
    loading: {
      alignItems:
        'center',
      paddingVertical:
        55,
    },
    loadingText: {
      color:
        colors.muted,
      fontSize: 10,
      marginTop: 8,
    },
    card: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor:
        colors.border,
      backgroundColor:
        colors.surface,
      padding: 14,
      marginBottom: 10,
    },
    pressed: {
      opacity: 0.82,
    },
    top: {
      flexDirection:
        'row',
      justifyContent:
        'space-between',
      alignItems:
        'center',
      gap: 8,
    },
    topLeft: {
      flex: 1,
      flexDirection:
        'row',
      alignItems:
        'center',
      gap: 7,
      flexWrap: 'wrap',
    },
    id: {
      color:
        colors.primary,
      fontSize: 10,
      fontWeight:
        '900',
    },
    pill: {
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    pillText: {
      fontSize: 8,
      fontWeight:
        '900',
      textTransform:
        'capitalize',
    },
    priority: {
      flexDirection:
        'row',
      alignItems:
        'center',
      gap: 4,
      borderRadius: 999,
      backgroundColor:
        colors.background,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    priorityText: {
      color:
        colors.muted,
      fontSize: 8,
      fontWeight:
        '800',
      textTransform:
        'capitalize',
    },
    subject: {
      color:
        colors.text,
      fontSize: 13,
      lineHeight: 18,
      fontWeight:
        '900',
      marginTop: 10,
    },
    meta: {
      borderTopWidth: 1,
      borderTopColor:
        colors.border,
      marginTop: 12,
      paddingTop: 10,
      gap: 7,
    },
    metaRow: {
      minHeight: 28,
      flexDirection:
        'row',
      alignItems:
        'center',
      gap: 8,
    },
    metaLabel: {
      width: 55,
      color:
        colors.muted,
      fontSize: 8,
      fontWeight:
        '800',
    },
    metaValue: {
      flex: 1,
      color:
        colors.text,
      fontSize: 9,
      fontWeight:
        '800',
    },
    footer: {
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor:
        colors.border,
      flexDirection:
        'row',
      justifyContent:
        'space-between',
      alignItems:
        'center',
      gap: 8,
    },
    timeRow: {
      flex: 1,
      flexDirection:
        'row',
      alignItems:
        'center',
      gap: 5,
    },
    timeText: {
      color:
        colors.muted,
      fontSize: 8,
    },
    open: {
      color:
        colors.cyan,
      fontSize: 9,
      fontWeight:
        '900',
    },
    empty: {
      alignItems:
        'center',
      paddingVertical:
        55,
    },
    emptyTitle: {
      color:
        colors.text,
      fontSize: 14,
      fontWeight:
        '900',
      marginTop: 10,
    },
    emptyText: {
      color:
        colors.muted,
      fontSize: 10,
      marginTop: 4,
    },
  });
