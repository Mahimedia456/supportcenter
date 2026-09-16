import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  router,
  type Href,
} from 'expo-router';
import { WorkspaceHeader } from '@/components/WorkspaceHeader';
import { AppCard } from '@/components/AppCard';
import { DeviceHealthCard } from '@/components/devices/DeviceHealthCard';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import * as api from '@/lib/api';
import { loadZendeskTicketUniverse, forceZendeskDbSync } from '@/lib/zendesk-source';
import {
  buildDeviceHealth,
} from '@/lib/device-health';
import {
  detectedMapping,
} from '@/lib/zendesk-dimensions';

export default function Devices() {
  const {
    session,
    ensureFreshSession,
  } = useAuth();

  const [tickets, setTickets] =
    useState<api.ZendeskTicket[]>([]);
  const [fields, setFields] =
    useState<
      api.ZendeskTicketField[]
    >([]);
  const [forms, setForms] =
    useState<api.ZendeskForm[]>([]);
  const [query, setQuery] =
    useState('');
  const [loading, setLoading] =
    useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');

    const fresh =
      await ensureFreshSession();
    const token =
      fresh?.accessToken ||
      session?.accessToken;

    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const ticketResult =
        await loadZendeskTicketUniverse(
          token,
        );

      setTickets(
        ticketResult.tickets || [],
      );

      const metadata =
        await Promise.allSettled([
          api.zendeskFields(token),
          api.zendeskForms(token),
        ]);

      const [
        fieldResult,
        formResult,
      ] = metadata;

      if (
        fieldResult.status ===
        'fulfilled'
      ) {
        setFields(
          fieldResult.value
            .ticket_fields || [],
        );
      }

      if (
        formResult.status ===
        'fulfilled'
      ) {
        setForms(
          formResult.value
            .ticket_forms || [],
        );
      }
    } catch (e: any) {
      setError(
        e?.message ||
          'Unable to load Zendesk product data.',
      );
    } finally {
      setLoading(false);
    }
  }, [
    ensureFreshSession,
    session?.accessToken,
  ]);

  useEffect(() => {
    void load();
  }, []);

  async function refresh() {
    setRefreshing(true);

    try {
      const fresh = await ensureFreshSession();
      const token = fresh?.accessToken || session?.accessToken;

      if (token) {
        await forceZendeskDbSync(token);
      }

      await load();
    } finally {
      setRefreshing(false);
    }
  }

  const mapping = useMemo(
    () => detectedMapping(fields),
    [fields],
  );

  const rows = useMemo(
    () =>
      buildDeviceHealth(
        tickets,
        fields,
        forms,
      ),
    [fields, forms, tickets],
  );

  const filtered = useMemo(() => {
    const needle =
      query.trim().toLowerCase();

    return rows.filter(
      (row) =>
        !needle ||
        row.device
          .toLowerCase()
          .includes(needle),
    );
  }, [query, rows]);

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          tintColor={colors.primary}
        />
      }
    >
      <WorkspaceHeader />

      <Text style={s.eyebrow}>
        ATOMOS PRODUCT HEALTH
      </Text>
      <Text style={s.title}>
        Devices
      </Text>
      <Text style={s.caption}>
        Device/Product custom field
        grouped from Zendesk tickets
      </Text>

      <AppCard style={s.mapping}>
        <Text style={s.mappingLabel}>
          DETECTED DEVICE FIELD
        </Text>
        <Text style={s.mappingValue}>
          {mapping.device?.title ||
            'Not detected'}
        </Text>
      </AppCard>

      <View style={s.search}>
        <Ionicons
          name="search-outline"
          size={20}
          color={colors.muted}
        />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search device or product"
          placeholderTextColor={
            colors.muted
          }
          style={s.input}
        />
        {query ? (
          <Pressable
            onPress={() =>
              setQuery('')
            }
          >
            <Ionicons
              name="close-circle"
              size={19}
              color={colors.muted}
            />
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <AppCard>
          <Text style={s.error}>
            {error}
          </Text>
        </AppCard>
      ) : null}

      {loading ? (
        <View style={s.loading}>
          <ActivityIndicator
            color={colors.primary}
          />
        </View>
      ) : (
        <>
          <View style={s.sectionRow}>
            <Text style={s.sectionTitle}>
              Device-wise tickets
            </Text>
            <Text style={s.count}>
              {filtered.length}
            </Text>
          </View>

          {filtered.map((row) => (
            <DeviceHealthCard
              key={row.device}
              row={row}
              onPress={() =>
                router.push({
                  pathname:
                    '/device/[name]',
                  params: {
                    name: row.device,
                  },
                } as unknown as Href)
              }
            />
          ))}

          {!filtered.length &&
          !error ? (
            <AppCard>
              <Text style={s.emptyTitle}>
                No Device values grouped
              </Text>
              <Text style={s.emptyText}>
                Detected field:{' '}
                {mapping.device?.title ||
                  'none'}. Ticket detail
                custom fields remain the
                source of truth.
              </Text>
            </AppCard>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 120,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  title: {
    color: colors.text,
    fontSize: 29,
    fontWeight: '900',
    marginTop: 5,
  },
  caption: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 5,
  },
  mapping: {
    marginTop: 14,
    backgroundColor: '#F5FBF8',
  },
  mappingLabel: {
    color: colors.muted,
    fontSize: 8,
    fontWeight: '900',
  },
  mappingValue: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
    marginTop: 5,
  },
  search: {
    minHeight: 52,
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 12,
  },
  error: {
    color: colors.danger,
    fontWeight: '700',
  },
  loading: {
    paddingVertical: 60,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    marginBottom: 10,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  count: {
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: 10,
    fontWeight: '900',
  },
  emptyTitle: {
    color: colors.text,
    fontWeight: '900',
  },
  emptyText: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 5,
  },
});
