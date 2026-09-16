import React, {
  useState,
} from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';
import type {
  OverviewPeriod,
} from '@/lib/overview';

const PRESETS: Array<{
  key: OverviewPeriod;
  label: string;
}> = [
  {
    key: 'today',
    label: 'Today',
  },
  {
    key: '7d',
    label: '7 Days',
  },
  {
    key: '30d',
    label: '30 Days',
  },
  {
    key: 'all',
    label: 'All',
  },
];

const fmt = (date: Date) =>
  date.toLocaleDateString(
    undefined,
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    },
  );

export function OverviewDateFilter({
  period,
  from,
  to,
  onPreset,
  onCustom,
}: {
  period: OverviewPeriod;
  from: Date;
  to: Date;
  onPreset: (
    period: OverviewPeriod,
  ) => void;
  onCustom: (
    from: Date,
    to: Date,
  ) => void;
}) {
  const [open, setOpen] =
    useState(false);
  const [draftFrom, setDraftFrom] =
    useState(from);
  const [draftTo, setDraftTo] =
    useState(to);
  const [picker, setPicker] =
    useState<'from' | 'to' | null>(
      null,
    );

  function chooseMonth(
    offset: number,
  ) {
    const now = new Date();

    const start = new Date(
      now.getFullYear(),
      now.getMonth() - offset,
      1,
    );

    const end = new Date(
      start.getFullYear(),
      start.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    setDraftFrom(start);
    setDraftTo(
      end.getTime() >
        Date.now()
        ? new Date()
        : end,
    );
  }

  function apply() {
    let a = draftFrom;
    let b = draftTo;

    if (
      a.getTime() >
      b.getTime()
    ) {
      [a, b] = [b, a];
    }

    onCustom(a, b);
    setOpen(false);
  }

  return (
    <>
      <View style={s.row}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          contentContainerStyle={
            s.tabs
          }
          style={s.tabsScroll}
        >
          {PRESETS.map((item) => (
            <Pressable
              key={item.key}
              onPress={() =>
                onPreset(item.key)
              }
              style={[
                s.tab,
                period === item.key &&
                  s.tabActive,
              ]}
            >
              <Text
                style={[
                  s.text,
                  period ===
                    item.key &&
                    s.textActive,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Pressable
          onPress={() => {
            setDraftFrom(from);
            setDraftTo(to);
            setOpen(true);
          }}
          style={[
            s.filter,
            period === 'custom' &&
              s.filterActive,
          ]}
        >
          <Ionicons
            name="options-outline"
            size={21}
            color={
              period === 'custom'
                ? '#FFFFFF'
                : colors.primary
            }
          />
        </Pressable>
      </View>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setOpen(false)
        }
      >
        <Pressable
          style={s.backdrop}
          onPress={() =>
            setOpen(false)
          }
        >
          <Pressable
            style={s.sheet}
            onPress={() =>
              undefined
            }
          >
            <View style={s.handle} />

            <View style={s.sheetHead}>
              <View>
                <Text style={s.title}>
                  Date range
                </Text>
                <Text
                  style={s.caption}
                >
                  Select day, month and
                  year
                </Text>
              </View>

              <Pressable
                onPress={() =>
                  setOpen(false)
                }
                style={s.close}
              >
                <Ionicons
                  name="close"
                  size={20}
                  color={colors.text}
                />
              </Pressable>
            </View>

            <View style={s.months}>
              {[0, 1, 2].map(
                (offset) => {
                  const date =
                    new Date();

                  date.setMonth(
                    date.getMonth() -
                      offset,
                  );

                  return (
                    <Pressable
                      key={offset}
                      onPress={() =>
                        chooseMonth(
                          offset,
                        )
                      }
                      style={s.month}
                    >
                      <Text
                        style={
                          s.monthText
                        }
                      >
                        {date.toLocaleDateString(
                          undefined,
                          {
                            month:
                              'short',
                            year:
                              'numeric',
                          },
                        )}
                      </Text>
                    </Pressable>
                  );
                },
              )}
            </View>

            <View style={s.dateGrid}>
              <Pressable
                onPress={() =>
                  setPicker('from')
                }
                style={s.dateBox}
              >
                <Text
                  style={s.dateLabel}
                >
                  FROM
                </Text>
                <Text
                  style={s.dateValue}
                >
                  {fmt(draftFrom)}
                </Text>
              </Pressable>

              <Pressable
                onPress={() =>
                  setPicker('to')
                }
                style={s.dateBox}
              >
                <Text
                  style={s.dateLabel}
                >
                  TO
                </Text>
                <Text
                  style={s.dateValue}
                >
                  {fmt(draftTo)}
                </Text>
              </Pressable>
            </View>

            {picker ? (
              <View style={s.picker}>
                <DateTimePicker
                  value={
                    picker === 'from'
                      ? draftFrom
                      : draftTo
                  }
                  mode="date"
                  display={
                    Platform.OS ===
                    'ios'
                      ? 'inline'
                      : 'calendar'
                  }
                  maximumDate={
                    new Date()
                  }
                  onChange={(
                    _,
                    value,
                  ) => {
                    if (value) {
                      if (
                        picker ===
                        'from'
                      ) {
                        setDraftFrom(
                          value,
                        );
                      } else {
                        setDraftTo(
                          value,
                        );
                      }
                    }

                    if (
                      Platform.OS !==
                      'ios'
                    ) {
                      setPicker(null);
                    }
                  }}
                />

                {Platform.OS ===
                'ios' ? (
                  <Pressable
                    onPress={() =>
                      setPicker(null)
                    }
                    style={s.done}
                  >
                    <Text
                      style={
                        s.doneText
                      }
                    >
                      Done
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            <Pressable
              onPress={apply}
              style={s.apply}
            >
              <Text
                style={s.applyText}
              >
                Apply date range
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  row: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 8,
  },
  tabsScroll: {
    flex: 1,
  },
  tabs: {
    flexGrow: 1,
    backgroundColor: '#EAF1EE',
    padding: 4,
    borderRadius: 14,
    gap: 4,
  },
  tab: {
    minWidth: 68,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 11,
  },
  tabActive: {
    backgroundColor:
      colors.surface,
  },
  text: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
  },
  textActive: {
    color: colors.primary,
  },
  filter: {
    width: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor:
      colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterActive: {
    backgroundColor:
      colors.primary,
    borderColor:
      colors.primary,
  },
  backdrop: {
    flex: 1,
    backgroundColor:
      'rgba(15,23,42,.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor:
      colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 28,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DCE6E2',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetHead: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
    gap: 12,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
  },
  caption: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 4,
  },
  close: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor:
      colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  months: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
  },
  month: {
    flex: 1,
    minHeight: 40,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
  },
  dateGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  dateBox: {
    flex: 1,
    borderRadius: 16,
    backgroundColor:
      colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 13,
  },
  dateLabel: {
    color: colors.muted,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  dateValue: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
    marginTop: 5,
  },
  picker: {
    marginTop: 12,
    backgroundColor:
      colors.background,
    borderRadius: 16,
    overflow: 'hidden',
  },
  done: {
    alignSelf: 'flex-end',
    padding: 12,
  },
  doneText: {
    color: colors.primary,
    fontWeight: '900',
  },
  apply: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor:
      colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  applyText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
});
