import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { WorkspaceLogo } from '@/components/WorkspaceLogo';
import { colors } from '@/constants/theme';

export function WorkspaceHeader() {
  const { session } = useAuth();
  if (!session) return null;

  return (
    <View style={styles.row}>
      <View style={styles.brand}>
        <WorkspaceLogo workspace={session.workspace.slug} size={38} />
        <View>
          <Text style={styles.name}>{session.workspace.supportLabel}</Text>
          <View style={styles.liveRow}>
            <View style={styles.dot} />
            <Text style={styles.live}>Connected workspace</Text>
          </View>
        </View>
      </View>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {session.user.displayName.slice(0, 2).toUpperCase()}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { color: colors.text, fontWeight: '800', fontSize: 17 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#22C55E' },
  live: { color: colors.muted, fontSize: 12 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#DDF7F0', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primary, fontWeight: '800' },
});
