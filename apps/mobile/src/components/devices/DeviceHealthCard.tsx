import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors } from '@/constants/theme';
import type { DeviceHealthRow } from '@/lib/device-health';

export function DeviceHealthCard({
  row,
  onPress,
}: {
  row: DeviceHealthRow;
  onPress: () => void;
}) {
  const trendPositive =
    row.trendPct !== null && row.trendPct > 0;
  const trendNegative =
    row.trendPct !== null && row.trendPct < 0;

  return (
    <Pressable onPress={onPress} style={s.card}>
      <View style={s.header}>
        <View style={s.deviceWrap}>
          <View style={s.iconBubble}>
            <Text style={s.iconText}>D</Text>
          </View>

          <View style={s.deviceText}>
            <Text style={s.device} numberOfLines={1}>
              {row.device}
            </Text>
            <Text style={s.sub}>
              {row.total} support case
              {row.total === 1 ? '' : 's'}
            </Text>
          </View>
        </View>

        <View
          style={[
            s.trend,
            trendPositive && s.trendUp,
            trendNegative && s.trendDown,
          ]}
        >
          <Text
            style={[
              s.trendText,
              trendPositive && s.trendTextUp,
              trendNegative && s.trendTextDown,
            ]}
          >
            {row.trendPct === null
              ? '—'
              : `${row.trendPct > 0 ? '+' : ''}${row.trendPct}%`}
          </Text>
        </View>
      </View>

      <View style={s.metrics}>
        <Metric
          label="Open"
          value={row.open}
        />
        <Metric
          label="Faulty"
          value={row.faulty}
          accent
        />
        <Metric
          label="RMA"
          value={row.rma}
        />
        <Metric
          label="High"
          value={row.high}
        />
      </View>

      <View style={s.footer}>
        <Text style={s.footerText}>
          Last 7 days {row.last7Days}
        </Text>
        <Text style={s.openLink}>View health ›</Text>
      </View>
    </Pressable>
  );
}

function Metric({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <View style={s.metric}>
      <Text
        style={[
          s.metricValue,
          accent && s.metricValueAccent,
        ]}
      >
        {value}
      </Text>
      <Text style={s.metricLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 16,
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  deviceWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  iconBubble: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    color: colors.primary,
    fontWeight: '900',
    fontSize: 14,
  },
  deviceText: {
    flex: 1,
  },
  device: {
    color: colors.text,
    fontWeight: '900',
    fontSize: 16,
  },
  sub: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 4,
  },
  trend: {
    borderRadius: 999,
    backgroundColor: '#EFF3F2',
    paddingHorizontal: 9,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  trendUp: {
    backgroundColor: '#FFF4DF',
  },
  trendDown: {
    backgroundColor: colors.primarySoft,
  },
  trendText: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: '900',
  },
  trendTextUp: {
    color: colors.warning,
  },
  trendTextDown: {
    color: colors.primary,
  },
  metrics: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 15,
  },
  metric: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 10,
  },
  metricValue: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  metricValueAccent: {
    color: colors.primary,
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 8,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginTop: 3,
  },
  footer: {
    marginTop: 13,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    color: colors.muted,
    fontSize: 10,
  },
  openLink: {
    color: colors.cyan,
    fontSize: 10,
    fontWeight: '900',
  },
});
