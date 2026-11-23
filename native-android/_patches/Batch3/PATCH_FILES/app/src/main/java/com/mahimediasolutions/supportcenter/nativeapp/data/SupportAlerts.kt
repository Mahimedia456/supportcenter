package com.mahimediasolutions.supportcenter.nativeapp.data

import java.time.Duration
import java.time.Instant

data class AttentionItem(val title: String, val explanation: String, val ticketId: Long? = null)

/** Read-only attention list derived from verified snapshot fields, not remote push delivery. */
object SupportAlerts {
    fun items(data: SnapshotData?, days: Int): List<AttentionItem> {
        if (data == null) return emptyList()
        val active = data.tickets.filter { SupportAnalytics.inPeriod(it, days) && SupportAnalytics.open(it) }
        val result = mutableListOf<AttentionItem>()
        val urgent = active.filter(SupportAnalytics::urgent)
        val urgentUnassigned = urgent.filter { it.assigneeId.isNullOrBlank() }
        if (urgentUnassigned.isNotEmpty()) result.add(AttentionItem(
            "${urgentUnassigned.size} unassigned high-priority tickets",
            "Created in the selected period; urgent/high and currently active",
            urgentUnassigned.firstOrNull()?.id
        ))
        if (urgent.isNotEmpty()) result.add(AttentionItem(
            "${urgent.size} active high-priority tickets",
            "Derived from current snapshot status and priority",
            urgent.firstOrNull()?.id
        ))
        if (data.slaLoaded) {
            val count = SupportAnalytics.breachedTicketCount(data, days)
            if (count > 0) result.add(AttentionItem(
                "$count tickets with recorded SLA breaches",
                "Only server-labelled breach events in the selected period"
            ))
        }
        val last = data.meta.syncedAt?.let(SupportAnalytics::instantOf)
        if (last != null && Duration.between(last, Instant.now()).toHours() >= 24L) {
            result.add(AttentionItem(
                "Snapshot is over 24 hours old", "Last backend sync: ${data.meta.syncedAt}"
            ))
        }
        if (data.meta.syncStatus != "ok") {
            result.add(AttentionItem(
                "Server sync status: ${data.meta.syncStatus}",
                data.meta.lastError ?: "Check the scheduled backend synchronization"
            ))
        }
        return result
    }
}
