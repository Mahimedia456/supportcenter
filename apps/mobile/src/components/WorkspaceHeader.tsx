
import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Ionicons,
} from '@expo/vector-icons';
import {
  router,
} from 'expo-router';
import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  useAuth,
} from '@/context/AuthContext';
import {
  WorkspaceLogo,
} from '@/components/WorkspaceLogo';
import {
  colors,
} from '@/constants/theme';

export function WorkspaceHeader({
  safeTop = true,
}: {
  safeTop?: boolean;
}) {
  const { session } =
    useAuth();

  const insets =
    useSafeAreaInsets();

  if (!session) {
    return null;
  }

  return (
    <View
      style={[
        s.shell,
        safeTop && {
          paddingTop:
            Math.max(
              insets.top,
              8,
            ),
        },
      ]}
    >
      <View style={s.row}>
        <View style={s.brand}>
          <View
            style={
              s.logoWrap
            }
          >
            <WorkspaceLogo
              workspace={
                session
                  .workspace
                  .slug
              }
              size={35}
            />
          </View>

          <View style={s.copy}>
            <Text
              style={s.name}
              numberOfLines={1}
            >
              {
                session
                  .workspace
                  .supportLabel
              }
            </Text>

            <View
              style={
                s.connectedRow
              }
            >
              <View
                style={s.dot}
              />

              <Text
                style={
                  s.connected
                }
              >
                Connected workspace
              </Text>
            </View>
          </View>
        </View>

        <View
          style={s.actions}
        >
          <Pressable
            onPress={() =>
              router.push(
                '/alerts',
              )
            }
            style={({
              pressed,
            }) => [
              s.actionButton,
              pressed &&
                s.pressed,
            ]}
            accessibilityLabel="Alerts"
          >
            <Ionicons
              name="notifications-outline"
              size={21}
              color={
                colors.primary
              }
            />
          </Pressable>

          <Pressable
            onPress={() =>
              router.push(
                '/profile',
              )
            }
            style={({
              pressed,
            }) => [
              s.avatar,
              pressed &&
                s.pressed,
            ]}
          >
            <Text
              style={
                s.avatarText
              }
            >
              {session.user
                .displayName
                .slice(0, 2)
                .toUpperCase()}
            </Text>

            <View
              style={
                s.avatarBadge
              }
            >
              <Ionicons
                name="checkmark"
                size={9}
                color="#FFFFFF"
              />
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const s =
  StyleSheet.create({
    shell: {
      paddingBottom: 14,
    },
    row: {
      minHeight: 54,
      flexDirection:
        'row',
      alignItems:
        'center',
      justifyContent:
        'space-between',
    },
    brand: {
      flex: 1,
      flexDirection:
        'row',
      alignItems:
        'center',
      gap: 11,
      marginRight: 10,
    },
    logoWrap: {
      width: 46,
      height: 46,
      borderRadius: 15,
      backgroundColor:
        colors.surface,
      borderWidth: 1,
      borderColor:
        colors.border,
      alignItems:
        'center',
      justifyContent:
        'center',
    },
    copy: {
      flex: 1,
    },
    name: {
      color:
        colors.text,
      fontWeight:
        '900',
      fontSize: 17,
      letterSpacing:
        -0.2,
    },
    connectedRow: {
      flexDirection:
        'row',
      alignItems:
        'center',
      gap: 6,
      marginTop: 4,
    },
    dot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor:
        colors.lime,
    },
    connected: {
      color:
        colors.muted,
      fontSize: 11,
      fontWeight:
        '700',
    },
    actions: {
      flexDirection:
        'row',
      alignItems:
        'center',
      gap: 8,
    },
    actionButton: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor:
        colors.surface,
      borderWidth: 1,
      borderColor:
        colors.border,
      alignItems:
        'center',
      justifyContent:
        'center',
    },
    avatar: {
      width: 46,
      height: 46,
      borderRadius: 15,
      backgroundColor:
        colors.primarySoft,
      borderWidth: 1,
      borderColor:
        '#CFE9DD',
      alignItems:
        'center',
      justifyContent:
        'center',
    },
    pressed: {
      opacity: 0.76,
    },
    avatarText: {
      color:
        colors.primary,
      fontWeight:
        '900',
      fontSize: 14,
    },
    avatarBadge: {
      position:
        'absolute',
      right: -2,
      bottom: -2,
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor:
        colors.primary,
      borderWidth: 2,
      borderColor:
        colors.background,
      alignItems:
        'center',
      justifyContent:
        'center',
    },
  });
