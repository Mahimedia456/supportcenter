import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors } from '@/constants/theme';
import type { HealthState } from '@/lib/system-health';

export function HealthStatusCard({
  label,
  detail,
  state,
}: {
  label: string;
  detail: string;
  state: HealthState;
}) {
  const accent =
    state === 'healthy'
      ? colors.primary
      : state === 'warning'
        ? colors.warning
        : colors.danger;

  const background =
    state === 'healthy'
      ? colors.primarySoft
      : state === 'warning'
        ? '#FFF5DF'
        : '#FDECEC';

  return (
    <View style={s.card}>
      <View style={s.top}>
        <View style={s.titleWrap}>
          <View
            style={[
              s.dot,
              { backgroundColor: accent },
            ]}
          />
          <Text style={s.label}>{label}</Text>
        </View>

        <View
          style={[
            s.badge,
            { backgroundColor: background },
          ]}
        >
          <Text
            style={[
              s.badgeText,
              { color: accent },
            ]}
          >
            {state.toUpperCase()}
          </Text>
        </View>
      </View>

      <Text style={s.detail}>{detail}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 15,
    marginBottom: 10,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    flex: 1,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  detail: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 9,
  },
});
