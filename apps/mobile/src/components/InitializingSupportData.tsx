
import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors } from '@/constants/theme';

export function InitializingSupportData() {
  return (
    <View style={s.wrap}>
      <ActivityIndicator
        color={colors.primary}
      />
      <Text style={s.title}>
        Initializing support data…
      </Text>
      <Text style={s.caption}>
        Loading the latest synced Zendesk snapshot
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 72,
  },
  title: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
    marginTop: 12,
  },
  caption: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 5,
    textAlign: 'center',
  },
});
