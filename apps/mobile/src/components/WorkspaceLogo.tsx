import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import type { WorkspaceSlug } from '@/types/workspace';

const SUPPORT_CENTER_MARK = require('../../assets/brand/final/support-command-center-mark.png');

export function WorkspaceLogo({ workspace: _workspace, size = 34 }: { workspace: WorkspaceSlug; size?: number }) {
  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Image source={SUPPORT_CENTER_MARK} resizeMode="contain" style={{ width: size, height: size }} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
});
