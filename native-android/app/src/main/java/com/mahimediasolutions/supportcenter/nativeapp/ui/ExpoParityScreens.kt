package com.mahimediasolutions.supportcenter.nativeapp.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ChevronRight
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mahimediasolutions.supportcenter.nativeapp.data.SnapshotData
import com.mahimediasolutions.supportcenter.nativeapp.data.SupportAnalytics
import com.mahimediasolutions.supportcenter.nativeapp.data.Ticket
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.time.Instant
import java.util.Locale

// Native port of the existing Expo SupportCenter layout tokens and screen semantics.
private object P {
    val bg = Color(0xFFF7FBF9)
    val ink = Color(0xFF102321)
    val muted = Color(0xFF516A66)
    val green = Color(0xFF0A7B61)
    val cyan = Color(0xFF14BFC7)
    val lime = Color(0xFF8BE21D)
    val mint = Color(0xFFE7F6F0)
    val line = Color(0xFFDCE9E4)
    val danger = Color(0xFFC84B4B)
    val orange = Color(0xFFB57A1F)
}
private fun isActive(t: Ticket) = t.status.lowercase(Locale.ROOT) in setOf("new", "open", "pending", "hold")
private fun inDays(t: Ticket, days: Int) = SupportAnalytics.inPeriod(t, days)
private fun whenDate(s: String): Long = SupportAnalytics.instantOf(s)?.toEpochMilli() ?: 0L
private fun ageHours(s: String): Long = if (whenDate(s) > 0) ((System.currentTimeMillis() - whenDate(s)) / 3_600_000L).coerceAtLeast(0L) else 0L
private fun label(s: String) = s.replace('_',' ').replaceFirstChar { it.uppercaseChar() }

@Composable private fun HeadingP(eyebrow: String, title: String, subtitle: String) {
    Column(Modifier.fillMaxWidth().padding(top = 8.dp, bottom = 7.dp)) {
        Text(eyebrow, color = P.green, fontWeight = FontWeight.ExtraBold, fontSize = 9.sp, letterSpacing = 1.2.sp)
        Spacer(Modifier.height(5.dp))
        Text(title, color = P.ink, fontSize = 28.sp, lineHeight = 34.sp, fontWeight = FontWeight.ExtraBold)
        Spacer(Modifier.height(4.dp))
        Text(subtitle, color = P.muted, fontSize = 11.sp, lineHeight = 16.sp)
    }
}
@Composable private fun SectionP(title: String, detail: String = "") {
    Column(Modifier.fillMaxWidth().padding(top = 10.dp, bottom = 2.dp)) {
        Text(title, fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, color = P.ink)
        if (detail.isNotBlank()) Text(detail, fontSize = 10.sp, color = P.muted, lineHeight = 15.sp)
    }
}
@Composable private fun PanelP(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    Card(modifier = modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = BorderStroke(1.dp, P.line)) {
        Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(7.dp), content = content)
    }
}
@Composable private fun StatP(title: String, value: String, note: String, tone: String,
                              modifier: Modifier = Modifier, onClick: () -> Unit = {}) {
    val fill = when(tone) {
        "cyan" -> Color(0xFFE8FAFB)
        "lime" -> Color(0xFFF3F9DF)
        "white" -> Color.White
        else -> P.mint
    }
    Card(onClick = onClick, modifier = modifier.heightIn(min = 125.dp),
        border = BorderStroke(1.dp, P.line), shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = fill)) {
        Column(Modifier.fillMaxWidth().padding(13.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(title, color = P.muted, fontWeight = FontWeight.Bold, fontSize = 11.sp,
                    modifier = Modifier.weight(1f), maxLines = 2)
                Text("›", color = P.green, fontSize = 17.sp, fontWeight = FontWeight.Bold)
            }
            Spacer(Modifier.height(10.dp))
            Text(value, color = P.ink, fontWeight = FontWeight.ExtraBold, fontSize = 29.sp)
            Text(note, color = P.muted, fontSize = 10.sp, lineHeight = 14.sp, maxLines = 2)
        }
    }
}
@Composable private fun RiskP(name: String, number: String, critical: Boolean = false, onClick: () -> Unit = {}) {
    Card(onClick = onClick, modifier = Modifier.fillMaxWidth().heightIn(min = 76.dp),
        colors = CardDefaults.cardColors(containerColor = if(critical) Color(0xFFFFF4F4) else Color.White),
        border = BorderStroke(1.dp, if(critical) Color(0xFFF1CFCF) else P.line),
        shape = RoundedCornerShape(16.dp)) {
        Column(Modifier.padding(13.dp)) {
            Text(number, fontSize = 23.sp, fontWeight = FontWeight.ExtraBold, color = if(critical) P.danger else P.green)
            Spacer(Modifier.height(4.dp)); Text(name, color = P.muted, fontSize = 10.sp, fontWeight = FontWeight.Bold)
        }
    }
}
@Composable private fun ChipsP(values: List<String>, selected: String, onChange: (String) -> Unit) {
    Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(vertical = 5.dp),
        horizontalArrangement = Arrangement.spacedBy(7.dp)) {
        values.forEach { x ->
            val chosen = x == selected
            FilterChip(selected = chosen, onClick = { onChange(x) },
                label = { Text(label(x), fontSize = 11.sp, fontWeight = FontWeight.Bold) },
                shape = RoundedCornerShape(24.dp),
                colors = FilterChipDefaults.filterChipColors(containerColor = Color.White,
                    labelColor = P.muted, selectedContainerColor = P.green, selectedLabelColor = Color.White),
                border = BorderStroke(1.dp, if(chosen) P.green else P.line))
        }
    }
}
@Composable private fun SearchP(value: String, onChange: (String) -> Unit, placeholder: String) {
    OutlinedTextField(value = value, onValueChange = onChange, modifier = Modifier.fillMaxWidth(),
        singleLine = true, label = { Text(placeholder, fontSize = 12.sp) },
        leadingIcon = { Icon(Icons.Outlined.Search, contentDescription = null, tint = P.green) },
        shape = RoundedCornerShape(15.dp),
        colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = P.green, unfocusedBorderColor = P.line))
}
@Composable private fun EmptyP(message: String) {
    PanelP { Text("No matching records", fontSize = 15.sp, color = P.ink, fontWeight = FontWeight.Bold)
        Text(message, color = P.muted, fontSize = 12.sp) }
}
@Composable private fun PeriodP(days: Int, onPeriod: (Int) -> Unit) {
    Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(7.dp)) {
        listOf(1 to "Today", 30 to "1 Month", 60 to "2 Months", 90 to "3 Months").forEach { (n,title) ->
            FilterChip(selected = n == days, onClick = { onPeriod(n) },
                label = { Text(title, fontSize = 11.sp, fontWeight = FontWeight.SemiBold) },
                colors = FilterChipDefaults.filterChipColors(selectedContainerColor = P.mint,
                    selectedLabelColor = P.green, containerColor = Color.White),
                border = BorderStroke(1.dp, if(n == days) P.green else P.line))
        }
    }
}

private fun regionName(t: Ticket): String {
    // Exact heuristic order from Expo src/lib/overview.ts, preserved for parity.
    val text = (t.subject + " " + t.description + " " + t.tags.joinToString(" ")).lowercase(Locale.ROOT)
    val patterns = listOf(
        "Europe" to listOf("europe", "eu_", "region_eu", "uk", "germany", "france", "italy", "spain"),
        "EMEA" to listOf("emea", "middle_east", "middle east", "africa", "uae", "dubai"),
        "US" to listOf("region_us", "usa", "united states", "north_america", "north america"),
        "APAC" to listOf("apac", "asia", "australia", "japan", "singapore")
    )
    return patterns.firstOrNull { (_,patterns) -> patterns.any { text.contains(it) } }?.first ?: "Other"
}
private data class OverviewP(
    val tickets: List<Ticket>, val open: Int, val high: Int, val unassigned: Int,
    val pending: Int, val breach: Int?, val noReply: Int?, val slow: Int?, val over72: Int,
    val regions: List<Pair<String,Int>>
)
private fun overviewStats(data: SnapshotData, days: Int): OverviewP {
    val tickets = data.tickets.filter { inDays(it,days) }
    val metrics = data.metrics.associateBy { it.optLong("ticket_id") }
    val ids = tickets.map { it.id }.toHashSet()
    val breach = if(data.slaLoaded) data.slaEvents.asSequence()
        .filter { it.optString("type") == "breach" && it.optLong("ticket_id") in ids }
        .map { it.optLong("ticket_id") }.distinct().count() else null
    val noReply = if(data.metricsLoaded) tickets.count { ticket ->
        isActive(ticket) && metrics[ticket.id]?.optInt("replies",-1) == 0 && ageHours(ticket.createdAt)>=4
    } else null
    val slow = if(data.metricsLoaded) data.metrics.count { m ->
        m.optLong("ticket_id") in ids && m.optJSONObject("reply_time_in_minutes")?.optDouble("calendar",0.0)?.let { it>240.0 } == true
    } else null
    val regions = tickets.groupingBy(::regionName).eachCount().entries
        .map { it.key to it.value }.sortedByDescending { it.second }
    return OverviewP(tickets, tickets.count { it.status.lowercase(Locale.ROOT) in setOf("new","open") },
        tickets.count(SupportAnalytics::urgent), tickets.count { it.assigneeId.isNullOrBlank() },
        tickets.count { it.status.equals("pending",true) }, breach, noReply, slow,
        tickets.count { isActive(it) && ageHours(it.createdAt)>=72 }, regions)
}

@Composable
fun ParityOverviewScreen(state: MainUiState, onPeriod: (Int)->Unit, onOpenTicket: (Long)->Unit,
                         onRefresh: ()->Unit, openTickets: (String)->Unit) {
    val data = state.snapshot
    val agg by produceState<OverviewP?>(null, data, state.periodDays) {
        value = if (data == null) null else withContext(Dispatchers.Default) { overviewStats(data, state.periodDays) }
    }
    LazyColumn(Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(10.dp),
        contentPadding = PaddingValues(bottom = 32.dp)) {
        item { HeadingP("MANAGER OVERVIEW", "Support at a glance", "Server synced ${data?.meta?.syncedAt ?: "not yet"}")
            PeriodP(state.periodDays,onPeriod) }
        if(data==null) item { EmptyP(if(state.refreshing) "Loading complete 90-day snapshot. Ticket previews appear during transfer." else "No complete 90-day snapshot. Refresh after server sync.") }
        else if(agg==null) item { PanelP { CircularProgressIndicator(Modifier.size(20.dp)); Text("Calculating KPI and SLA health off the UI thread",color=P.muted) } }
        else {
            item { Row(horizontalArrangement = Arrangement.spacedBy(9.dp)) {
                StatP("Total Tickets",agg!!.tickets.size.toString(),"Created in selected period","mint",Modifier.weight(1f)){openTickets("all")}
                StatP("Open",agg!!.open.toString(),"New + open","cyan",Modifier.weight(1f)){openTickets("open")}
            } }
            item { Row(horizontalArrangement = Arrangement.spacedBy(9.dp)) {
                StatP("High Priority",agg!!.high.toString(),"High + urgent","lime",Modifier.weight(1f)){openTickets("priority")}
                StatP("Unassigned",agg!!.unassigned.toString(),"Needs ownership","white",Modifier.weight(1f)){openTickets("unassigned")}
            } }
            item { SectionP("SLA Health","Actual breach events plus reply-time risk signals") }
            item { Row(horizontalArrangement = Arrangement.spacedBy(9.dp)) {
                Box(Modifier.weight(1f)){RiskP("Breached",agg!!.breach?.toString() ?: "—", (agg!!.breach ?: 0)>0){openTickets("breached")}}
                Box(Modifier.weight(1f)){RiskP("No reply > 4h",agg!!.noReply?.toString() ?: "—",(agg!!.noReply ?: 0)>0){openTickets("no-reply")}}
            } }
            item { Row(horizontalArrangement = Arrangement.spacedBy(9.dp)) {
                Box(Modifier.weight(1f)){RiskP("First reply > 4h",agg!!.slow?.toString() ?: "—"){openTickets("slow-reply")}}
                Box(Modifier.weight(1f)){RiskP("Unsolved > 72h",agg!!.over72.toString()){openTickets("over72")}}
            } }
            item { SectionP("Regions","Ticket distribution derived from tags and metadata") }
            item { PanelP { val max = (agg!!.regions.maxOfOrNull{it.second}?:1).coerceAtLeast(1)
                agg!!.regions.forEach { (name, count) ->
                    Row(verticalAlignment=Alignment.CenterVertically) {
                        Text(name,color=P.ink,fontWeight=FontWeight.Bold,fontSize=12.sp,modifier=Modifier.weight(1f))
                        Text(count.toString(),color=P.green,fontWeight=FontWeight.Bold,fontSize=12.sp)
                    }
                    LinearProgressIndicator(progress={count.toFloat()/max.toFloat()},modifier=Modifier.fillMaxWidth().height(7.dp),color=P.cyan,trackColor=P.bg)
                }
                if (agg!!.regions.isEmpty()) Text("No region classifications in this period",color=P.muted)
            } }
            item { SectionP("Needs attention","Priority, ownership and pending tickets") }
            item { Row(horizontalArrangement=Arrangement.spacedBy(8.dp)) {
                listOf(Triple("High / Urgent",agg!!.high,"priority"),Triple("Unassigned",agg!!.unassigned,"unassigned"),Triple("Pending",agg!!.pending,"pending")).forEach { (text,n,code) ->
                    Card(onClick={openTickets(code)},modifier=Modifier.weight(1f),colors=CardDefaults.cardColors(containerColor=Color.White),
                        shape=RoundedCornerShape(16.dp),border=BorderStroke(1.dp,P.line)) {
                        Column(Modifier.padding(11.dp)) {Text(n.toString(),color=P.green,fontWeight=FontWeight.ExtraBold,fontSize=22.sp)
                            Text(text,color=P.muted,fontSize=9.sp,maxLines=2) }
                    }
                }
            } }
            item { PanelP { Text("Snapshot-only manager view",color=P.green,fontWeight=FontWeight.Bold)
                Text("Charts and totals are read from the completed server snapshot. Refresh checks for a newer published version.",color=P.muted,fontSize=11.sp)
                TextButton(onClick=onRefresh,enabled=!state.refreshing){Text("Check for updates")}
            } }
        }
    }
}

@Composable
private fun TicketP(ticket: Ticket, data: SnapshotData, onOpen: (Long)->Unit) {
    Card(onClick={onOpen(ticket.id)},modifier=Modifier.fillMaxWidth(),shape=RoundedCornerShape(18.dp),
        colors=CardDefaults.cardColors(containerColor=Color.White),border=BorderStroke(1.dp,P.line)) {
        Column(Modifier.padding(14.dp),verticalArrangement=Arrangement.spacedBy(8.dp)) {
            Row(verticalAlignment=Alignment.CenterVertically) {
                Text("#${ticket.id}",fontSize=13.sp,color=P.green,fontWeight=FontWeight.ExtraBold,modifier=Modifier.weight(1f))
                BadgeP(ticket.priority.ifBlank { "normal" }.uppercase(Locale.ROOT),ticket.priority.equals("urgent",true))
                Spacer(Modifier.width(5.dp));BadgeP(ticket.status.ifBlank { "unknown" }.uppercase(Locale.ROOT))
            }
            Text(ticket.subject.ifBlank { "Untitled ticket" },fontSize=14.sp,lineHeight=19.sp,fontWeight=FontWeight.ExtraBold,color=P.ink,
                maxLines=2,overflow=TextOverflow.Ellipsis)
            Row(horizontalArrangement=Arrangement.spacedBy(8.dp)){
                MetaP("ASSIGNEE",SupportAnalytics.lookup(data.agents,ticket.assigneeId?.toLongOrNull()),Modifier.weight(1f))
                MetaP("GROUP",SupportAnalytics.lookup(data.groups,ticket.groupId),Modifier.weight(1f))
            }
            Row(verticalAlignment=Alignment.CenterVertically){
                Text("Updated ${SupportAnalytics.shortDate(ticket.updatedAt.ifBlank{ticket.createdAt})}",fontSize=10.sp,color=P.muted,modifier=Modifier.weight(1f))
                Text("View details ›",fontSize=10.sp,color=P.cyan,fontWeight=FontWeight.Bold)
            }
        }
    }
}
@Composable private fun BadgeP(text: String, danger: Boolean=false) {
    Text(text,color=if(danger)P.danger else P.green,fontWeight=FontWeight.Bold,fontSize=9.sp,
        modifier=Modifier.background(if(danger)Color(0xFFFFEDEC) else P.mint,RoundedCornerShape(12.dp))
            .padding(horizontal=8.dp,vertical=5.dp),maxLines=1)
}
@Composable private fun MetaP(name: String, value: String, modifier: Modifier=Modifier) {
    Column(modifier.background(P.bg,RoundedCornerShape(12.dp)).padding(9.dp)){
        Text(name,color=P.muted,fontWeight=FontWeight.Bold,fontSize=9.sp)
        Text(value.ifBlank{"Unassigned"},color=P.ink,fontSize=11.sp,fontWeight=FontWeight.SemiBold,maxLines=2)
    }
}

private fun filterTicket(t: Ticket, filter: String, data: SnapshotData,
                         metrics: Map<Long,JSONObject>, breachIds: Set<Long>, badIds: Set<Long>): Boolean = when(filter) {
    "open" -> t.status.lowercase(Locale.ROOT) in setOf("new","open")
    "pending" -> t.status.equals("pending",true)
    "priority" -> SupportAnalytics.urgent(t)
    "unassigned" -> t.assigneeId.isNullOrBlank()
    "over72" -> isActive(t)&&ageHours(t.createdAt)>=72
    "over24" -> isActive(t) && ageHours(t.createdAt) in 24..71
    "waiting" -> t.status.equals("pending",true) && ageHours(t.updatedAt.ifBlank{t.createdAt})>=4
    "agent-followup" -> t.status.lowercase(Locale.ROOT) in setOf("new","open","hold") && ageHours(t.updatedAt.ifBlank{t.createdAt})>=4
    "stale" -> isActive(t)&&ageHours(t.updatedAt.ifBlank{t.createdAt})>=24
    "no-reply" -> data.metricsLoaded && isActive(t) && ageHours(t.createdAt)>=4 && metrics[t.id]?.optInt("replies",-1)==0
    "slow-reply" -> data.metricsLoaded &&
        (metrics[t.id]?.optJSONObject("reply_time_in_minutes")?.optDouble("calendar",0.0)?:0.0)>240.0
    "reopened" -> data.metricsLoaded && (metrics[t.id]?.optInt("reopens",0)?:0)>0
    "breached" -> data.slaLoaded && t.id in breachIds
    "bad-csat" -> data.satisfactionLoaded && t.id in badIds
    else -> true
}

@Composable
fun ParityTicketsScreen(state: MainUiState, onPeriod:(Int)->Unit, onOpenTicket:(Long)->Unit,
                        preset:String, onResetPreset:()->Unit) {
    val data=state.snapshot
    var query by rememberSaveable { mutableStateOf("") }
    var status by rememberSaveable { mutableStateOf("all") }
    var priority by rememberSaveable { mutableStateOf("all") }
    var order by rememberSaveable { mutableStateOf("Newest") }
    val filtered by produceState<List<Ticket>?>(null,data,state.periodDays,query,status,priority,order,preset) {
        value=if(data==null)null else withContext(Dispatchers.Default) {
            val text=query.trim().lowercase(Locale.ROOT)
            val metricsById=data.metrics.associateBy{it.optLong("ticket_id")}
            val breachIds=data.slaEvents.asSequence().filter{it.optString("type")=="breach"}.map{it.optLong("ticket_id")}.toHashSet()
            val badIds=data.satisfaction.asSequence().filter{it.optString("score").equals("bad",true)}.map{it.optLong("ticket_id")}.toHashSet()
            data.tickets.asSequence().filter{inDays(it,state.periodDays)}
                .filter{status=="all"||it.status.equals(status,true)}
                .filter{priority=="all"||it.priority.equals(priority,true)}
                .filter{filterTicket(it,preset,data,metricsById,breachIds,badIds)}
                .filter { text.isBlank() || (it.id.toString()+" "+it.subject+" "+it.status+" "+it.priority+" "+it.tags.joinToString(" ")).lowercase(Locale.ROOT).contains(text) }
                .sortedWith(if(order=="Oldest")compareBy<Ticket>{whenDate(it.createdAt)} else compareByDescending<Ticket>{whenDate(it.updatedAt.ifBlank{it.createdAt})})
                .toList()
        }
    }
    LazyColumn(Modifier.fillMaxSize(),verticalArrangement=Arrangement.spacedBy(9.dp),contentPadding=PaddingValues(bottom=30.dp)) {
        item { HeadingP("TICKET OPERATIONS","Tickets","Search and filter your verified 90-day workspace snapshot")
            PeriodP(state.periodDays,onPeriod)
            SearchP(query,{query=it},"Search ID, subject, status, priority")
            SectionP("Ticket status")
            ChipsP(listOf("all","new","open","pending","hold","solved","closed"),status){status=it}
            SectionP("Priority")
            ChipsP(listOf("all","low","normal","high","urgent"),priority){priority=it}
            Row(verticalAlignment=Alignment.CenterVertically) {
                Text("${filtered?.size?:0} matching tickets",color=P.muted,fontSize=11.sp,modifier=Modifier.weight(1f))
                TextButton(onClick={order=if(order=="Newest")"Oldest" else "Newest"}){Text("Sort: $order",fontSize=11.sp)}
            }
            if(preset!="all") Row(verticalAlignment=Alignment.CenterVertically){
                BadgeP("OVERVIEW FILTER: $preset")
                TextButton(onClick=onResetPreset){Text("Clear",fontSize=11.sp)}
            }
        }
        if(data==null)item{EmptyP("No verified server snapshot; wait for update or refresh.")}
        else if(filtered==null)item{PanelP { CircularProgressIndicator(Modifier.size(20.dp));Text("Filtering tickets",color=P.muted) }}
        else if(filtered!!.isEmpty())item{EmptyP("Change the date, status, priority or search filter.")}
        else items(filtered!!,key={it.id}) { TicketP(it,data,onOpenTicket) }
    }
}

private data class RmaEntry(val ticket:Ticket,val info:SupportAnalytics.RmaInfo)
private fun workflow(info:SupportAnalytics.RmaInfo):String = when(info.shipment.lowercase(Locale.ROOT)) {
    "pending ship"->"pending_ship";"shipped"->"shipped";"returned"->"returned";else->"unknown"
}
@Composable
fun ParityRmaScreen(state:MainUiState,onPeriod:(Int)->Unit,onOpenTicket:(Long)->Unit){
    val data=state.snapshot
    var query by rememberSaveable{mutableStateOf("")}
    var wf by rememberSaveable{mutableStateOf("all")}
    var outcome by rememberSaveable{mutableStateOf("all")}
    var status by rememberSaveable{mutableStateOf("all")}
    var category by rememberSaveable{mutableStateOf("all")}
    val entries by produceState<List<RmaEntry>?>(null,data,state.periodDays){
        value=if(data==null)null else withContext(Dispatchers.Default){
            data.tickets.asSequence().filter{inDays(it,state.periodDays)}.mapNotNull { ticket ->
                val info=SupportAnalytics.rmaInfo(ticket,data)
                if(info.isRma)RmaEntry(ticket,info) else null
            }.toList()
        }
    }
    val categories=remember(entries){entries.orEmpty().groupingBy{it.info.category}.eachCount().entries.sortedByDescending{it.value}.take(25)}
    val filtered=remember(entries,wf,query,outcome,status,category){
        val text=query.trim().lowercase(Locale.ROOT)
        entries.orEmpty().filter { row ->
            (wf=="all"||workflow(row.info)==wf||(wf=="completed"&&SupportAnalytics.closed(row.ticket))) &&
            (outcome=="all"||row.info.disposition.equals(outcome,true)) &&
            (status=="all"||row.ticket.status.equals(status,true)) &&
            (category=="all"||row.info.category==category) &&
            (text.isBlank()||("${row.ticket.id} ${row.ticket.subject} ${row.info.device} ${row.info.category} ${row.info.shipment}").lowercase(Locale.ROOT).contains(text))
        }.sortedByDescending{whenDate(it.ticket.updatedAt.ifBlank{it.ticket.createdAt})}
    }
    LazyColumn(Modifier.fillMaxSize(),verticalArrangement=Arrangement.spacedBy(9.dp),contentPadding=PaddingValues(bottom=30.dp)){
        item { HeadingP("RETURN & REPAIR OPERATIONS","RMA","Repair workflow, shipment status and customer returns")
            PeriodP(state.periodDays,onPeriod)
        }
        if(data==null)item{EmptyP("RMA data unavailable until server snapshot completes.")}
        else if(entries==null)item{PanelP{CircularProgressIndicator(Modifier.size(20.dp));Text("Classifying RMA cases without blocking the screen",color=P.muted)}}
        else {
            item { Row(horizontalArrangement=Arrangement.spacedBy(9.dp)) {
                StatP("All RMA",entries!!.size.toString(),"Cases in period","mint",Modifier.weight(1f)) {wf="all"}
                StatP("Pending ship",entries!!.count{workflow(it.info)=="pending_ship"}.toString(),"Awaiting dispatch","white",Modifier.weight(1f)){wf="pending_ship"}
            } }
            item { Row(horizontalArrangement=Arrangement.spacedBy(9.dp)) {
                StatP("Shipped",entries!!.count{workflow(it.info)=="shipped"}.toString(),"Dispatched units","cyan",Modifier.weight(1f)){wf="shipped"}
                StatP("Completed",entries!!.count{SupportAnalytics.closed(it.ticket)}.toString(),"Solved + closed tickets","lime",Modifier.weight(1f)){wf="completed"}
            } }
            item { Row(horizontalArrangement=Arrangement.spacedBy(9.dp)) {
                StatP("Repairs",entries!!.count{it.info.disposition=="Repair"}.toString(),"Confirmed repair outcome","white",Modifier.weight(1f)){outcome="Repair"}
                StatP("Replacements",entries!!.count{it.info.disposition=="Replaced"}.toString(),"Confirmed replacement outcome","white",Modifier.weight(1f)){outcome="Replaced"}
            } }
            item { SearchP(query,{query=it},"Search RMA ticket, model, category")
                SectionP("RMA workflow")
                ChipsP(listOf("all","pending_ship","shipped","returned","completed","unknown"),wf){wf=it}
                SectionP("Repair outcome")
                ChipsP(listOf("all","Repair","Replaced","Not classified"),outcome){outcome=it}
                SectionP("Ticket status")
                ChipsP(listOf("all","new","open","pending","hold","solved","closed"),status){status=it}
                SectionP("RMA category")
                ChipsP(listOf("all")+categories.map{it.key},category){category=it}
                Text("${filtered.size} cases",color=P.muted,fontSize=11.sp)
            }
            if(filtered.isEmpty())item{EmptyP("No cases match these workflow, status and category filters.")}
            else items(filtered,key={it.ticket.id}){row->
                Card(onClick={onOpenTicket(row.ticket.id)},shape=RoundedCornerShape(18.dp),
                    colors=CardDefaults.cardColors(containerColor=Color.White),border=BorderStroke(1.dp,P.line)) {
                    Column(Modifier.fillMaxWidth().padding(14.dp),verticalArrangement=Arrangement.spacedBy(8.dp)) {
                        Row(verticalAlignment=Alignment.CenterVertically){
                            Text("RMA #${row.ticket.id}",color=P.green,fontWeight=FontWeight.ExtraBold,modifier=Modifier.weight(1f))
                            BadgeP(workflow(row.info).uppercase(Locale.ROOT))
                        }
                        Text(row.ticket.subject,color=P.ink,fontWeight=FontWeight.ExtraBold,fontSize=14.sp,maxLines=2)
                        Row(horizontalArrangement=Arrangement.spacedBy(8.dp)){
                            MetaP("DEVICE",row.info.device,Modifier.weight(1f))
                            MetaP("OUTCOME",row.info.disposition,Modifier.weight(1f))
                        }
                        Text("${row.info.category} · ${label(row.ticket.status)}",color=P.muted,fontSize=11.sp)
                        Text("Open RMA ticket ›",color=P.cyan,fontWeight=FontWeight.Bold,fontSize=11.sp)
                    }
                }
            }
        }
    }
}

@Composable
fun ParityDevicesScreen(state:MainUiState,onPeriod:(Int)->Unit,onOpenDevice:(String)->Unit){
    val data=state.snapshot
    var query by rememberSaveable{mutableStateOf("")}
    var onlyActive by rememberSaveable{mutableStateOf(false)}
    val rows by produceState<List<SupportAnalytics.DeviceRow>?>(null,data,state.periodDays){
        value=if(data==null)null else withContext(Dispatchers.Default){
            SupportAnalytics.deviceRows(data.tickets.filter{inDays(it,state.periodDays)},data)
        }
    }
    val filtered=remember(rows,query,onlyActive){rows.orEmpty().filter{it.device.contains(query,true)&&(!onlyActive||it.active>0)}}
    LazyColumn(Modifier.fillMaxSize(),verticalArrangement=Arrangement.spacedBy(9.dp),contentPadding=PaddingValues(bottom=30.dp)){
        item { HeadingP("DEVICE HEALTH","Devices","Model-level support health and ticket distribution")
            PeriodP(state.periodDays,onPeriod)
            SearchP(query,{query=it},"Search device model")
            Row(verticalAlignment=Alignment.CenterVertically){
                FilterChip(selected=onlyActive,onClick={onlyActive=!onlyActive},label={Text("Active issues only")})
                Spacer(Modifier.width(10.dp)); Text("${filtered.size} models",color=P.muted,fontSize=11.sp)
            }
        }
        if(data==null)item{EmptyP("Device snapshot unavailable.")}
        else if(rows==null)item{PanelP{CircularProgressIndicator(Modifier.size(20.dp));Text("Calculating model analytics",color=P.muted)}}
        else if(filtered.isEmpty())item{EmptyP("No device model matches the search/filter.")}
        else items(filtered,key={it.device}){row->
            Card(onClick={onOpenDevice(row.device)},shape=RoundedCornerShape(18.dp),
                colors=CardDefaults.cardColors(containerColor=Color.White),border=BorderStroke(1.dp,P.line)) {
                Column(Modifier.fillMaxWidth().padding(14.dp),verticalArrangement=Arrangement.spacedBy(9.dp)){
                    Row(verticalAlignment=Alignment.CenterVertically){
                        Text(row.device,color=P.ink,fontWeight=FontWeight.ExtraBold,fontSize=15.sp,modifier=Modifier.weight(1f))
                        Icon(Icons.Outlined.ChevronRight,null,tint=P.cyan)
                    }
                    Row(horizontalArrangement=Arrangement.spacedBy(8.dp)){
                        MetaP("TICKETS",row.total.toString(),Modifier.weight(1f))
                        MetaP("ACTIVE",row.active.toString(),Modifier.weight(1f))
                        MetaP("HIGH PRIORITY",row.urgent.toString(),Modifier.weight(1f))
                    }
                    Text("RMA ${row.rma}  ·  Unassigned ${row.unassigned}  ·  Recent 7 days ${row.recent7}",color=P.green,fontSize=10.sp)
                }
            }
        }
    }
}

@Composable
fun ParitySatisfactionScreen(state:MainUiState,onPeriod:(Int)->Unit,onOpenTicket:(Long)->Unit){
    val data=state.snapshot
    var filter by rememberSaveable{mutableStateOf("all")}
    val list=remember(data,state.periodDays) {data?.satisfaction.orEmpty().filter {
        val date=it.optString("created_at").ifBlank{it.optString("updated_at")}
        SupportAnalytics.inPeriod(date,state.periodDays)
    }.sortedByDescending { whenDate(it.optString("created_at")) }}
    val good=remember(list){list.count{it.optString("score").equals("good",true)}}
    val bad=remember(list){list.count{it.optString("score").equals("bad",true)}}
    val commentCount=remember(list){list.count{it.optString("comment").isNotBlank()}}
    val visible=remember(list,filter){list.filter{filter=="all"||it.optString("score").equals(filter,true)}}
    val ticketMap=remember(data){data?.tickets.orEmpty().associateBy{it.id}}
    LazyColumn(Modifier.fillMaxSize(),verticalArrangement=Arrangement.spacedBy(10.dp),contentPadding=PaddingValues(bottom=30.dp)){
        item { HeadingP("CUSTOMER EXPERIENCE","Satisfaction","Ratings and comments from the saved Zendesk snapshot")
            PeriodP(state.periodDays,onPeriod)
        }
        if(data==null)item{EmptyP("No saved satisfaction snapshot.")}
        else if(!data.satisfactionLoaded)item{EmptyP(data.satisfactionWarning?:"Ratings were not loaded by the API.")}
        else {
            item { Row(horizontalArrangement=Arrangement.spacedBy(8.dp)){
                StatP("Total ratings",list.size.toString(),"90-day filtered","mint",Modifier.weight(1f)){filter="all"}
                StatP("Good",good.toString(),"Positive reviews","cyan",Modifier.weight(1f)){filter="good"}
                StatP("Bad",bad.toString(),"Negative reviews","white",Modifier.weight(1f)){filter="bad"}
            } }
            item{PanelP{
                Text("Customer comments",color=P.ink,fontWeight=FontWeight.ExtraBold,fontSize=14.sp)
                Text("$commentCount of ${list.size} ratings include a written comment",color=P.muted,fontSize=11.sp)
            }}
            item{ChipsP(listOf("all","good","bad"),filter){filter=it};SectionP("Ratings · ${visible.size}")}
            if(visible.isEmpty())item{EmptyP("No ratings match the selected date and score filter.")}
            else itemsIndexed(visible) { index, rating ->
                val id=rating.optLong("ticket_id")
                val t=ticketMap[id]
                PanelP {
                    Row(verticalAlignment=Alignment.CenterVertically){
                        BadgeP(rating.optString("score").uppercase(Locale.ROOT),rating.optString("score").equals("bad",true))
                        Spacer(Modifier.weight(1f));Text("#${if(id>0)id else "—"}",fontSize=11.sp,color=P.green)
                    }
                    Text(t?.subject?:"Ticket subject unavailable",fontSize=13.sp,color=P.ink,fontWeight=FontWeight.Bold,maxLines=2)
                    Text(rating.optString("comment").ifBlank{"No written comment"},color=P.muted,fontSize=11.sp,lineHeight=16.sp,maxLines=5)
                    Text(SupportAnalytics.shortDate(rating.optString("created_at")),color=P.muted,fontSize=10.sp)
                    if(t!=null)TextButton(onClick={onOpenTicket(id)}){Text("Open ticket ›")}
                }
            }
        }
    }
}

@Composable
fun ParityDeviceDetailScreen(state:MainUiState,onBack:()->Unit,onOpenTicket:(Long)->Unit,onPeriod:(Int)->Unit){
    val data=state.snapshot
    val device=state.selectedDevice.orEmpty()
    val tickets by produceState<List<Ticket>?>(null,data,device,state.periodDays){
        value=if(data==null)null else withContext(Dispatchers.Default){
            data.tickets.asSequence().filter{inDays(it,state.periodDays)}.filter{ticket->
                SupportAnalytics.dimensionValue(ticket,data,"device").split(',')
                    .any{it.trim().equals(device,true)}
            }.sortedByDescending{whenDate(it.updatedAt.ifBlank{it.createdAt})}.toList()
        }
    }
    LazyColumn(Modifier.fillMaxSize(),verticalArrangement=Arrangement.spacedBy(10.dp),contentPadding=PaddingValues(bottom=30.dp)) {
        item {
            TextButton(onClick=onBack){Text("‹ Back to devices")}
            val count = tickets?.size?.toString() ?: "…"
            HeadingP("DEVICE REPORT",device,"$count related tickets")
            PeriodP(state.periodDays, onPeriod)
        }
        if(data==null)item{EmptyP("No snapshot loaded.")}
        else if(tickets==null)item{PanelP{CircularProgressIndicator(Modifier.size(20.dp));Text("Preparing device detail",color=P.muted)}}
        else if(tickets!!.isEmpty())item{EmptyP("No tickets match this device and period.")}
        else items(tickets!!,key={it.id}){TicketP(it,data,onOpenTicket)}
    }
}

@Composable
fun ParityInsightsScreen(state:MainUiState,onPeriod:(Int)->Unit,onOpenTicket:(Long)->Unit){
    val data=state.snapshot
    var dim by rememberSaveable{mutableStateOf("Region")}
    val rows by produceState<List<Pair<String,Int>>?>(null,data,dim,state.periodDays){
        value=if(data==null)null else withContext(Dispatchers.Default){
            data.tickets.asSequence().filter{inDays(it,state.periodDays)}.map{ticket->
                val result=when(dim){
                    "Region"->regionName(ticket)
                    "Device"->SupportAnalytics.dimensionValue(ticket,data,"device")
                    "Category"->SupportAnalytics.dimensionValue(ticket,data,"category")
                    "Fault"->SupportAnalytics.dimensionValue(ticket,data,"fault")
                    "Status"->ticket.status
                    "Priority"->ticket.priority
                    "Form"->SupportAnalytics.lookup(data.forms,ticket.formId)
                    "Group"->SupportAnalytics.lookup(data.groups,ticket.groupId)
                    "Agent"->SupportAnalytics.lookup(data.agents,ticket.assigneeId?.toLongOrNull())
                    else->""
                }
                result.ifBlank{"Unclassified"}
            }.groupingBy{it}.eachCount().entries.map{it.key to it.value}.sortedByDescending{it.second}.take(60).toList()
        }
    }
    val inPeriodCount=remember(data,state.periodDays){data?.tickets.orEmpty().count{inDays(it,state.periodDays)}}
    LazyColumn(Modifier.fillMaxSize(),verticalArrangement=Arrangement.spacedBy(9.dp),contentPadding=PaddingValues(bottom=30.dp)){
        item{
            HeadingP("SUPPORT INTELLIGENCE","Insights","Historical analysis from the shared 90-day database snapshot")
            PeriodP(state.periodDays,onPeriod)
            Row(horizontalArrangement=Arrangement.spacedBy(8.dp)){
                MetaP("TICKETS",inPeriodCount.toString(),Modifier.weight(1f))
                MetaP("FORMS",(data?.forms?.size?:0).toString(),Modifier.weight(1f))
                MetaP("FIELDS",(data?.fields?.size?:0).toString(),Modifier.weight(1f))
            }
            SectionP("Breakdown")
            ChipsP(listOf("Region","Device","Category","Fault","Status","Priority","Form","Group","Agent"),dim){dim=it}
        }
        if(data==null)item{EmptyP("Snapshot unavailable")}
        else if(rows==null)item{PanelP{CircularProgressIndicator(Modifier.size(20.dp));Text("Calculating $dim breakdown off the UI thread",color=P.muted)}}
        else if(rows!!.isEmpty())item{EmptyP("No values for $dim in the selected period")}
        else items(rows!!,key={it.first}){(name,count)->
            PanelP{
                Row(verticalAlignment=Alignment.CenterVertically){
                    Text(name,color=P.ink,fontWeight=FontWeight.Bold,fontSize=12.sp,modifier=Modifier.weight(1f))
                    Text(count.toString(),color=P.green,fontWeight=FontWeight.ExtraBold)
                }
                LinearProgressIndicator(progress={if(inPeriodCount>0)count.toFloat()/inPeriodCount else 0f},
                    modifier=Modifier.fillMaxWidth().height(7.dp),color=P.cyan,trackColor=P.mint)
            }
        }
        if(data!=null)item{PanelP{
            Text("Server metrics",color=P.ink,fontWeight=FontWeight.Bold)
            Text(if(data.metricsLoaded)"${data.metrics.size} metric records available" else (data.metricsWarning?:"Metrics unavailable"),
                color=P.muted,fontSize=11.sp)
        }}
    }
}

private data class AlertP(val severity:String,val title:String,val message:String,
                          val ids:List<Long>,val filter:String){val count get()=ids.size}
private fun buildAlertsP(data:SnapshotData,days:Int):List<AlertP>{
    val tickets=data.tickets.filter{inDays(it,days)}
    val ids=tickets.map{it.id}.toHashSet()
    val metricMap=data.metrics.associateBy{it.optLong("ticket_id")}
    val result=mutableListOf<AlertP>()
    fun add(level:String,title:String,message:String,selected:List<Long>,filter:String){
        if(selected.isNotEmpty())result.add(AlertP(level,title,message,selected.distinct(),filter))
    }
    if(data.slaLoaded)add("critical","SLA breached","Actual recorded Zendesk SLA breach events",
        data.slaEvents.filter{it.optString("type")=="breach" && it.optLong("ticket_id") in ids}
            .map{it.optLong("ticket_id")},"breached")
    if(data.metricsLoaded){
        add("critical","No first reply > 4 hours","Active tickets with zero recorded replies and age over four hours",
            tickets.filter{isActive(it)&&ageHours(it.createdAt)>=4&&metricMap[it.id]?.optInt("replies",-1)==0}.map{it.id},"no-reply")
    }
    add("warning","Waiting on customer > 4 hours","Pending tickets without recent ticket activity",
        tickets.filter{it.status.equals("pending",true)&&ageHours(it.updatedAt.ifBlank{it.createdAt})>=4}.map{it.id},"waiting")
    add("warning","Agent follow-up > 4 hours","New, open or hold tickets with no activity in four hours",
        tickets.filter{it.status.lowercase(Locale.ROOT) in setOf("new","open","hold")&&ageHours(it.updatedAt.ifBlank{it.createdAt})>=4}.map{it.id},"agent-followup")
    if(data.metricsLoaded){
        add("warning","First reply exceeded 4 hours","Recorded reply time exceeded 240 calendar minutes",
            data.metrics.filter{it.optLong("ticket_id") in ids &&
                (it.optJSONObject("reply_time_in_minutes")?.optDouble("calendar",0.0)?:0.0)>240.0}
                .map{it.optLong("ticket_id")},"slow-reply")
    }
    add("critical","Unsolved > 72 hours","Active tickets older than three days",
        tickets.filter{isActive(it)&&ageHours(it.createdAt)>=72}.map{it.id},"over72")
    add("warning","Unsolved > 24 hours","Active tickets aged 24-72 hours",
        tickets.filter{isActive(it)&&ageHours(it.createdAt) in 24..71}.map{it.id},"over24")
    add("warning","No activity > 24 hours","Active tickets without an update in 24 hours",
        tickets.filter{isActive(it)&&ageHours(it.updatedAt.ifBlank{it.createdAt})>=24}.map{it.id},"stale")
    if(data.metricsLoaded)add("warning","Reopened tickets","Tickets reopened at least once",
        data.metrics.filter{it.optLong("ticket_id") in ids && it.optInt("reopens",0)>0}
            .map{it.optLong("ticket_id")},"reopened")
    add("warning","High-priority queue","Active high/urgent support tickets",
        tickets.filter{isActive(it)&&SupportAnalytics.urgent(it)}.map{it.id},"priority")
    add("warning","Active unassigned tickets","Active tickets with no assignee",
        tickets.filter{isActive(it)&&it.assigneeId.isNullOrBlank()}.map{it.id},"unassigned")
    if(data.satisfactionLoaded)add("critical","Bad customer feedback","Bad satisfaction ratings connected to selected tickets",
        data.satisfaction.filter{it.optString("score").equals("bad",true)&&it.optLong("ticket_id") in ids}
            .map{it.optLong("ticket_id")},"bad-csat")
    return result.sortedBy{when(it.severity){"critical"->0;"warning"->1;else->2}}
}

@Composable
fun ParityAlertsScreen(state:MainUiState,onPeriod:(Int)->Unit,openTickets:(String)->Unit){
    val data=state.snapshot
    var level by rememberSaveable{mutableStateOf("all")}
    val alerts by produceState<List<AlertP>?>(null,data,state.periodDays){
        value=if(data==null)null else withContext(Dispatchers.Default){buildAlertsP(data,state.periodDays)}
    }
    val displayed=remember(alerts,level){alerts.orEmpty().filter{level=="all"||it.severity==level}}
    LazyColumn(Modifier.fillMaxSize(),verticalArrangement=Arrangement.spacedBy(10.dp),contentPadding=PaddingValues(bottom=30.dp)){
        item{
            HeadingP("MANAGER ALERTS","Operational signals","Reply delays, customer waits, stale activity, priority, SLA and CSAT")
            PeriodP(state.periodDays,onPeriod)
        }
        if(data==null)item{EmptyP("No verified snapshot to evaluate alerts.")}
        else if(alerts==null)item{PanelP{CircularProgressIndicator(Modifier.size(20.dp));Text("Calculating manager alerts",color=P.muted)}}
        else{
            item{
                Row(horizontalArrangement=Arrangement.spacedBy(8.dp)){
                    StatP("Critical",alerts!!.count{it.severity=="critical"}.toString(),"Urgent risk signals","white",Modifier.weight(1f)){level="critical"}
                    StatP("Warning",alerts!!.count{it.severity=="warning"}.toString(),"Needs attention","lime",Modifier.weight(1f)){level="warning"}
                    StatP("Info",alerts!!.count{it.severity=="info"}.toString(),"Informational","cyan",Modifier.weight(1f)){level="info"}
                }
                ChipsP(listOf("all","critical","warning","info"),level){level=it}
                SectionP("Active signals · ${displayed.size}")
            }
            if(displayed.isEmpty())item{EmptyP("No alerts match the selected severity and date range.")}
            else items(displayed,key={it.filter}){row->
                Card(onClick={openTickets(row.filter)},shape=RoundedCornerShape(17.dp),
                    colors=CardDefaults.cardColors(containerColor=Color.White),border=BorderStroke(1.dp,P.line)){
                    Row(Modifier.fillMaxWidth()){
                        Box(Modifier.width(5.dp).heightIn(min=130.dp).background(when(row.severity){"critical"->P.danger;"warning"->P.orange;else->P.cyan}))
                        Column(Modifier.weight(1f).padding(14.dp),verticalArrangement=Arrangement.spacedBy(8.dp)){
                            Row(verticalAlignment=Alignment.CenterVertically){
                                Text(row.title,color=P.ink,fontWeight=FontWeight.ExtraBold,modifier=Modifier.weight(1f),fontSize=13.sp)
                                BadgeP(row.severity.uppercase(Locale.ROOT),row.severity=="critical")
                            }
                            Text(row.message,color=P.muted,fontSize=11.sp)
                            Text("${row.count} tickets  ·  View tickets ›",color=P.green,fontWeight=FontWeight.Bold,fontSize=11.sp)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ParityProfileScreen(state:MainUiState,onRefresh:()->Unit,onClearCache:()->Unit,onLogout:()->Unit){
    val user=state.session?.user
    val workspace=state.session?.workspace
    LazyColumn(Modifier.fillMaxSize(),verticalArrangement=Arrangement.spacedBy(10.dp),contentPadding=PaddingValues(bottom=35.dp)){
        item{HeadingP("ACCOUNT SETTINGS","Account","Manager access and local data controls")}
        if(user==null||workspace==null)item{EmptyP("Sign in to view your account.")}
        else{
            item{PanelP{
                Text(user.displayName,color=P.ink,fontSize=21.sp,fontWeight=FontWeight.ExtraBold)
                Text(user.email,color=P.muted,fontSize=12.sp)
                BadgeP("${user.role.ifBlank { "Manager" }.uppercase(Locale.ROOT)} · READ ONLY")
            }}
            item{SectionP("Workspace")
                PanelP{
                    Row(verticalAlignment=Alignment.CenterVertically){Text("Workspace",color=P.muted,modifier=Modifier.weight(1f));Text(workspace.name,color=P.ink,fontWeight=FontWeight.Bold)}
                    Row(verticalAlignment=Alignment.CenterVertically){Text("Workspace ID",color=P.muted,modifier=Modifier.weight(1f));Text(workspace.slug,color=P.ink,fontWeight=FontWeight.Bold)}
                    Text("Data source: saved Zendesk snapshot",color=P.muted,fontSize=12.sp)
                    Text("Read-only manager view",color=P.muted,fontSize=12.sp)
                }
            }
            item{SectionP("Data sync","Only checks for a completed server snapshot; does not trigger Zendesk imports")
                PanelP{
                    Text("Server status: ${state.snapshot?.meta?.syncStatus?:"Unavailable"}",color=P.ink,fontWeight=FontWeight.Bold)
                    Text("Last sync: ${state.snapshot?.meta?.syncedAt?:"Not yet"}",color=P.muted,fontSize=11.sp)
                    if(state.cached)Text("Encrypted offline copy in use",color=P.orange,fontSize=11.sp)
                    Button(onClick=onRefresh,enabled=!state.refreshing,colors=ButtonDefaults.buttonColors(containerColor=P.green)){
                        Text(if(state.refreshing)"Checking for updates…" else "Refresh App Snapshot")
                    }
                    OutlinedButton(onClick=onClearCache){Text("Clear encrypted offline cache")}
                }
            }
            item{SectionP("Security")
                PanelP{
                    Text("Session and offline report are stored using Android Keystore encryption.",color=P.muted,fontSize=11.sp)
                    Text("Backend API access is scoped to your current workspace.",color=P.muted,fontSize=11.sp)
                }
            }
            item{OutlinedButton(onClick=onLogout,modifier=Modifier.fillMaxWidth(),border=BorderStroke(1.dp,Color(0xFFF1CFCF))){
                Text("Log out",color=P.danger,fontWeight=FontWeight.ExtraBold)
            }}
        }
    }
}
