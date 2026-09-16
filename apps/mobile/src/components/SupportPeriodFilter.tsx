
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
import type {
  SupportPeriod,
  SupportPeriodPreset,
} from '@/lib/support-period';

const PRESETS: Array<{
  key: Exclude<SupportPeriodPreset, 'custom'>;
  label: string;
}> = [
  { key: 'today', label: 'Today' },
  { key: '7', label: '7 Days' },
  { key: '30', label: '30 Days' },
  { key: '90', label: '90 Days' },
];

export function SupportPeriodFilter({
  value,
  onChange,
}: {
  value: SupportPeriod;
  onChange: (value: SupportPeriod) => void;
}) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(
    value.start
      ? new Date(value.start)
      : new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
  );
  const [end, setEnd] = useState(
    value.end ? new Date(value.end) : new Date(),
  );

  function applyCustom() {
    const min90 = new Date();
    min90.setDate(min90.getDate() - 89);

    const safeStart =
      start < min90 ? min90 : start;

    onChange({
      preset: 'custom',
      start: safeStart.toISOString(),
      end: end.toISOString(),
    });

    setOpen(false);
  }

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.row}
      >
        {PRESETS.map((item) => (
          <Pressable
            key={item.key}
            onPress={() =>
              onChange({ preset: item.key })
            }
            style={[
              s.chip,
              value.preset === item.key && s.active,
            ]}
          >
            <Text
              style={[
                s.text,
                value.preset === item.key && s.activeText,
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}

        <Pressable
          onPress={() => setOpen(true)}
          style={[
            s.iconChip,
            value.preset === 'custom' && s.active,
          ]}
        >
          <Ionicons
            name="options-outline"
            size={17}
            color={
              value.preset === 'custom'
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
        onRequestClose={() => setOpen(false)}
      >
        <View style={s.overlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Custom period</Text>
            <Text style={s.modalCaption}>
              Reporting is limited to the last 90 days.
            </Text>

            <Text style={s.label}>From</Text>
            <DateTimePicker
              value={start}
              mode="date"
              maximumDate={new Date()}
              onChange={(_, date) => {
                if (date) setStart(date);
              }}
            />

            <Text style={s.label}>To</Text>
            <DateTimePicker
              value={end}
              mode="date"
              maximumDate={new Date()}
              onChange={(_, date) => {
                if (date) setEnd(date);
              }}
            />

            <View style={s.actions}>
              <Pressable
                onPress={() => setOpen(false)}
                style={s.cancel}
              >
                <Text style={s.cancelText}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={applyCustom}
                style={s.apply}
              >
                <Text style={s.applyText}>Apply</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  row: {
    gap: 7,
    paddingVertical: 10,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  iconChip: {
    width: 38,
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  active: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
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
    backgroundColor: 'rgba(0,0,0,0.28)',
    justifyContent: 'center',
    padding: 22,
  },
  modal: {
    borderRadius: 22,
    backgroundColor: colors.surface,
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
    marginBottom: 12,
  },
  label: {
    color: colors.text,
    fontSize: 10,
    fontWeight: '900',
    marginTop: 12,
    marginBottom: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
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
    backgroundColor: colors.primary,
    paddingHorizontal: 17,
    paddingVertical: 10,
  },
  applyText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
});
