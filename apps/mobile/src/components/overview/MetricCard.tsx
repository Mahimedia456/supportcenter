import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';

type Tone = 'green' | 'cyan' | 'lime' | 'neutral';

const TONES: Record<Tone, { bg: string; accent: string }> = {
  green: { bg: '#EEF8F3', accent: colors.primary },
  cyan: { bg: colors.cyanSoft, accent: colors.cyan },
  lime: { bg: '#F3F9DF', accent: '#6E8F21' },
  neutral: { bg: colors.surface, accent: colors.text },
};

export function MetricCard({
  label,
  value,
  caption,
  tone = 'neutral',
  onPress,
}: {
  label: string;
  value: number | string;
  caption?: string;
  tone?: Tone;
  onPress?: () => void;
}) {
  const toneStyle = TONES[tone];

  return (
    <Pressable onPress={onPress} style={[s.card, { backgroundColor: toneStyle.bg }]}>
      <View style={s.top}>
        <Text style={s.label}>{label}</Text>
        <Text style={[s.arrow, { color: toneStyle.accent }]}>›</Text>
      </View>
      <Text style={[s.value, { color: toneStyle.accent }]}>{value}</Text>
      {caption ? <Text style={s.caption}>{caption}</Text> : null}
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 120,
    borderRadius: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
  },
  arrow: {
    fontSize: 18,
    fontWeight: '900',
  },
  value: {
    marginTop: 12,
    fontSize: 29,
    fontWeight: '900',
  },
  caption: {
    marginTop: 6,
    color: colors.muted,
    fontSize: 10,
    lineHeight: 14,
  },
});
