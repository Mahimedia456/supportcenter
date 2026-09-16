
import React, {
  useMemo,
  useState,
} from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Ionicons,
} from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  colors,
} from '@/constants/theme';
import {
  lastThreeMonthLabels,
  type SupportPeriod,
  type SupportPeriodPreset,
} from '@/lib/support-period';

export function SupportPeriodFilter({
  value,
  onChange,
}: {
  value: SupportPeriod;
  onChange: (
    value: SupportPeriod,
  ) => void;
}) {
  const months =
    useMemo(
      () =>
        lastThreeMonthLabels(),
      [],
    );

  const [open, setOpen] =
    useState(false);

  const [from, setFrom] =
    useState(
      new Date(
        Date.now() -
          6 *
            24 *
            60 *
            60 *
            1000,
      ),
    );

  const [to, setTo] =
    useState(new Date());

  const items:
    Array<{
      key: Exclude<
        SupportPeriodPreset,
        'custom'
      >;
      label: string;
    }> = [
      {
        key: 'today',
        label: 'Today',
      },
      {
        key: '7',
        label: '7D',
      },
      {
        key: '30',
        label: '30D',
      },
      {
        key: 'month0',
        label: months[0],
      },
      {
        key: 'month1',
        label: months[1],
      },
      {
        key: 'month2',
        label: months[2],
      },
      {
        key: '90',
        label: '90D',
      },
    ];

  function apply() {
    const oldest =
      new Date();

    oldest.setHours(
      0,
      0,
      0,
      0,
    );

    oldest.setDate(
      oldest.getDate() -
        89,
    );

    const now =
      new Date();

    onChange({
      preset: 'custom',
      start:
        (
          from < oldest
            ? oldest
            : from
        ).toISOString(),
      end:
        (
          to > now
            ? now
            : to
        ).toISOString(),
    });

    setOpen(false);
  }

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={
          false
        }
        style={s.scroll}
        contentContainerStyle={
          s.row
        }
      >
        {items.map(
          (item) => (
            <Pressable
              key={item.key}
              onPress={() =>
                onChange({
                  preset:
                    item.key,
                })
              }
              style={[
                s.chip,
                value
                  .preset ===
                  item.key &&
                  s.active,
              ]}
            >
              <Text
                style={[
                  s.text,
                  value
                    .preset ===
                    item.key &&
                    s.activeText,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ),
        )}

        <Pressable
          onPress={() =>
            setOpen(true)
          }
          style={[
            s.icon,
            value.preset ===
              'custom' &&
              s.active,
          ]}
        >
          <Ionicons
            name="options-outline"
            size={18}
            color={
              value
                .preset ===
              'custom'
                ? '#FFFFFF'
                : colors.primary
            }
          />
        </Pressable>
      </ScrollView>

      <Modal
        transparent
        visible={open}
        animationType="fade"
        onRequestClose={() =>
          setOpen(false)
        }
      >
        <View
          style={s.overlay}
        >
          <View
            style={s.modal}
          >
            <Text
              style={
                s.modalTitle
              }
            >
              Custom period
            </Text>

            <Text
              style={
                s.modalText
              }
            >
              Maximum reporting
              window is 90 days.
            </Text>

            <Text
              style={s.label}
            >
              From
            </Text>

            <DateTimePicker
              value={from}
              mode="date"
              maximumDate={
                new Date()
              }
              onChange={(
                _,
                date,
              ) => {
                if (date) {
                  setFrom(date);
                }
              }}
            />

            <Text
              style={s.label}
            >
              To
            </Text>

            <DateTimePicker
              value={to}
              mode="date"
              maximumDate={
                new Date()
              }
              onChange={(
                _,
                date,
              ) => {
                if (date) {
                  setTo(date);
                }
              }}
            />

            <View
              style={
                s.actions
              }
            >
              <Pressable
                onPress={() =>
                  setOpen(false)
                }
                style={
                  s.cancel
                }
              >
                <Text
                  style={
                    s.cancelText
                  }
                >
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                onPress={apply}
                style={
                  s.apply
                }
              >
                <Text
                  style={
                    s.applyText
                  }
                >
                  Apply
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const s =
  StyleSheet.create({
    scroll: {
      flexGrow: 0,
      marginTop: 8,
      marginBottom: 10,
    },
    row: {
      alignItems:
        'center',
      gap: 7,
      paddingRight: 4,
    },
    chip: {
      height: 39,
      minWidth: 57,
      borderRadius: 999,
      borderWidth: 1,
      borderColor:
        colors.border,
      backgroundColor:
        colors.surface,
      paddingHorizontal: 13,
      alignItems:
        'center',
      justifyContent:
        'center',
    },
    icon: {
      width: 42,
      height: 39,
      borderRadius: 999,
      borderWidth: 1,
      borderColor:
        colors.border,
      backgroundColor:
        colors.surface,
      alignItems:
        'center',
      justifyContent:
        'center',
    },
    active: {
      backgroundColor:
        colors.primary,
      borderColor:
        colors.primary,
    },
    text: {
      color:
        colors.muted,
      fontSize: 10,
      fontWeight: '900',
    },
    activeText: {
      color: '#FFFFFF',
    },
    overlay: {
      flex: 1,
      justifyContent:
        'center',
      padding: 22,
      backgroundColor:
        'rgba(0,0,0,0.3)',
    },
    modal: {
      borderRadius: 20,
      backgroundColor:
        colors.surface,
      padding: 18,
    },
    modalTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '900',
    },
    modalText: {
      color:
        colors.muted,
      fontSize: 10,
      marginTop: 4,
    },
    label: {
      color: colors.text,
      fontSize: 10,
      fontWeight: '900',
      marginTop: 12,
    },
    actions: {
      flexDirection:
        'row',
      justifyContent:
        'flex-end',
      gap: 8,
      marginTop: 18,
    },
    cancel: {
      padding: 10,
    },
    cancelText: {
      color:
        colors.muted,
      fontWeight: '800',
    },
    apply: {
      borderRadius: 12,
      backgroundColor:
        colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    applyText: {
      color: '#FFFFFF',
      fontWeight: '900',
    },
  });
