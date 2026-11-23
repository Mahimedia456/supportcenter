package com.mahimediasolutions.supportcenter.nativeapp.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ArrowBack
import androidx.compose.material.icons.outlined.ChevronRight
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mahimediasolutions.supportcenter.nativeapp.data.SnapshotData
import com.mahimediasolutions.supportcenter.nativeapp.data.SupportAnalytics
import com.mahimediasolutions.supportcenter.nativeapp.data.Ticket
import java.util.Locale

private val Primary = Color(0xFF0F5132)
private val Foreground = Color(0xFF0F172A)
private val Secondary = Color(0xFF64748B)
private val SoftGreen = Color(0xFFEDF9F3)
private val Border = Color(0xFFDDE7E2)
private val Warning = Color(0xFFB45309)

@Composable
private fun SectionHeading(title: String, detail: String) {
    Column(Modifier.fillMaxWidth().padding(vertical = 10.dp)) {
        Text(title, color = Foreground, fontSize = 25.sp, fontWeight = FontWeight.ExtraBold)
        Text(detail, color = Secondary, fontSize = 12.sp)
    }
}

@Composable
private fun Panel(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    Card(
        modifier = modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        content = { Column(Modifier.padding(16.dp), content = content) }
    )
}

@Composable
private fun Stat(title: String, value: String, note: String, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier, shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = SoftGreen)
    ) {
        Column(Modifier.padding(15.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
            Text(title, color = Secondary, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
            Text(value, color = Primary, fontSize = 29.sp, fontWeight = FontWeight.ExtraBold)
            Text(note, color = Secondary, fontSize = 10.sp, maxLines = 2)
        }
    }
}

@Composable
private fun EmptyMessage(message: String) {
    Panel { Text(message, color = Secondary, fontSize = 13.sp) }
}

@Composable
private fun PeriodControls(value: Int, onChange: (Int) -> Unit) {
    Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        listOf(1 to "Today", 7 to "7 Days", 30 to "30 Days", 90 to "90 Days").forEach { (days, label) ->
            FilterChip(selected = value == days, onClick = { onChange(days) }, label = { Text(label) })
        }
    }
}

@Composable
private fun StatusIndicator(state: MainUiState) {
    val meta = state.snapshot?.meta
    val label = when {
        state.cached -> "CACHED / OFFLINE"
        meta == null -> "SNAPSHOT NOT READY"
        meta.syncStatus == "ok" -> "SERVER SNAPSHOT"
        else -> "SERVER: ${meta.syncStatus.uppercase(Locale.ROOT)}"
    }
    Text(label, color = if (meta?.syncStatus == "ok" && !state.cached) Primary else Warning,
        fontSize = 11.sp, fontWeight = FontWeight.Bold)
    Text("Last sync: ${meta?.syncedAt ?: "Not yet imported"}", color = Secondary, fontSize = 11.sp)
}

@Composable
fun NativeOverviewScreen(state: MainUiState, onPeriod: (Int) -> Unit,
                         onOpenTicket: (Long) -> Unit, onRefresh: () -> Unit) {
    val data = state.snapshot
    val selected = remember(data, state.periodDays) {
        data?.tickets.orEmpty().filter { SupportAnalytics.inPeriod(it, state.periodDays) }
    }
    val active = selected.count(SupportAnalytics::open)
    val urgent = selected.count(SupportAnalytics::urgent)
    val unassigned = selected.count { it.assigneeId.isNullOrBlank() }
    val recent = remember(data, state.periodDays) { selected.sortedByDescending { it.updatedAt.ifBlank { it.createdAt } }.take(15) }

    LazyColumn(Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(10.dp),
        contentPadding = PaddingValues(bottom = 30.dp)) {
        item {
            SectionHeading("Support at a glance", "Overview · Verified Zendesk snapshot")
            StatusIndicator(state)
            Spacer(Modifier.height(8.dp))
            PeriodControls(state.periodDays, onPeriod)
        }
        if (data == null) {
            item { EmptyMessage("No server snapshot available. Check production database and refresh after sync.") }
        } else {
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Stat("Total tickets", selected.size.toString(), "Created in selected period", Modifier.weight(1f))
                    Stat("Active", active.toString(), "New, open, pending or hold", Modifier.weight(1f))
                }
            }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Stat("High priority", urgent.toString(), "High and urgent", Modifier.weight(1f))
                    Stat("Unassigned", unassigned.toString(), "No current assignee", Modifier.weight(1f))
                }
            }
            item {
                if (data.slaLoaded) {
                    val unique = SupportAnalytics.breachedTicketCount(data, state.periodDays)
                    val events = SupportAnalytics.breachEventCount(data, state.periodDays)
                    Panel {
                        Text("SLA breaches", color = Foreground, fontWeight = FontWeight.Bold)
                        Spacer(Modifier.height(5.dp))
                        Text("$unique tickets · $events breach events", color = Primary, fontSize = 19.sp,
                            fontWeight = FontWeight.ExtraBold)
                        Text("Only events labelled 'breach' by the backend; no other SLA calculation inferred.",
                            color = Secondary, fontSize = 11.sp)
                    }
                } else {
                    Panel {
                        Text("SLA metrics unavailable", color = Warning, fontWeight = FontWeight.Bold)
                        Text(data.slaWarning ?: "SLA event snapshot was not returned.", color = Secondary, fontSize = 12.sp)
                    }
                }
            }
            item {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Recently updated", color = Foreground, fontSize = 18.sp,
                        fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                    TextButton(onClick = onRefresh, enabled = !state.refreshing) { Text("Refresh") }
                }
            }
            if (recent.isEmpty()) item { EmptyMessage("No tickets were created in this period.") }
            items(recent, key = { it.id }) { ticket -> NativeTicketRow(ticket, data, onOpenTicket) }
        }
    }
}

@Composable
private fun NativeTicketRow(ticket: Ticket, data: SnapshotData, onClick: (Long) -> Unit) {
    Card(onClick = { onClick(ticket.id) }, modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(17.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                Text("#${ticket.id}  ·  ${ticket.status.ifBlank { "Unknown" }.uppercase(Locale.ROOT)}",
                    color = Primary, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                Text(ticket.subject, color = Foreground, fontSize = 14.sp, fontWeight = FontWeight.SemiBold,
                    maxLines = 2, overflow = TextOverflow.Ellipsis)
                val agent = SupportAnalytics.lookup(data.agents, ticket.assigneeId?.toLongOrNull())
                Text("$agent   ·   ${SupportAnalytics.shortDate(ticket.updatedAt.ifBlank { ticket.createdAt })}",
                    color = Secondary, fontSize = 11.sp, maxLines = 1)
            }
            Icon(Icons.Outlined.ChevronRight, "Open ticket", tint = Primary)
        }
    }
}

@Composable
fun NativeTicketsScreen(state: MainUiState, onPeriod: (Int) -> Unit, onOpenTicket: (Long) -> Unit) {
    val data = state.snapshot
    var query by rememberSaveable { mutableStateOf("") }
    var statusFilter by rememberSaveable { mutableStateOf("all") }
    val filtered = remember(data, state.periodDays, query, statusFilter) {
        val q = query.trim().lowercase(Locale.ROOT)
        data?.tickets.orEmpty()
            .filter { SupportAnalytics.inPeriod(it, state.periodDays) }
            .filter { statusFilter == "all" || it.status.equals(statusFilter, ignoreCase = true) }
            .filter {
                q.isBlank() || listOf(it.id.toString(), it.subject, it.status, it.priority, it.tags.joinToString(" "))
                    .joinToString(" ").lowercase(Locale.ROOT).contains(q)
            }
            .sortedByDescending { SupportAnalytics.instantOf(it.updatedAt.ifBlank { it.createdAt }) }
    }
    LazyColumn(Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(9.dp),
        contentPadding = PaddingValues(bottom = 30.dp)) {
        item {
            SectionHeading("Tickets", "Search, status and period filters")
            PeriodControls(state.periodDays, onPeriod)
            Spacer(Modifier.height(6.dp))
            OutlinedTextField(
                value = query, onValueChange = { query = it }, modifier = Modifier.fillMaxWidth(),
                leadingIcon = { Icon(Icons.Outlined.Search, null) },
                label = { Text("Search ID, subject, tags") }, singleLine = true
            )
            Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                listOf("all", "new", "open", "pending", "hold", "solved", "closed").forEach { status ->
                    FilterChip(selected = status == statusFilter, onClick = { statusFilter = status },
                        label = { Text(status.replaceFirstChar(Char::uppercase)) })
                }
            }
            Text("${filtered.size} matching tickets", color = Secondary, fontSize = 12.sp)
        }
        if (data == null) item { EmptyMessage("No snapshot loaded for this workspace.") }
        else if (filtered.isEmpty()) item { EmptyMessage("No tickets match these filters.") }
        else items(filtered, key = { it.id }) { NativeTicketRow(it, data, onOpenTicket) }
    }
}

@Composable
private fun DetailLine(label: String, value: String) {
    Row(Modifier.fillMaxWidth().padding(vertical = 7.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        Text(label, color = Secondary, fontSize = 12.sp, modifier = Modifier.width(114.dp))
        Text(value.ifBlank { "—" }, color = Foreground, fontSize = 12.sp, modifier = Modifier.weight(1f))
    }
}

@Composable
fun NativeTicketDetailScreen(state: MainUiState, onBack: () -> Unit, onRefreshConversation: () -> Unit) {
    val data = state.snapshot
    val ticket = data?.tickets?.firstOrNull { it.id == state.selectedTicketId }
    val conversation = state.conversation
    LazyColumn(Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(10.dp),
        contentPadding = PaddingValues(bottom = 30.dp)) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onBack) { Icon(Icons.Outlined.ArrowBack, "Back to tickets") }
                Text("Ticket #${ticket?.id ?: "—"}", fontSize = 24.sp,
                    fontWeight = FontWeight.ExtraBold, color = Foreground)
            }
        }
        if (ticket == null || data == null) {
            item { EmptyMessage("Ticket not found in current saved snapshot.") }
        } else {
            item {
                Panel {
                    Text("${ticket.status.uppercase(Locale.ROOT)}  ·  ${ticket.priority.uppercase(Locale.ROOT)}",
                        fontSize = 11.sp, color = Primary, fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(8.dp))
                    Text(ticket.subject, fontSize = 20.sp, color = Foreground, fontWeight = FontWeight.Bold)
                    if (ticket.description.isNotBlank()) {
                        Spacer(Modifier.height(10.dp))
                        Text(ticket.description, color = Secondary, fontSize = 13.sp, maxLines = 10)
                    }
                }
            }
            item {
                Panel {
                    Text("Ticket details", color = Foreground, fontWeight = FontWeight.Bold, fontSize = 17.sp)
                    DetailLine("Status", ticket.status)
                    DetailLine("Priority", ticket.priority.ifBlank { "normal" })
                    DetailLine("Type", ticket.type)
                    DetailLine("Requester", ticket.requesterId?.toString().orEmpty())
                    DetailLine("Assignee", SupportAnalytics.lookup(data.agents, ticket.assigneeId?.toLongOrNull()))
                    DetailLine("Group", SupportAnalytics.lookup(data.groups, ticket.groupId, "—"))
                    DetailLine("Form", SupportAnalytics.lookup(data.forms, ticket.formId, "—"))
                    DetailLine("Created", SupportAnalytics.shortDate(ticket.createdAt))
                    DetailLine("Updated", SupportAnalytics.shortDate(ticket.updatedAt))
                    DetailLine("Tags", ticket.tags.joinToString(", "))
                }
            }
            val customRows = SupportAnalytics.fieldRows(ticket, data)
            if (customRows.isNotEmpty()) item {
                Panel {
                    Text("Custom fields", color = Foreground, fontWeight = FontWeight.Bold, fontSize = 17.sp)
                    customRows.forEach { (label, value) -> DetailLine(label, value) }
                }
            }
            item {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Conversation", color = Foreground, fontSize = 20.sp,
                        fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                    IconButton(onClick = onRefreshConversation, enabled = !state.conversationLoading) {
                        Icon(Icons.Outlined.Refresh, "Refresh conversation")
                    }
                }
                Text("Saved server conversation; read-only view", color = Secondary, fontSize = 11.sp)
                if (state.conversationLoading) LinearProgressIndicator(Modifier.fillMaxWidth())
                if (!state.conversationError.isNullOrBlank()) {
                    Text(state.conversationError, color = Warning, fontSize = 12.sp)
                }
                if (conversation != null) {
                    Text("${conversation.commentCount} comments · Updated ${SupportAnalytics.shortDate(conversation.syncedAt.orEmpty())}",
                        color = Secondary, fontSize = 11.sp)
                }
            }
            if (conversation != null) {
                if (conversation.comments.isEmpty()) item { EmptyMessage("No conversation comments available.") }
                items(conversation.comments) { comment ->
                    Panel {
                        Text("Author #${comment.authorId ?: "—"} · ${SupportAnalytics.shortDate(comment.createdAt)}",
                            color = Primary, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        Spacer(Modifier.height(5.dp))
                        Text(comment.body.ifBlank { "(No text content)" }, color = Foreground, fontSize = 13.sp)
                        Spacer(Modifier.height(5.dp))
                        Text(if (comment.isPublic) "Public reply" else "Internal note", color = Secondary, fontSize = 11.sp)
                    }
                }
            }
        }
    }
}

@Composable
fun NativeRmaScreen(state: MainUiState, onPeriod: (Int) -> Unit, onOpenTicket: (Long) -> Unit) {
    val data = state.snapshot
    val rows = remember(data, state.periodDays) {
        data?.tickets.orEmpty().filter { SupportAnalytics.inPeriod(it, state.periodDays) }
            .mapNotNull { ticket ->
                data?.let { snapshot -> SupportAnalytics.rmaInfo(ticket, snapshot).let { info ->
                    if (info.isRma) ticket to info else null
                } }
            }.sortedByDescending { it.first.updatedAt.ifBlank { it.first.createdAt } }
    }
    LazyColumn(Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(10.dp),
        contentPadding = PaddingValues(bottom = 30.dp)) {
        item {
            SectionHeading("RMA", "Classified from Zendesk form, custom fields and tags")
            PeriodControls(state.periodDays, onPeriod)
            Spacer(Modifier.height(8.dp))
        }
        if (data == null) item { EmptyMessage("Snapshot data unavailable.") }
        else {
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Stat("RMA cases", rows.size.toString(), "Classified in selected period", Modifier.weight(1f))
                    Stat("Pending ship", rows.count { it.second.shipment == "Pending ship" }.toString(),
                        "Based on explicit shipping fields", Modifier.weight(1f))
                }
            }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Stat("Repairs", rows.count { it.second.disposition == "Repair" }.toString(),
                        "Disposition classified", Modifier.weight(1f))
                    Stat("Replacements", rows.count { it.second.disposition == "Replaced" }.toString(),
                        "Disposition classified", Modifier.weight(1f))
                }
            }
            item { Text("RMA tickets · ${rows.size}", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Foreground) }
            if (rows.isEmpty()) item { EmptyMessage("No verified RMA cases match this period. Unclassified cases are not inferred.") }
            else items(rows, key = { it.first.id }) { (ticket, info) ->
                Card(onClick = { onOpenTicket(ticket.id) }, modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    shape = RoundedCornerShape(17.dp)) {
                    Column(Modifier.padding(15.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text("#${ticket.id} · ${info.device}", color = Primary, fontWeight = FontWeight.Bold)
                        Text(ticket.subject, color = Foreground, maxLines = 2)
                        Text("${info.shipment}  ·  ${info.disposition}", color = Secondary, fontSize = 12.sp)
                        Text(info.category, color = Secondary, fontSize = 11.sp)
                    }
                }
            }
        }
    }
}

@Composable
fun NativeDevicesScreen(state: MainUiState, onPeriod: (Int) -> Unit, onOpenDevice: (String) -> Unit) {
    val data = state.snapshot
    val rows = remember(data, state.periodDays) {
        if (data == null) emptyList() else SupportAnalytics.deviceRows(
            data.tickets.filter { SupportAnalytics.inPeriod(it, state.periodDays) }, data
        )
    }
    LazyColumn(Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(10.dp),
        contentPadding = PaddingValues(bottom = 30.dp)) {
        item {
            SectionHeading("Devices", "Model-level support health")
            PeriodControls(state.periodDays, onPeriod)
            Text("${rows.size} known device models", color = Secondary, fontSize = 12.sp)
        }
        if (data == null) item { EmptyMessage("Snapshot data unavailable.") }
        else if (rows.isEmpty()) item {
            EmptyMessage("No device models found in current snapshot custom fields. Verify device field metadata sync.")
        } else items(rows, key = { it.device }) { row ->
            Card(onClick = { onOpenDevice(row.device) }, modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(17.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
                Row(Modifier.padding(15.dp), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(row.device, color = Foreground, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                        Text("${row.total} tickets · ${row.active} active · ${row.urgent} high priority",
                            color = Secondary, fontSize = 11.sp)
                        Text("RMA ${row.rma} · Unassigned ${row.unassigned}", color = Primary, fontSize = 11.sp)
                    }
                    Icon(Icons.Outlined.ChevronRight, "Open device", tint = Primary)
                }
            }
        }
    }
}

@Composable
fun NativeDeviceDetailScreen(state: MainUiState, onBack: () -> Unit, onOpenTicket: (Long) -> Unit) {
    val data = state.snapshot
    val device = state.selectedDevice.orEmpty()
    val tickets = remember(data, device, state.periodDays) {
        data?.tickets.orEmpty().filter { SupportAnalytics.inPeriod(it, state.periodDays) }.filter { ticket ->
            data?.let {
                SupportAnalytics.dimensionValue(ticket, it, "device")
                    .split(',').map(String::trim).any { value -> value.equals(device, ignoreCase = true) }
            } == true
        }.sortedByDescending { it.updatedAt.ifBlank { it.createdAt } }
    }
    LazyColumn(Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(10.dp),
        contentPadding = PaddingValues(bottom = 30.dp)) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onBack) { Icon(Icons.Outlined.ArrowBack, "Back to devices") }
                Text(device, color = Foreground, fontSize = 22.sp, fontWeight = FontWeight.Bold, maxLines = 2)
            }
            Text("${tickets.size} associated tickets in selected period", color = Secondary, fontSize = 12.sp)
        }
        if (data != null) {
            if (tickets.isEmpty()) item { EmptyMessage("No linked tickets for this model.") }
            else items(tickets, key = { it.id }) { NativeTicketRow(it, data, onOpenTicket) }
        }
    }
}
