import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import {
  router,
  type Href,
} from 'expo-router';
import { WorkspaceHeader } from '@/components/WorkspaceHeader';
import { AppCard } from '@/components/AppCard';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

export default function ProfileScreen() {
  const { session, signOut } = useAuth();

  const [slaAlerts, setSlaAlerts] = useState(true);
  const [priorityAlerts, setPriorityAlerts] =
    useState(true);
  const [feedbackAlerts, setFeedbackAlerts] =
    useState(true);
  const [spikeAlerts, setSpikeAlerts] = useState(true);

  const workspace = useMemo(() => {
    const raw: any = session?.workspace;

    return {
      name:
        raw?.name ||
        raw?.displayName ||
        (raw?.slug === 'atomos'
          ? 'Atomos'
          : raw?.slug === 'angelbird'
            ? 'AngelBird'
            : 'Support Workspace'),
      slug: raw?.slug || 'workspace',
    };
  }, [session?.workspace]);

  const user: any = session?.user || {};

  function openHealth() {
    router.push(
      '/system-health' as unknown as Href,
    );
  }

  async function handleSignOut() {
    await signOut();
  }

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.content}
    >
      <View style={s.topNav}>
        <Pressable
          onPress={() => router.back()}
          style={s.back}
        >
          <Text style={s.backText}>â€¹</Text>
        </Pressable>

        <Text style={s.topTitle}>Account</Text>
        <View style={s.topSpacer} />
      </View>

      <WorkspaceHeader />

      <AppCard style={s.profileCard}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>
            {String(
              user?.displayName ||
                user?.name ||
                user?.email ||
                'M',
            )
              .slice(0, 1)
              .toUpperCase()}
          </Text>
        </View>

        <View style={s.identity}>
          <Text style={s.name}>
            {user?.displayName ||
              user?.name ||
              'Manager'}
          </Text>
          <Text style={s.email}>
            {user?.email || 'Manager account'}
          </Text>

          <View style={s.managerBadge}>
            <Text style={s.managerBadgeText}>
              MANAGER â€¢ READ ONLY
            </Text>
          </View>
        </View>
      </AppCard>

      <Text style={s.sectionTitle}>
        Workspace
      </Text>

      <AppCard>
        <InfoRow
          label="Workspace"
          value={workspace.name}
        />
        <InfoRow
          label="Workspace ID"
          value={workspace.slug}
        />
        <InfoRow
          label="Data source"
          value="Zendesk"
        />
        <InfoRow
          label="Mode"
          value="Read only"
          last
        />
      </AppCard>

      <Text style={s.sectionTitle}>
        Notifications
      </Text>
      <Text style={s.sectionCaption}>
        Local manager preferences for the alert experience
      </Text>

      <AppCard>
        <ToggleRow
          label="SLA / stale activity"
          caption="Operational risk and no-recent-activity signals"
          value={slaAlerts}
          onValueChange={setSlaAlerts}
        />
        <ToggleRow
          label="High priority"
          caption="High and urgent ticket visibility"
          value={priorityAlerts}
          onValueChange={setPriorityAlerts}
        />
        <ToggleRow
          label="Bad feedback"
          caption="Negative CSAT signals"
          value={feedbackAlerts}
          onValueChange={setFeedbackAlerts}
        />
        <ToggleRow
          label="Volume spikes"
          caption="Device, region and form concentration"
          value={spikeAlerts}
          onValueChange={setSpikeAlerts}
          last
        />
      </AppCard>

      <Text style={s.sectionTitle}>
        System
      </Text>

      <Pressable onPress={openHealth}>
        <AppCard style={s.systemCard}>
          <View style={s.systemIcon}>
            <Text style={s.systemIconText}>H</Text>
          </View>

          <View style={s.systemText}>
            <Text style={s.systemTitle}>
              System Health
            </Text>
            <Text style={s.systemCaption}>
              Backend, database, session and Zendesk status
            </Text>
          </View>

          <Text style={s.chevron}>â€º</Text>
        </AppCard>
      </Pressable>

      <Pressable
        onPress={handleSignOut}
        style={s.logoutButton}
      >
        <Text style={s.logoutText}>Log out</Text>
      </Pressable>

      <Text style={s.footer}>
        Support Command Center â€¢ manager read-only experience
      </Text>
    </ScrollView>
  );
}

function InfoRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View
      style={[
        s.infoRow,
        last && s.lastRow,
      ]}
    >
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  );
}

function ToggleRow({
  label,
  caption,
  value,
  onValueChange,
  last = false,
}: {
  label: string;
  caption: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  last?: boolean;
}) {
  return (
    <View
      style={[
        s.toggleRow,
        last && s.lastRow,
      ]}
    >
      <View style={s.toggleText}>
        <Text style={s.toggleLabel}>
          {label}
        </Text>
        <Text style={s.toggleCaption}>
          {caption}
        </Text>
      </View>

      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{
          false: '#DDE5E2',
          true: colors.primarySoft,
        }}
        thumbColor={
          value ? colors.primary : '#ffffff'
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 18,
    paddingTop: 22,
    paddingBottom: 80,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    color: colors.text,
    fontSize: 34,
    lineHeight: 36,
    marginTop: -3,
  },
  topTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  topSpacer: {
    width: 44,
  },
  profileCard: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 19,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: '900',
  },
  identity: {
    marginLeft: 14,
    flex: 1,
  },
  name: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  email: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 4,
  },
  managerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.cyanSoft,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginTop: 9,
  },
  managerBadgeText: {
    color: colors.cyan,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
    marginTop: 22,
    marginBottom: 9,
  },
  sectionCaption: {
    color: colors.muted,
    fontSize: 10,
    marginTop: -4,
    marginBottom: 9,
  },
  infoRow: {
    minHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  infoLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  infoValue: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'right',
    flex: 1,
  },
  toggleRow: {
    minHeight: 70,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleText: {
    flex: 1,
    paddingRight: 8,
  },
  toggleLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
  },
  toggleCaption: {
    color: colors.muted,
    fontSize: 9,
    lineHeight: 14,
    marginTop: 4,
  },
  systemCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  systemIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  systemIconText: {
    color: colors.primary,
    fontWeight: '900',
  },
  systemText: {
    flex: 1,
    marginLeft: 12,
  },
  systemTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  systemCaption: {
    color: colors.muted,
    fontSize: 9,
    lineHeight: 14,
    marginTop: 4,
  },
  chevron: {
    color: colors.cyan,
    fontSize: 24,
  },
  logoutButton: {
    marginTop: 24,
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1CFCF',
    backgroundColor: '#FFF7F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '900',
  },
  footer: {
    color: colors.muted,
    fontSize: 9,
    textAlign: 'center',
    marginTop: 18,
  },
});

