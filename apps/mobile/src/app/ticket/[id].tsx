import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AppCard } from '@/components/AppCard';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import * as api from '@/lib/api';
import { readableDate, statusLabel } from '@/types/zendesk-ui';

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <View style={s.detailRow}>
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={s.detailValue}>{value === null || value === undefined || value === '' ? '—' : String(value)}</Text>
    </View>
  );
}

export default function TicketDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const { session, ensureFreshSession } = useAuth();

  const ticketId = Number(params.id);
  const [data, setData] = useState<api.ZendeskTicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!Number.isFinite(ticketId)) {
      setError('Invalid ticket ID.');
      setLoading(false);
      return;
    }

    setError('');

    const fresh = await ensureFreshSession();
    const accessToken = fresh?.accessToken || session?.accessToken;

    if (!accessToken) {
      setLoading(false);
      return;
    }

    try {
      setData(await api.zendeskTicket(accessToken, ticketId));
    } catch (e: any) {
      setError(e?.message || 'Unable to load ticket.');
    } finally {
      setLoading(false);
    }
  }, [ensureFreshSession, session?.accessToken, ticketId]);

  useEffect(() => {
    load();
  }, []);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const ticket = data?.ticket;
  const comments = data?.comments || [];

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          tintColor={colors.primary}
        />
      }
    >
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.back}>
          <Text style={s.backText}>‹</Text>
        </Pressable>
        <View style={s.headerText}>
          <Text style={s.eyebrow}>READ-ONLY ZENDESK TICKET</Text>
          <Text style={s.headerTitle}>#{ticketId}</Text>
        </View>
      </View>

      {loading ? (
        <View style={s.loading}>
          <ActivityIndicator color={colors.primary} />
          <Text style={s.loadingText}>Loading ticket…</Text>
        </View>
      ) : null}

      {error ? (
        <AppCard>
          <Text style={s.errorTitle}>Unable to open ticket</Text>
          <Text style={s.error}>{error}</Text>
        </AppCard>
      ) : null}

      {ticket ? (
        <>
          <AppCard style={s.heroCard}>
            <View style={s.heroTop}>
              <Text style={s.status}>{statusLabel(ticket.status)}</Text>
              <Text style={s.priority}>
                {(ticket.priority || 'normal').toUpperCase()}
              </Text>
            </View>
            <Text style={s.subject}>{ticket.subject || 'No subject'}</Text>
            {ticket.description ? (
              <Text style={s.description} numberOfLines={5}>
                {ticket.description}
              </Text>
            ) : null}
          </AppCard>

          <Text style={s.sectionTitle}>Ticket details</Text>

          <AppCard>
            <DetailRow label="Status" value={statusLabel(ticket.status)} />
            <DetailRow label="Priority" value={ticket.priority || 'normal'} />
            <DetailRow label="Type" value={ticket.type} />
            <DetailRow label="Requester ID" value={ticket.requester_id} />
            <DetailRow label="Assignee ID" value={ticket.assignee_id} />
            <DetailRow label="Group ID" value={ticket.group_id} />
            <DetailRow label="Form ID" value={ticket.ticket_form_id} />
            <DetailRow label="Created" value={readableDate(ticket.created_at)} />
            <DetailRow label="Updated" value={readableDate(ticket.updated_at)} />
          </AppCard>

          {ticket.tags?.length ? (
            <>
              <Text style={s.sectionTitle}>Tags</Text>
              <View style={s.tags}>
                {ticket.tags.slice(0, 24).map((tag) => (
                  <View key={tag} style={s.tag}>
                    <Text style={s.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          <View style={s.conversationTitleRow}>
            <Text style={s.sectionTitle}>Conversation</Text>
            <Text style={s.commentCount}>{comments.length}</Text>
          </View>

          {comments.map((comment) => (
            <AppCard key={comment.id} style={s.comment}>
              <View style={s.commentHeader}>
                <Text style={s.author}>
                  Author #{comment.author_id ?? '—'}
                </Text>
                <Text
                  style={[
                    s.visibility,
                    comment.public === false && s.internalVisibility,
                  ]}
                >
                  {comment.public === false ? 'INTERNAL NOTE' : 'PUBLIC'}
                </Text>
              </View>

              <Text style={s.commentDate}>
                {readableDate(comment.created_at)}
              </Text>

              <Text selectable style={s.commentBody}>
                {comment.plain_body || comment.body || 'No text'}
              </Text>
            </AppCard>
          ))}

          {!comments.length ? (
            <View style={s.empty}>
              <Text style={s.emptyTitle}>No comments returned</Text>
            </View>
          ) : null}

          <View style={s.readOnlyBox}>
            <Text style={s.readOnlyTitle}>View only</Text>
            <Text style={s.readOnlyText}>
              Replies, internal notes, assignments and status changes remain in Zendesk.
            </Text>
          </View>
        </>
      ) : null}
    </ScrollView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  back: {
    height: 44,
    width: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  backText: {
    color: colors.text,
    fontSize: 34,
    lineHeight: 36,
    marginTop: -3,
  },
  headerText: {
    marginLeft: 12,
  },
  eyebrow: {
    fontSize: 10,
    color: colors.muted,
    letterSpacing: 1,
    fontWeight: '800',
  },
  headerTitle: {
    marginTop: 2,
    fontSize: 26,
    color: colors.text,
    fontWeight: '900',
  },
  loading: {
    paddingVertical: 70,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: colors.muted,
  },
  errorTitle: {
    color: colors.danger,
    fontWeight: '900',
    marginBottom: 6,
  },
  error: {
    color: colors.text,
  },
  heroCard: {
    marginBottom: 8,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  status: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  priority: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.cyan,
  },
  subject: {
    marginTop: 14,
    fontSize: 21,
    lineHeight: 28,
    color: colors.text,
    fontWeight: '900',
  },
  description: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.text,
    marginTop: 20,
    marginBottom: 9,
  },
  detailRow: {
    minHeight: 42,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
  },
  detailLabel: {
    color: colors.muted,
    fontSize: 12,
    flex: 1,
  },
  detailValue: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
    flex: 1.3,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  tag: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  tagText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  conversationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commentCount: {
    marginTop: 12,
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    fontWeight: '900',
    fontSize: 11,
  },
  comment: {
    marginBottom: 10,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  author: {
    color: colors.text,
    fontWeight: '900',
    fontSize: 12,
  },
  visibility: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '900',
  },
  internalVisibility: {
    color: colors.warning,
  },
  commentDate: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 5,
  },
  commentBody: {
    color: colors.text,
    lineHeight: 21,
    fontSize: 14,
    marginTop: 12,
  },
  empty: {
    padding: 30,
    alignItems: 'center',
  },
  emptyTitle: {
    color: colors.muted,
  },
  readOnlyBox: {
    marginTop: 14,
    backgroundColor: colors.primarySoft,
    borderRadius: 16,
    padding: 16,
  },
  readOnlyTitle: {
    color: colors.primary,
    fontWeight: '900',
  },
  readOnlyText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
});
