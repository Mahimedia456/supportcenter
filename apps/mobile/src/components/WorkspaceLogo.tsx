import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import type { WorkspaceSlug } from '@/types/workspace';

// Workspace brands remain independent of the neutral SupportCenter identity.
const ATOMOS_MARK = require('../../assets/brand/workspaces/atomos/atomos-mark.png');
const ANGELBIRD_MARK = require('../../assets/brand/workspaces/angelbird/angelbird-mark.png');
const SUPPORTCENTER_MARK = require('../../assets/brand/p27-final/supportcenter-mark.png');

export function getWorkspaceBrandLabel(workspace: WorkspaceSlug | string | null | undefined): string {
  if (workspace === 'atomos') return 'Atomos Support';
  if (workspace === 'angelbird') return 'Angelbird Support';
  return 'SupportCenter';
}

export function WorkspaceLogo({ workspace, size = 34 }: { workspace: WorkspaceSlug; size?: number }) {
  const source = workspace === 'atomos'
    ? ATOMOS_MARK
    : workspace === 'angelbird'
      ? ANGELBIRD_MARK
      : SUPPORTCENTER_MARK;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Image source={source} resizeMode="contain" style={{ width: size, height: size }} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
});
