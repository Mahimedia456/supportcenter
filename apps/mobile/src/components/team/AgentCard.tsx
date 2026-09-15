import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors } from '@/constants/theme';
import type { AgentRow } from '@/lib/feedback-team';

export function AgentCard({
  row,
  onPress,
}: {
  row: AgentRow;
  onPress: () => void;
}) {
  const goodPct = row.feedbackTotal
    ? Math.round((row.good / row.feedbackTotal) * 100)
    : null;

  return (
    <Pressable onPress={onPress} style={s.card}>
      <View style={s.header}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>
            {row.name.slice(0, 1).toUpperCase()}
          </Text>
        </View>

        <View style={s.identity}>
          <Text style={s.name}>{row.name}</Text>
          <Text style={s.email} numberOfLines={1}>
            {row.email || `Agent #${row.id}`}
          </Text>
        </View>

        <Text style={s.chevron}>›</Text>
      </View>

      <View style={s.metrics}>
        <Metric label="Assigned" value={row.assigned} />
        <Metric label="Open" value={row.open} />
        <Metric label="High" value={row.high} accent />
        <Metric
          label="CSAT"
          value={goodPct === null ? '—' : `${goodPct}%`}
        />
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
  value: number | string;
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
    borderRadius: 19,
    padding: 15,
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.primary,
    fontWeight: '900',
  },
  identity: {
    flex: 1,
    marginLeft: 11,
  },
  name: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  email: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 4,
  },
  chevron: {
    color: colors.cyan,
    fontSize: 24,
  },
  metrics: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 14,
  },
  metric: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: colors.background,
    padding: 9,
  },
  metricValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  metricValueAccent: {
    color: colors.warning,
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 8,
    fontWeight: '800',
    marginTop: 3,
    textTransform: 'uppercase',
  },
});
