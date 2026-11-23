package com.mahimediasolutions.supportcenter.nativeapp.ui

import android.Manifest
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ChevronRight
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mahimediasolutions.supportcenter.nativeapp.data.SnapshotData
import com.mahimediasolutions.supportcenter.nativeapp.data.SupportAlerts
import com.mahimediasolutions.supportcenter.nativeapp.data.SupportAnalytics
import org.json.JSONObject
import java.util.Locale

private val Main = Color(0xFF0A7B61)
private val Ink = Color(0xFF102321)
private val Muted = Color(0xFF516A66)
private val Tile = Color(0xFFEEF8F3)
private val Stroke = Color(0xFFDCE9E4)

@Composable private fun Heading(title: String, detail: String) {
    Column(Modifier.fillMaxWidth().padding(vertical = 12.dp)) {
        Text(title, color = Ink, fontSize = 25.sp, fontWeight = FontWeight.ExtraBold)
        Text(detail, color = Muted, fontSize = 12.sp)
    }
}

@Composable private fun Panel(content: @Composable ColumnScope.() -> Unit) {
    Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White)) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp), content = content)
    }
}

@Composable private fun Metric(name: String, value: String, subtitle: String) {
    Column(Modifier.fillMaxWidth().background(Tile, RoundedCornerShape(16.dp)).padding(15.dp)) {
        Text(name, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Muted)
        Text(value, fontSize = 30.sp, fontWeight = FontWeight.ExtraBold, color = Main)
        Text(subtitle, fontSize = 11.sp, color = Muted)
    }
}

@Composable private fun Period(days: Int, onPeriod: (Int) -> Unit) {
    Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        listOf(1 to "Today", 7 to "7 Days", 30 to "30 Days", 90 to "90 Days").forEach { (period, name) ->
            FilterChip(selected = days == period, onClick = { onPeriod(period) }, label = { Text(name) })
        }
    }
}

private fun ratingScore(rating: JSONObject): String = rating.optString("score")
    .trim().lowercase(Locale.ROOT)
private fun ratingDate(rating: JSONObject): String = rating.optString("created_at")
    .ifBlank { rating.optString("updated_at") }
private fun numericId(obj: JSONObject, key: String): Long? = obj.optLong(key).takeIf { it > 0L }
private fun dateText(value: String) = SupportAnalytics.shortDate(value)

@Composable
fun NativeSatisfactionScreen(state: MainUiState, onPeriod: (Int) -> Unit, onOpenTicket: (Long) -> Unit) {
    val data = state.snapshot
    val ratings = remember(data, state.periodDays) {
        data?.satisfaction.orEmpty().filter { SupportAnalytics.inPeriod(ratingDate(it), state.periodDays) }
            .sortedByDescending { SupportAnalytics.instantOf(ratingDate(it)) }
    }
    val good = ratings.count { ratingScore(it) == "good" }
    val bad = ratings.count { ratingScore(it) == "bad" }
    val scored = good + bad
    LazyColumn(Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(10.dp),
        contentPadding = PaddingValues(bottom = 28.dp)) {
        item { Heading("Satisfaction", "Zendesk satisfaction ratings from workspace snapshot"); Period(state.periodDays, onPeriod) }
        if (data == null) item { Panel { Text("No snapshot loaded", color = Muted) } }
        else if (!data.satisfactionLoaded) item { Panel {
            Text("Ratings unavailable", fontWeight = FontWeight.Bold, color = Ink)
            Text(data.satisfactionWarning ?: "Server did not return the satisfaction part", color = Muted)
        } }
        else {
            item {
                Panel {
                    Metric("Rated responses", "$scored", "Good + bad ratings created in period")
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text("Good $good", color = Main, fontWeight = FontWeight.Bold)
                        Text("Bad $bad", color = Color(0xFFB45309), fontWeight = FontWeight.Bold)
                    }
                    Text(if (scored > 0) "Positive share: ${good * 100 / scored}%" else "No scored ratings in period",
                        color = Muted, fontSize = 12.sp)
                    val extras = ratings.size - scored
                    if (extras > 0) Text("$extras unrated/other records excluded from scored total", color = Muted, fontSize = 11.sp)
                }
            }
            if (ratings.isEmpty()) item { Panel { Text("No satisfaction records in this period", color = Muted) } }
            items(ratings) { rating ->
                val id = numericId(rating, "ticket_id")
                Panel {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(ratingScore(rating).ifBlank { "unrated" }.uppercase(Locale.ROOT),
                            fontWeight = FontWeight.Bold, color = Main, modifier = Modifier.weight(1f))
                        Text("Ticket #${id ?: "—"}", color = Muted, fontSize = 11.sp)
                    }
                    Text(rating.optString("comment").ifBlank { "No rating comment" },
                        color = Ink, fontSize = 13.sp, maxLines = 5, overflow = TextOverflow.Ellipsis)
                    Text(dateText(ratingDate(rating)), color = Muted, fontSize = 11.sp)
                    if (id != null && data.tickets.any { it.id == id }) {
                        TextButton(onClick = { onOpenTicket(id) }) { Text("Open ticket") }
                    }
                }
            }
        }
    }
}

private data class GroupRow(val name: String, val count: Int)

@Composable
fun NativeInsightsScreen(state: MainUiState, onPeriod: (Int) -> Unit, onOpenTicket: (Long) -> Unit) {
    val data = state.snapshot
    var dimension by remember { mutableStateOf("Device") }
    val tickets = remember(data, state.periodDays) {
        data?.tickets.orEmpty().filter { SupportAnalytics.inPeriod(it, state.periodDays) }
    }
    val groups = remember(tickets, data, dimension) {
        val snapshot = data
        if (snapshot == null) emptyList() else tickets.mapNotNull { t ->
            val value = when (dimension) {
                "Device" -> SupportAnalytics.dimensionValue(t, snapshot, "device")
                "Category" -> SupportAnalytics.dimensionValue(t, snapshot, "category")
                "Fault" -> SupportAnalytics.dimensionValue(t, snapshot, "fault")
                "Status" -> t.status
                "Priority" -> t.priority
                "Form" -> SupportAnalytics.lookup(snapshot.forms, t.formId, "Unassigned")
                "Group" -> SupportAnalytics.lookup(snapshot.groups, t.groupId, "Unassigned")
                "Agent" -> SupportAnalytics.lookup(snapshot.agents, t.assigneeId?.toLongOrNull(), "Unassigned")
                else -> ""
            }.ifBlank { "Not classified" }
            value
        }.groupingBy { it }.eachCount().entries.map { GroupRow(it.key, it.value) }
            .sortedWith(compareByDescending<GroupRow> { it.count }.thenBy { it.name }).take(30)
    }
    LazyColumn(Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(10.dp),
        contentPadding = PaddingValues(bottom = 28.dp)) {
        item { Heading("Insights", "Read-only analytics calculated from imported Zendesk tickets"); Period(state.periodDays, onPeriod) }
        if (data == null) item { Panel { Text("No server snapshot available", color = Muted) } }
        else {
            item {
                Panel {
                    Metric("Tickets created", "${tickets.size}", "Created in selected period")
                    Text("Active ${tickets.count(SupportAnalytics::open)}  |  High ${tickets.count(SupportAnalytics::urgent)}  |  Unassigned ${tickets.count { it.assigneeId.isNullOrBlank() }}",
                        color = Muted, fontSize = 12.sp)
                    Text("Snapshot scope is limited by the server import. Zero may mean no records in range.",
                        color = Muted, fontSize = 11.sp)
                }
            }
            item {
                Panel {
                    Text("Break down by", color = Ink, fontWeight = FontWeight.Bold)
                    Row(Modifier.horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        listOf("Device", "Category", "Fault", "Status", "Priority", "Form", "Group", "Agent")
                            .forEach { name ->
                                FilterChip(selected = dimension == name, onClick = { dimension = name },
                                    label = { Text(name) })
                            }
                    }
                }
            }
            if (groups.isEmpty()) item { Panel { Text("No breakdown records in this period", color = Muted) } }
            else items(groups, key = { it.name }) { row ->
                Panel {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(row.name, modifier = Modifier.weight(1f), color = Ink,
                            fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                        Text("${row.count}", color = Main, fontWeight = FontWeight.ExtraBold)
                    }
                    LinearProgressIndicator(
                        progress = { if (tickets.isEmpty()) 0f else row.count.toFloat() / tickets.size.toFloat() },
                        modifier = Modifier.fillMaxWidth(), color = Main, trackColor = Stroke
                    )
                }
            }
            if (data.metricsLoaded) item { Panel {
                Text("Server ticket metric records: ${data.metrics.size}", color = Ink, fontWeight = FontWeight.Bold)
                Text("Raw server metrics retained in encrypted snapshot; not converted to fabricated response-time averages.",
                    color = Muted, fontSize = 12.sp)
            } } else item { Panel {
                Text("Ticket metrics unavailable", color = Color(0xFFB45309), fontWeight = FontWeight.Bold)
                Text(data.metricsWarning ?: "Metrics part was not returned", color = Muted, fontSize = 12.sp)
            } }
        }
    }
}

@Composable
fun NativeAlertsScreen(state: MainUiState, onOpenTicket: (Long) -> Unit) {
    val context = LocalContext.current
    val data = state.snapshot
    val alerts = remember(data, state.periodDays) { SupportAlerts.items(data, state.periodDays) }
    var notice by remember { mutableStateOf("") }
    val askPermission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        notice = if (granted) "Permission granted. Tap Send local alert again." else "Notification permission denied"
    }
    LazyColumn(Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(10.dp),
        contentPadding = PaddingValues(bottom = 28.dp)) {
        item { Heading("Alerts", "Read-only snapshot attention items, not server push") }
        item { Panel {
            Metric("Needs attention", "${alerts.size}", "For the selected ${state.periodDays}-day period")
            Text("Local alerts are shown only when the app is open; background push is not configured.",
                color = Muted, fontSize = 12.sp)
            Button(onClick = {
                if (LocalAlerts.needsPermission(context)) {
                    if (Build.VERSION.SDK_INT >= 33) askPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
                } else {
                    val first = alerts.firstOrNull()
                    notice = if (LocalAlerts.notifyNow(context,
                        first?.title ?: "SupportCenter Native", first?.explanation ?: "No urgent items in the snapshot"))
                        "Local notification posted" else "Unable to post local notification"
                }
            }) { Icon(Icons.Outlined.Notifications, null); Spacer(Modifier.width(6.dp)); Text("Send local alert") }
            if (notice.isNotBlank()) Text(notice, color = Muted, fontSize = 12.sp)
        } }
        if (alerts.isEmpty()) item { Panel { Text(if (data == null) "No snapshot loaded" else "No attention conditions matched the saved snapshot", color = Muted) } }
        else items(alerts) { row ->
            Panel {
                Text(row.title, color = Ink, fontWeight = FontWeight.Bold)
                Text(row.explanation, color = Muted, fontSize = 12.sp)
                val id = row.ticketId
                if (id != null && data?.tickets?.any { it.id == id } == true) {
                    TextButton(onClick = { onOpenTicket(id) }) { Text("View ticket #$id") }
                }
            }
        }
    }
}

@Composable
fun NativeProfileScreen(state: MainUiState, onRefresh: () -> Unit, onClearCache: () -> Unit,
                        onLogout: () -> Unit) {
    val session = state.session
    val data = state.snapshot
    LazyColumn(Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(10.dp),
        contentPadding = PaddingValues(bottom = 28.dp)) {
        item { Heading("Profile & settings", "Native account, workspace and cache controls") }
        if (session == null) item { Panel { Text("Sign in to view profile", color = Muted) } }
        else {
            item { Panel {
                Text(session.user.displayName, color = Ink, fontSize = 22.sp, fontWeight = FontWeight.Bold)
                Text(session.user.email, color = Muted)
                Text("Role: ${session.user.role.ifBlank { "Not specified" }}", color = Muted)
                HorizontalDivider()
                Text("Workspace: ${session.workspace.supportLabel}", color = Main, fontWeight = FontWeight.Bold)
                Text("Slug: ${session.workspace.slug}", color = Muted, fontSize = 12.sp)
            } }
            item { Panel {
                Text("Sync and offline storage", color = Ink, fontWeight = FontWeight.Bold)
                Text("Server status: ${data?.meta?.syncStatus ?: "Unavailable"}", color = Muted)
                Text("Last sync: ${data?.meta?.syncedAt ?: "Never"}", color = Muted)
                Text(if (state.cached) "Encrypted offline snapshot in use" else "Server snapshot or no cached data", color = Muted)
                Button(onClick = onRefresh, enabled = !state.refreshing) { Text("Refresh from server") }
                OutlinedButton(onClick = onClearCache) { Text("Clear encrypted offline snapshots") }
                Text("Clearing cache keeps login credentials but removes downloaded ticket data from this device.",
                    color = Muted, fontSize = 11.sp)
            } }
            item { Panel {
                Text("Security", color = Ink, fontWeight = FontWeight.Bold)
                Text("Session tokens and snapshot cache use Android Keystore AES-GCM encryption.", color = Muted)
                OutlinedButton(onClick = onLogout) { Text("Sign out and erase session") }
            } }
            item { Panel {
                Text("SupportCenter Native", color = Ink, fontWeight = FontWeight.Bold)
                Text("Batch 3 · Kotlin · Jetpack Compose · No Expo", color = Muted, fontSize = 12.sp)
                Text("Connected to the existing SupportCenter Vercel API. Backend configuration is not modified.",
                    color = Muted, fontSize = 12.sp)
            } }
        }
    }
}
