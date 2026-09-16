
import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';
import {
  router,
  type Href,
} from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

export function ViewDeviceTicketsButton({
  device,
  count,
}: {
  device: string;
  count: number;
}) {
  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname:
            '/ticket-results',
          params: {
            mode:
              'atomos-field',
            role: 'device',
            value: device,
            title:
              `${device} tickets`,
          },
        } as unknown as Href)
      }
      style={s.button}
    >
      <Text style={s.text}>
        View all {count} tickets
      </Text>
      <Ionicons
        name="arrow-forward"
        size={18}
        color="#FFFFFF"
      />
    </Pressable>
  );
}

const s = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor:
      colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
});
