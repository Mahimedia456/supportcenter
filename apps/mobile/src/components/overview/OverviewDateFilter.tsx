
import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '@/constants/theme';

type Props = {
  period?: any;
  value?: any;
  from?: Date;
  to?: Date;
  onPreset?: (value: any) => void;
  onChange?: (value: any) => void;
  onCustom?: (from: Date, to: Date) => void;
};

const PRESETS: Array<{
  key: any;
  label: string;
}> = [
  { key: 'today', label: 'Today' },
  { key: '7', label: '7 Days' },
  { key: '30', label: '30 Days' },
  { key: '90', label: '90 Days' },
];

export function OverviewDateFilter({
  period,
  value,
  from,
  to,
  onPreset,
  onChange,
  onCustom,
}: Props) {
  const selected = period ?? value ?? '90';

  const [open, setOpen] = useState(false);

  const [localFrom, setLocalFrom] =
    useState<Date>(
      from ??
        new Date(
          Date.now() -
            6 * 24 * 60 * 60 * 1000,
        ),
    );

  const [localTo, setLocalTo] =
    useState<Date>(
      to ?? new Date(),
    );

  const emitPreset = (next: any) => {
    if (onPreset) {
      onPreset(next);
      return;
    }

    onChange?.(next);
  };

  const applyCustom = () => {
    const oldest = new Date();
    oldest.setHours(0, 0, 0, 0);
    oldest.setDate(
      oldest.getDate() - 89,
    );

    const now = new Date();

    const safeFrom =
      localFrom < oldest
        ? oldest
        : localFrom;

    const safeTo =
      localTo > now
        ? now
        : localTo;

    onCustom?.(
      safeFrom,
      safeTo,
    );

    setOpen(false);
  };

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={
          false
        }
        contentContainerStyle={
          s.row
        }
      >
        {PRESETS.map((item) => (
          <Pressable
            key={String(item.key)}
            onPress={() =>
              emitPreset(item.key)
            }
            style={[
              s.chip,
              selected ===
                item.key &&
                s.active,
            ]}
          >
            <Text
              style={[
                s.text,
                selected ===
                  item.key &&
                  s.activeText,
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}

        <Pressable
          onPress={() =>
            setOpen(true)
          }
          style={[
            s.icon,
            selected ===
              'custom' &&
              s.active,
          ]}
        >
          <Ionicons
            name="options-outline"
            size={17}
            color={
              selected ===
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
        <View style={s.overlay}>
          <View style={s.modal}>
            <Text
              style={s.modalTitle}
            >
              Custom period
            </Text>

            <Text
              style={
                s.modalCaption
              }
            >
              Reporting is limited
              to the last 90 days.
            </Text>

            <Text style={s.label}>
              From
            </Text>

            <DateTimePicker
              value={localFrom}
              mode="date"
              maximumDate={
                new Date()
              }
              onChange={(
                _,
                date,
              ) => {
                if (date) {
                  setLocalFrom(
                    date,
                  );
                }
              }}
            />

            <Text style={s.label}>
              To
            </Text>

            <DateTimePicker
              value={localTo}
              mode="date"
              maximumDate={
                new Date()
              }
              onChange={(
                _,
                date,
              ) => {
                if (date) {
                  setLocalTo(date);
                }
              }}
            />

            <View
              style={s.actions}
            >
              <Pressable
                onPress={() =>
                  setOpen(false)
                }
                style={s.cancel}
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
                onPress={
                  applyCustom
                }
                style={s.apply}
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

export default OverviewDateFilter;

const s = StyleSheet.create({
  row: {
    gap: 7,
    paddingVertical: 10,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor:
      colors.border,
    backgroundColor:
      colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  icon: {
    width: 38,
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor:
      colors.border,
    backgroundColor:
      colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  active: {
    backgroundColor:
      colors.primary,
    borderColor:
      colors.primary,
  },
  text: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: '900',
  },
  activeText: {
    color: '#FFFFFF',
  },
  overlay: {
    flex: 1,
    backgroundColor:
      'rgba(0,0,0,0.28)',
    justifyContent: 'center',
    padding: 22,
  },
  modal: {
    borderRadius: 22,
    backgroundColor:
      colors.surface,
    padding: 18,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '900',
  },
  modalCaption: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 4,
    marginBottom: 10,
  },
  label: {
    color: colors.text,
    fontSize: 10,
    fontWeight: '900',
    marginTop: 10,
  },
  actions: {
    flexDirection: 'row',
    justifyContent:
      'flex-end',
    gap: 8,
    marginTop: 18,
  },
  cancel: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  cancelText: {
    color: colors.muted,
    fontWeight: '800',
  },
  apply: {
    borderRadius: 12,
    backgroundColor:
      colors.primary,
    paddingHorizontal: 17,
    paddingVertical: 10,
  },
  applyText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
});
