import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Redirect, Slot, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { colors } from '@/constants/theme';

const BRAND_MARK = require('../../assets/brand/p27-final/supportcenter-mark.png');

function Gate() {
  const { session, booting } = useAuth();
  const segments = useSegments();

  if (booting) {
    return (
      <View style={styles.boot}>
        <Image source={BRAND_MARK} resizeMode="contain" style={styles.bootLogo} />
      </View>
    );
  }

  const inAuth = segments[0] === '(auth)';
  if (!session && !inAuth) return <Redirect href="/(auth)/login" />;
  if (session && inAuth) return <Redirect href="/(tabs)" />;
  return <Slot />;
}

export default function RootLayout() {
  return <AuthProvider><Gate /></AuthProvider>;
}

const styles = StyleSheet.create({
  boot: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  bootLogo: { width: 150, height: 150 },
});
