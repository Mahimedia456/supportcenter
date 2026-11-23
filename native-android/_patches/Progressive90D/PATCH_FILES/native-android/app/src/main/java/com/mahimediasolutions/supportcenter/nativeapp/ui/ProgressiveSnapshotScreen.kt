package com.mahimediasolutions.supportcenter.nativeapp.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.Alignment
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private val Teal = Color(0xFF08785D)
private val Ink = Color(0xFF142B28)
private val Subtle = Color(0xFF58716B)

@Composable
fun ProgressiveSyncStrip(state: MainUiState) {
    if (!state.refreshing) return
    Column(
        Modifier.fillMaxWidth().padding(bottom = 10.dp)
            .background(Color(0xFFE9F8F1), RoundedCornerShape(15.dp))
            .padding(horizontal = 13.dp, vertical = 10.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text("Updating 90-day snapshot", color = Ink, fontWeight = FontWeight.Bold, fontSize = 12.sp)
            Text(state.snapshotStage.ifBlank { "Connecting" }, color = Teal, fontSize = 11.sp)
        }
        LinearProgressIndicator(Modifier.fillMaxWidth(), color = Teal)
        val n = state.snapshotItemsReceived
        val description = if (n > 0) "${state.snapshotStageDetail} · $n received"
            else state.snapshotStageDetail.ifBlank { "Contacting secure API" }
        Text(description, color = Subtle, fontSize = 11.sp, maxLines = 2)
        if (state.snapshot != null)
            Text("Showing last complete report until the latest version passes validation.", color = Subtle, fontSize = 10.sp)
    }
}

/** First installation: show arriving ticket previews while keeping KPI totals hidden. */
@Composable
fun NativeProgressiveSnapshotScreen(state: MainUiState) {
    LazyColumn(
        Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(9.dp),
        contentPadding = PaddingValues(bottom = 25.dp)
    ) {
        item {
            Column(verticalArrangement = Arrangement.spacedBy(7.dp)) {
                Text("Support at a glance", fontSize = 25.sp, color = Ink, fontWeight = FontWeight.ExtraBold)
                Text("Preparing the full 90-day report", fontSize = 13.sp, color = Subtle)
                Text("Ticket previews appear early. Final KPI and analytics totals unlock only after all pages are checked.",
                    fontSize = 12.sp, color = Subtle)
            }
        }
        if (state.previewTickets.isEmpty()) item {
            Card(colors = CardDefaults.cardColors(containerColor = Color.White)) {
                Column(Modifier.fillMaxWidth().padding(18.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    CircularProgressIndicator(Modifier.size(24.dp), color = Teal)
                    Text("Waiting for first ticket page", color = Ink, fontSize = 14.sp)
                }
            }
        }
        else {
            item {
                Text("Ticket preview · ${state.snapshotItemsReceived} downloaded, total not final",
                    fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Ink)
            }
            items(state.previewTickets, key = { it.id }) { ticket ->
                Card(colors = CardDefaults.cardColors(containerColor = Color.White),
                    shape = RoundedCornerShape(16.dp), modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                        Text("#${ticket.id} · ${ticket.status.uppercase()}", color = Teal, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        Text(ticket.subject, color = Ink, fontWeight = FontWeight.SemiBold,
                            maxLines = 2, overflow = TextOverflow.Ellipsis, fontSize = 14.sp)
                        Text("Read-only preview · full details when synchronization completes", color = Subtle, fontSize = 10.sp)
                    }
                }
            }
        }
    }
}
