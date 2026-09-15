import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import type { WorkspaceSlug } from '@/types/workspace';

const LOGOS = {
  angelbird: require('../../assets/brand/workspaces/angelbird/angelbird-mark.png'),
  atomos: require('../../assets/brand/workspaces/atomos/atomos-mark.png'),
} as const;

export function WorkspaceLogo({
  workspace,
  size = 34,
}: {
  workspace: WorkspaceSlug;
  size?: number;
}) {
  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Image
        source={LOGOS[workspace]}
        resizeMode="contain"
        style={{ width: size, height: size }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
