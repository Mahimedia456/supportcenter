package com.mahimediasolutions.supportcenter.nativeapp.ui

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Assessment
import androidx.compose.material.icons.outlined.ConfirmationNumber
import androidx.compose.material.icons.outlined.Dashboard
import androidx.compose.material.icons.outlined.Devices
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.Logout
import androidx.compose.material.icons.outlined.MailOutline
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material.icons.outlined.SentimentSatisfied
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mahimediasolutions.supportcenter.nativeapp.R
import com.mahimediasolutions.supportcenter.nativeapp.data.Ticket
import java.time.Instant
import java.time.LocalDate
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter

private val MainGreen = Color(0xFF0A7B61)
private val Mint = Color(0xFFE7F6F0)
private val Back = Color(0xFFF7FBF9)
private val Navy = Color(0xFF102321)
private val Sub = Color(0xFF516A66)
private val Edge = Color(0xFFDCE9E4)
private val Cyan = Color(0xFF14BFC7)
private val Lime = Color(0xFF8BE21D)

private val LightScheme = lightColorScheme(
    primary = MainGreen, onPrimary = Color.White,
    background = Back, onBackground = Navy,
    surface = Color.White, onSurface = Navy,
    outline = Edge, error = Color(0xFFD43A47)
)

private fun brandDrawable(workspace: String): Int = when (workspace) {
    "atomos" -> R.drawable.brand_atomos
    "angelbird" -> R.drawable.brand_angelbird
    else -> R.drawable.brand_supportcenter
}

@Composable
fun SupportApp(state: MainUiState, onLogin: (String, String) -> Unit,
               onRefresh: () -> Unit, onLogout: () -> Unit,
               onTab: (String) -> Unit, onPeriod: (Int) -> Unit,
               onOpenTicket: (Long) -> Unit, onOpenDevice: (String) -> Unit,
               onDetailBack: () -> Unit, onRefreshConversation: () -> Unit, onClearCache: () -> Unit) {
    MaterialTheme(colorScheme = LightScheme) {
        Surface(color = Back, modifier = Modifier.fillMaxSize()) {
            when {
                state.starting -> LoadingScreen()
                state.session == null -> ExpoParityLoginScreen(state.busy, state.error, onLogin)
                else -> MainShell(state, onRefresh, onLogout, onTab, onPeriod,
                    onOpenTicket, onOpenDevice, onDetailBack, onRefreshConversation,
                    onClearCache)
            }
        }
    }
}

@Composable
private fun LoadingScreen() {
    Column(
        modifier = Modifier.fillMaxSize().padding(32.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Image(painterResource(R.drawable.brand_supportcenter), "SupportCenter",
            Modifier.size(110.dp))
        Spacer(Modifier.height(26.dp))
        CircularProgressIndicator(color = MainGreen)
    }
}

@Composable
private fun LoginScreen(busy: Boolean, error: String?, onLogin: (String, String) -> Unit) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState())
            .padding(horizontal = 28.dp, vertical = 38.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Spacer(Modifier.height(22.dp))
        Image(painterResource(R.drawable.brand_supportcenter), "SupportCenter brand mark",
            Modifier.size(154.dp), contentScale = ContentScale.Fit)
        Spacer(Modifier.height(28.dp))
        Text("Welcome back", fontSize = 30.sp, fontWeight = FontWeight.Bold, color = Navy)
        Text("Sign in to your manager workspace", color = Sub)
        Spacer(Modifier.height(30.dp))
        Card(
            shape = RoundedCornerShape(26.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Column(Modifier.padding(22.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                OutlinedTextField(
                    email, { email = it }, modifier = Modifier.fillMaxWidth(),
                    label = { Text("Work email") }, singleLine = true,
                    leadingIcon = { Icon(Icons.Outlined.MailOutline, null) },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                    enabled = !busy
                )
                OutlinedTextField(
                    password, { password = it }, modifier = Modifier.fillMaxWidth(),
                    label = { Text("Password") }, singleLine = true,
                    leadingIcon = { Icon(Icons.Outlined.Lock, null) },
                    visualTransformation = PasswordVisualTransformation(),
                    enabled = !busy
                )
                if (error != null) {
                    Text(error, color = MaterialTheme.colorScheme.error, fontSize = 13.sp)
                }
                Button(
                    onClick = { onLogin(email, password) }, enabled = !busy,
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                    shape = RoundedCornerShape(15.dp)
                ) {
                    if (busy) CircularProgressIndicator(
                        color = Color.White, strokeWidth = 2.dp, modifier = Modifier.size(18.dp)
                    ) else Text("Sign in", fontWeight = FontWeight.Bold)
                }
            }
        }
        Spacer(Modifier.height(20.dp))
        Text("Secure connection to SupportCenter API", color = Sub, fontSize = 12.sp)
    }
}

private data class TabItem(val title: String, val icon: ImageVector)
private val tabs = listOf(
    TabItem("Overview", Icons.Outlined.Dashboard),
    TabItem("Tickets", Icons.Outlined.ConfirmationNumber),
    TabItem("RMA", Icons.Outlined.Assessment),
    TabItem("Devices", Icons.Outlined.Devices),
    TabItem("Satisfaction", Icons.Outlined.SentimentSatisfied)
)

@Composable
private fun MainShell(state: MainUiState, onRefresh: () -> Unit, onLogout: () -> Unit,
                      onTab: (String) -> Unit, onPeriod: (Int) -> Unit,
                      onOpenTicket: (Long) -> Unit, onOpenDevice: (String) -> Unit,
                      onDetailBack: () -> Unit, onRefreshConversation: () -> Unit, onClearCache: () -> Unit) {
    val session = requireNotNull(state.session)
    Scaffold(
        containerColor = Back,
        bottomBar = {
            NavigationBar(containerColor = Color.White, tonalElevation = 4.dp,
                modifier = Modifier.border(width = 0.5.dp, color = ScDesign.border)) {
                tabs.forEach { tab ->
                    NavigationBarItem(
                        selected = tab.title == state.tab,
                        onClick = { onTab(tab.title) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = MainGreen, selectedTextColor = MainGreen,
                            unselectedIconColor = Sub, unselectedTextColor = Sub,
                            indicatorColor = Mint
                        ),
                        icon = { Icon(tab.icon, contentDescription = null) },
                        label = { Text(tab.title, fontSize = 10.sp, fontWeight = FontWeight.Bold,
                            maxLines = 1) },
                        alwaysShowLabel = true
                    )
                }
            }
        }
    ) { padding ->
        // Native screens own their LazyColumn scrolling; never nest inside verticalScroll.
        Column(Modifier.fillMaxSize().padding(padding).padding(horizontal = 18.dp)) {
            WorkspaceHeader(session.workspace.slug,
                session.workspace.supportLabel.ifBlank {
                    if (session.workspace.slug == "atomos") "Atomos Support" else if (session.workspace.slug == "angelbird") "Angelbird Support" else "SupportCenter"
                }, session.user.displayName, state.refreshing, onRefresh, onLogout, onTab)
            if (state.error != null) ErrorBanner(state.error, state.cached)
            Box(Modifier.weight(1f).fillMaxWidth()) {
                when {
                    state.selectedTicketId != null -> NativeTicketDetailScreen(
                        state, onDetailBack, onRefreshConversation)
                    state.selectedDevice != null -> NativeDeviceDetailScreen(
                        state, onDetailBack, onOpenTicket)
                    state.tab == "Overview" -> NativeOverviewScreen(
                        state, onPeriod, onOpenTicket, onRefresh)
                    state.tab == "Tickets" -> NativeTicketsScreen(state, onPeriod, onOpenTicket)
                    state.tab == "RMA" -> NativeRmaScreen(state, onPeriod, onOpenTicket)
                    state.tab == "Devices" -> NativeDevicesScreen(state, onPeriod, onOpenDevice)
                    state.tab == "Satisfaction" -> NativeSatisfactionScreen(state, onPeriod, onOpenTicket)
                    state.tab == "Insights" -> NativeInsightsScreen(state, onPeriod, onOpenTicket)
                    state.tab == "Alerts" -> NativeAlertsScreen(state, onOpenTicket)
                    state.tab == "Profile" -> NativeProfileScreen(state, onRefresh, onClearCache, onLogout)
                    else -> NativeInsightsScreen(state, onPeriod, onOpenTicket)
                }
            }
        }
    }
}

@Composable
private fun WorkspaceHeader(slug: String, label: String, user: String,
                            loading: Boolean, onRefresh: () -> Unit, onLogout: () -> Unit,
                            onTab: (String) -> Unit) {
    Row(
        Modifier.fillMaxWidth().padding(top = 10.dp, bottom = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(7.dp)
    ) {
        Box(
            Modifier.size(46.dp).border(1.dp, Edge, RoundedCornerShape(15.dp))
                .background(Color.White, RoundedCornerShape(15.dp)),
            contentAlignment = Alignment.Center
        ) {
            Image(painterResource(brandDrawable(slug)), "$label logo", Modifier.size(35.dp))
        }
        Column(Modifier.weight(1f)) {
            Text(label, fontWeight = FontWeight.ExtraBold, fontSize = 16.sp,
                maxLines = 1, overflow = TextOverflow.Ellipsis, color = Navy)
            Row(verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                Box(Modifier.size(6.dp).background(Lime, RoundedCornerShape(50)))
                Text("Connected workspace", color = Sub, fontSize = 10.sp,
                    maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
        }
        Box(Modifier.size(38.dp).border(1.dp, Edge, RoundedCornerShape(13.dp))
            .background(Color.White, RoundedCornerShape(13.dp)), contentAlignment = Alignment.Center) {
            IconButton(onClick = { onTab("Insights") }, modifier = Modifier.size(37.dp)) {
                Icon(Icons.Outlined.Assessment, "Insights", tint = MainGreen,
                    modifier = Modifier.size(20.dp))
            }
        }
        Box(Modifier.size(38.dp).border(1.dp, Edge, RoundedCornerShape(13.dp))
            .background(Color.White, RoundedCornerShape(13.dp)), contentAlignment = Alignment.Center) {
            IconButton(onClick = { onTab("Alerts") }, modifier = Modifier.size(37.dp)) {
                Icon(Icons.Outlined.Notifications, "Alerts", tint = MainGreen,
                    modifier = Modifier.size(20.dp))
            }
        }
        IconButton(onClick = { onTab("Profile") }, modifier = Modifier.size(39.dp)) {
            Box(Modifier.size(39.dp).border(1.dp, Edge, RoundedCornerShape(14.dp))
                .background(Mint, RoundedCornerShape(14.dp)), contentAlignment = Alignment.Center) {
                Text(user.take(2).uppercase(), color = MainGreen,
                    fontWeight = FontWeight.ExtraBold, fontSize = 13.sp)
            }
        }
    }
}

@Composable
private fun ErrorBanner(message: String, cached: Boolean) {
    val sessionError = message.contains("401") || message.contains("Session expired", true)
    val title = when {
        cached -> "Offline data shown"
        sessionError -> "Session authentication required"
        else -> "Unable to refresh snapshot"
    }
    Column(Modifier.fillMaxWidth().padding(bottom = 12.dp)
        .border(1.dp, Color(0xFFF3D9D9), RoundedCornerShape(15.dp))
        .background(Color(0xFFFFF4F3), RoundedCornerShape(15.dp))
        .padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(title, fontWeight = FontWeight.ExtraBold,
            color = ScDesign.danger, fontSize = 13.sp)
        Text(message, color = ScDesign.danger, fontSize = 12.sp, lineHeight = 17.sp)
    }
}

private fun createdDate(t: Ticket): LocalDate? = try {
    Instant.parse(t.createdAt).atZone(ZoneId.systemDefault()).toLocalDate()
} catch (_: Exception) {
    try { OffsetDateTime.parse(t.createdAt).atZoneSameInstant(ZoneId.systemDefault()).toLocalDate() }
    catch (_: Exception) { null }
}

@Composable
private fun OverviewPreview(state: MainUiState, onPeriod: (Int) -> Unit,
                            onRefresh: () -> Unit) {
    Text("MANAGER OVERVIEW", color = MainGreen, fontSize = 11.sp,
        fontWeight = FontWeight.Bold, letterSpacing = 2.sp)
    Spacer(Modifier.height(5.dp))
    Text("Support at a glance", color = Navy, fontSize = 30.sp,
        lineHeight = 35.sp, fontWeight = FontWeight.ExtraBold)
    Text("Saved Zendesk snapshot", color = Sub, fontSize = 14.sp)
    Spacer(Modifier.height(14.dp))
    Row(verticalAlignment = Alignment.CenterVertically) {
        val fresh = state.snapshot?.meta?.syncStatus == "ok" && !state.cached
        Text(
            if (fresh) "● SERVER SNAPSHOT" else if (state.cached) "● CACHED / OFFLINE" else "● SNAPSHOT PENDING",
            color = if (fresh) MainGreen else Sub, fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.background(Mint, RoundedCornerShape(50.dp))
                .padding(horizontal = 12.dp, vertical = 7.dp)
        )
        Spacer(Modifier.weight(1f))
        if (state.refreshing) CircularProgressIndicator(
            Modifier.size(20.dp), strokeWidth = 2.dp, color = MainGreen
        ) else TextButton(onClick = onRefresh) { Text("Refresh") }
    }
    Text("Last server sync: ${state.snapshot?.meta?.syncedAt ?: "Not yet imported"}",
        fontSize = 11.sp, color = Sub)
    Spacer(Modifier.height(15.dp))
    Row(horizontalArrangement = Arrangement.spacedBy(5.dp), modifier = Modifier.fillMaxWidth()) {
        listOf(1 to "Today", 7 to "7 Days", 30 to "30 Days", 90 to "90 Days").forEach { (days, name) ->
            FilterChip(selected = state.periodDays == days, onClick = { onPeriod(days) },
                label = { Text(name, fontSize = 11.sp) }, modifier = Modifier.weight(1f))
        }
    }
    Spacer(Modifier.height(16.dp))
    val today = LocalDate.now()
    val selected = state.snapshot?.tickets.orEmpty().filter {
        val date = createdDate(it)
        date != null && !date.isAfter(today) && !date.isBefore(today.minusDays((state.periodDays - 1).toLong()))
    }
    val rows = listOf(
        Triple("Total Tickets", selected.size, Color(0xFFEDF9F3)),
        Triple("Open", selected.count { it.status.lowercase() in setOf("new", "open") }, Color(0xFFDCF7FB)),
        Triple("High Priority", selected.count { it.priority.lowercase() in setOf("high", "urgent") }, Color(0xFFF5F9DF)),
        Triple("Unassigned", selected.count { it.assigneeId.isNullOrEmpty() }, Color.White)
    )
    if (state.snapshot == null) {
        Card(colors = CardDefaults.cardColors(containerColor = Color.White),
            modifier = Modifier.fillMaxWidth()) {
            Text("No verified snapshot available yet. Sign in to the Atomos workspace and refresh after the server sync.",
                modifier = Modifier.padding(20.dp), color = Sub)
        }
    } else {
        for (pair in rows.chunked(2)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                pair.forEach { (label, value, bg) ->
                    MetricCard(label, value, bg, Modifier.weight(1f))
                }
            }
            Spacer(Modifier.height(10.dp))
        }
    }
    Spacer(Modifier.height(13.dp))
    Text("Read-only Zendesk snapshot. Tap a metric or ticket for more detail.",
        color = Sub, fontSize = 12.sp)
}

@Composable
private fun MetricCard(name: String, count: Int, color: Color, modifier: Modifier = Modifier) {
    Column(
        modifier.height(158.dp).clip(RoundedCornerShape(24.dp))
            .background(color).border(1.dp, Edge, RoundedCornerShape(24.dp))
            .padding(20.dp),
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        Text(name, fontWeight = FontWeight.Bold, color = Sub, fontSize = 13.sp)
        Text("$count", color = MainGreen, fontWeight = FontWeight.ExtraBold, fontSize = 38.sp)
        Text("Created in period", color = Sub, fontSize = 11.sp)
    }
}

@Composable
private fun DeferredScreen(tab: String) {
    Column(
        Modifier.fillMaxWidth().padding(vertical = 40.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Icon(Icons.Outlined.Assessment, null, tint = MainGreen, modifier = Modifier.size(46.dp))
        Text(tab, color = Navy, fontSize = 28.sp, fontWeight = FontWeight.Bold)
        Text(
            "Full native $tab screen is scheduled for Batch 2 or Batch 3. " +
              "This is a Batch 1 foundation build, not a completed screen.",
            color = Sub, fontSize = 14.sp
        )
    }
}
