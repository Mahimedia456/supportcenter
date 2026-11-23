package com.mahimediasolutions.supportcenter.nativeapp.data

import org.json.JSONObject
import java.time.Instant
import java.time.LocalDate
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

/** Port of current SupportCenter's ticket field/dimension and RMA classification rules. */
object SupportAnalytics {
    private val labels = mapOf(
        "device" to listOf("device model", "device name", "which device", "your device", "atomos device", "atomos product", "product model", "product 1", "product name", "which product", "your product", "device", "product", "monitor", "recorder", "model", "hardware"),
        "rma" to listOf("rma type", "rma category", "return merchandise", "return authorization", "return type", "rma"),
        "category" to listOf("ticket category", "issue category", "case category", "support category", "category"),
        "fault" to listOf("fault category", "fault type", "failure category", "failure type", "fault", "failure"),
        "support" to listOf("support type", "type of support", "support request", "request type", "case type")
    )

    private fun normalized(raw: String) = raw.trim().lowercase(Locale.ROOT)
        .replace(Regex("[_\\-/:()?]+"), " ").replace(Regex("\\s+"), " ")

    private fun fieldScore(field: ReferenceField, dimension: String): Int {
        if (!field.active) return 0
        val title = normalized(field.title)
        if (dimension == "fault" && !title.contains("fault") && !title.contains("failure")) return 0
        if (dimension == "category" && (title.contains("fault") || title.contains("rma"))) return 0
        if (dimension == "device" && title.contains("category")) return 0
        return (labels[dimension] ?: emptyList()).mapIndexed { index, candidate ->
            val weight = (labels[dimension]?.size ?: 0) - index
            when {
                title == candidate -> 1000 + weight
                title.startsWith(candidate) -> 700 + weight
                title.contains(candidate) -> 400 + weight
                else -> 0
            }
        }.maxOrNull() ?: 0
    }

    fun dimensionValue(ticket: Ticket, data: SnapshotData, dimension: String): String {
        val candidates = data.fields.map { it to fieldScore(it, dimension) }
            .filter { it.second > 0 }.sortedByDescending { it.second }
        for ((field, _) in candidates) {
            val values = ticket.customFields.firstOrNull { it.fieldId == field.id }?.values.orEmpty()
            val result = values.map(field::label).filter(String::isNotBlank).joinToString(", ")
            if (result.isNotBlank()) return result
        }
        return ""
    }

    fun fieldRows(ticket: Ticket, data: SnapshotData): List<Pair<String, String>> {
        val byId = data.fields.associateBy { it.id }
        return ticket.customFields.mapNotNull { custom ->
            val field = byId[custom.fieldId] ?: return@mapNotNull null
            val value = custom.values.map(field::label).filter(String::isNotBlank).joinToString(", ")
            if (value.isBlank()) null else field.title to value
        }
    }

    fun lookup(records: List<LookupItem>, id: Long?, fallback: String = "Unassigned"): String =
        id?.let { n -> records.firstOrNull { it.id == n }?.name }?.ifBlank { fallback } ?: fallback

    fun createdDate(ticket: Ticket): LocalDate? = dateOf(ticket.createdAt.ifBlank { ticket.updatedAt })

    fun dateOf(value: String): LocalDate? = try {
        Instant.parse(value).atZone(ZoneId.systemDefault()).toLocalDate()
    } catch (_: Exception) {
        try { OffsetDateTime.parse(value).atZoneSameInstant(ZoneId.systemDefault()).toLocalDate() }
        catch (_: Exception) { null }
    }

    fun instantOf(value: String): Instant? = try { Instant.parse(value) }
    catch (_: Exception) { try { OffsetDateTime.parse(value).toInstant() } catch (_: Exception) { null } }

    fun shortDate(value: String): String = instantOf(value)?.atZone(ZoneId.systemDefault())
        ?.format(DateTimeFormatter.ofPattern("MMM d, yyyy h:mm a", Locale.ENGLISH)) ?: "—"

    fun inPeriod(ticket: Ticket, days: Int): Boolean {
        val day = createdDate(ticket) ?: return false
        val now = LocalDate.now()
        return !day.isAfter(now) && !day.isBefore(now.minusDays((days - 1).coerceAtLeast(0).toLong()))
    }

    fun inPeriod(value: String, days: Int): Boolean {
        val day = dateOf(value) ?: return false
        val now = LocalDate.now()
        return !day.isAfter(now) && !day.isBefore(now.minusDays((days - 1).coerceAtLeast(0).toLong()))
    }

    fun open(ticket: Ticket): Boolean = normalized(ticket.status) in setOf("new", "open", "pending", "hold")
    fun urgent(ticket: Ticket): Boolean = normalized(ticket.priority) in setOf("high", "urgent")
    fun closed(ticket: Ticket): Boolean = normalized(ticket.status) in setOf("solved", "closed")

    fun eventDate(event: JSONObject): String =
        event.optString("time").ifBlank { event.optString("created_at") }
            .ifBlank { event.optString("updated_at") }

    fun breachedTicketCount(data: SnapshotData, days: Int): Int = data.slaEvents
        .filter { inPeriod(eventDate(it), days) }
        .mapNotNull { it.optLong("ticket_id").takeIf { n -> n > 0L } }
        .distinct().size

    fun breachEventCount(data: SnapshotData, days: Int): Int = data.slaEvents
        .count { inPeriod(eventDate(it), days) }

    private fun isAffirmative(text: String): Boolean {
        val norm = normalized(text)
        return norm.isNotBlank() && norm !in setOf(
            "no", "none", "false", "not applicable", "n a", "na", "no rma", "no fault",
            "not required", "no return", "not requested"
        )
    }

    private fun contains(text: String, terms: List<String>): Boolean = terms.any(text::contains)

    data class RmaInfo(
        val isRma: Boolean,
        val device: String,
        val category: String,
        val disposition: String,
        val shipment: String,
        val detectedBy: String
    )

    fun rmaInfo(ticket: Ticket, data: SnapshotData): RmaInfo {
        val rows = fieldRows(ticket, data)
        val rmaValue = dimensionValue(ticket, data, "rma")
        val form = lookup(data.forms, ticket.formId, "")
        val formNorm = normalized(form)
        val relevant = rows.filter {
            contains(normalized(it.first), listOf(
                "rma", "return merchandise", "return authorization", "repair request",
                "repair type", "repair status", "replacement", "date returned", "return date",
                "date shipped", "shipped date"
            )) && isAffirmative(it.second)
        }
        val matchingForm = contains(formNorm, listOf(
            "request a repair", "request repair", "repair request", "rma", "return merchandise"
        ))
        val tagRma = ticket.tags.any { tag ->
            val norm = normalized(tag)
            contains(norm, listOf("rma", "repair request", "return merchandise"))
        }
        val isRma = isAffirmative(rmaValue) || relevant.isNotEmpty() || matchingForm || tagRma
        val category = rmaValue.takeIf(::isAffirmative) ?: relevant.firstOrNull { row ->
            contains(normalized(row.first), listOf("rma type", "rma category", "repair type"))
        }?.second ?: form.takeIf { matchingForm } ?: "Uncategorized RMA"
        val device = dimensionValue(ticket, data, "device").ifBlank { "Unknown device" }
        val combined = normalized(
            category + " " + rows.filter { contains(normalized(it.first), listOf(
                "rma", "repair", "replacement", "resolution", "outcome", "disposition", "action taken"
            )) }.joinToString(" ") { it.second } + " " + ticket.tags.joinToString(" ")
        )
        val disposition = when {
            contains(combined, listOf("replacement", "replaced", "swap", "exchanged", "exchange unit")) -> "Replaced"
            contains(combined, listOf("repair", "repaired", "service repair")) -> "Repair"
            else -> "Not classified"
        }
        val shipmentRows = rows.filter { contains(normalized(it.first), listOf(
            "ship", "dispatch", "return status", "rma status", "repair status", "return stage", "date returned", "received date"
        )) }
        val returnedDate = rows.firstOrNull { contains(normalized(it.first), listOf(
            "date returned", "returned date", "return date", "date received", "received date"
        )) }?.second.orEmpty()
        val shippedDate = rows.firstOrNull { contains(normalized(it.first), listOf(
            "date shipped", "shipped date", "shipment date", "dispatch date"
        )) }?.second.orEmpty()
        val shipmentText = normalized(shipmentRows.joinToString(" ") { it.second })
        val shipment = when {
            returnedDate.isNotBlank() || contains(shipmentText, listOf("returned", "received back", "return complete", "delivered back")) -> "Returned"
            shippedDate.isNotBlank() || contains(shipmentText, listOf("shipped", "dispatched", "in transit", "shipment complete")) -> "Shipped"
            contains(shipmentText, listOf("pending ship", "awaiting shipment", "ready to ship", "not shipped", "pending dispatch")) -> "Pending ship"
            else -> "Not classified"
        }
        val reason = buildList {
            if (isAffirmative(rmaValue)) add("RMA field")
            if (relevant.isNotEmpty()) add("RMA custom fields")
            if (matchingForm) add("RMA form")
            if (tagRma) add("RMA tag")
        }.joinToString(", ")
        return RmaInfo(isRma, device, category, disposition, shipment, reason)
    }

    data class DeviceRow(
        val device: String,
        val total: Int,
        val active: Int,
        val urgent: Int,
        val rma: Int,
        val unassigned: Int,
        val recent7: Int
    )

    fun deviceRows(tickets: List<Ticket>, data: SnapshotData): List<DeviceRow> {
        data class Counts(var total: Int = 0, var active: Int = 0, var urgent: Int = 0,
                          var rma: Int = 0, var unassigned: Int = 0, var recent7: Int = 0)
        val counts = linkedMapOf<String, Pair<String, Counts>>()
        tickets.forEach { ticket ->
            val rma = rmaInfo(ticket, data).isRma
            val devices = dimensionValue(ticket, data, "device")
                .split(',').map(String::trim).filter(String::isNotBlank).distinct()
            devices.forEach { device ->
                val key = device.lowercase(Locale.ROOT)
                val entry = counts.getOrPut(key) { device to Counts() }
                entry.second.apply {
                    total++
                    if (open(ticket)) active++
                    if (urgent(ticket)) urgent++
                    if (rma) this.rma++
                    if (ticket.assigneeId.isNullOrBlank()) unassigned++
                    if (inPeriod(ticket, 7)) recent7++
                }
            }
        }
        return counts.values.map { (name, n) -> DeviceRow(
            name, n.total, n.active, n.urgent, n.rma, n.unassigned, n.recent7
        ) }.sortedWith(compareByDescending<DeviceRow> { it.total }.thenBy { it.device })
    }
}
