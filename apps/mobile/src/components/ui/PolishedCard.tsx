import React, { PropsWithChildren } from 'react';
import {
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { finalTheme } from '@/constants/final-theme';

export function PolishedCard({
  children,
  style,
}: PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
}>) {
  return (
    <View style={[s.card, style]}>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: finalTheme.colors.surface,
    borderRadius: finalTheme.radius.lg,
    borderWidth: 1,
    borderColor: finalTheme.colors.border,
    padding: 16,
    ...finalTheme.shadow,
  },
});
