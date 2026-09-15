import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { finalTheme } from '@/constants/final-theme';

export function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  style,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const blocked = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={blocked}
      style={({ pressed }) => [
        s.wrap,
        style,
        pressed && !blocked ? s.pressed : null,
        blocked ? s.disabled : null,
      ]}
    >
      <LinearGradient
        colors={['#087A62', '#0A9B72', '#20C985']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={s.gradient}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={s.label}>{label}</Text>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const s = StyleSheet.create({
  wrap: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#087A62',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  gradient: {
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  label: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 0.2,
  },
  pressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.96,
  },
  disabled: {
    opacity: 0.58,
  },
});
