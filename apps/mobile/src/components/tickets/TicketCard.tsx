import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppCard } from '@/components/AppCard';
import { colors } from '@/constants/theme';
import type { ZendeskTicket } from '@/lib/api';
import { relativeTime, statusLabel } from '@/types/zendesk-ui';

function priorityTone(priority?: string | null) {
  const value = String(priority || '').toLowerCase();

  if (value === 'urgent') {
    return { bg: '#FDECEC', fg: colors.danger };
  }

  if (value === 'high') {
    return { bg: '#FFF5DF', fg: colors.warning };
  }

  return { bg: colors.cyanSoft, fg: colors.cyan };
}

export function TicketCard({
  ticket,
  onPress,
}: {
  ticket: ZendeskTicket;
  onPress: () => void;
}) {
  const tone = priorityTone(ticket.priority);

  return (
    <Pressable onPress={onPress}>
      <AppCard style={s.card}>
        <View style={s.topRow}>
          <View style={s.ticketIdWrap}>
            <Text style={s.ticketId}>#{ticket.id}</Text>
            <Text style={s.updated}>
              {relativeTime(ticket.updated_at)}
            </Text>
          </View>

          <View style={s.badges}>
            <View style={[s.badge, { backgroundColor: tone.bg }]}>
              <Text style={[s.badgeText, { color: tone.fg }]}>
                {(ticket.priority || 'normal').toUpperCase()}
              </Text>
            </View>

            <View style={[s.badge, s.statusBadge]}>
              <Text style={[s.badgeText, s.statusText]}>
                {statusLabel(ticket.status)}
              </Text>
            </View>
          </View>
        </View>

        <Text style={s.subject} numberOfLines={2}>
          {ticket.subject || 'No subject'}
        </Text>

        <View style={s.metaGrid}>
          <View style={s.metaItem}>
            <Text style={s.metaLabel}>Assignee</Text>
            <Text style={s.metaValue}>
              {ticket.assignee_id ? `#${ticket.assignee_id}` : 'Unassigned'}
            </Text>
          </View>

          <View style={s.metaItem}>
            <Text style={s.metaLabel}>Form</Text>
            <Text style={s.metaValue}>
              {ticket.ticket_form_id ? `#${ticket.ticket_form_id}` : '—'}
            </Text>
          </View>

          <View style={s.metaItem}>
            <Text style={s.metaLabel}>Type</Text>
            <Text style={s.metaValue}>
              {ticket.type || '—'}
            </Text>
          </View>
        </View>

        {ticket.tags?.length ? (
          <View style={s.tags}>
            {ticket.tags.slice(0, 3).map((tag) => (
              <View style={s.tag} key={tag}>
                <Text style={s.tagText} numberOfLines={1}>
                  {tag}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={s.bottomRow}>
          <Text style={s.readOnly}>READ ONLY</Text>
          <Text style={s.open}>View details ›</Text>
        </View>
      </AppCard>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    marginBottom: 10,
    padding: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  ticketIdWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ticketId: {
    color: colors.text,
    fontWeight: '900',
    fontSize: 13,
  },
  updated: {
    color: colors.muted,
    fontSize: 10,
  },
  badges: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  statusBadge: {
    backgroundColor: colors.primarySoft,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '900',
  },
  statusText: {
    color: colors.primary,
  },
  subject: {
    marginTop: 12,
    color: colors.text,
    fontWeight: '900',
    fontSize: 17,
    lineHeight: 23,
  },
  metaGrid: {
    marginTop: 13,
    flexDirection: 'row',
    gap: 8,
  },
  metaItem: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  metaLabel: {
    color: colors.muted,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '800',
  },
  metaValue: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4,
  },
  tags: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
  },
  tag: {
    maxWidth: 100,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  tagText: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: '700',
  },
  bottomRow: {
    marginTop: 13,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  readOnly: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  open: {
    color: colors.cyan,
    fontSize: 11,
    fontWeight: '900',
  },
});
