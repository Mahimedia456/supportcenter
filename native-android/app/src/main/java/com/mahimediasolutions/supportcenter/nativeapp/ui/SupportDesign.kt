package com.mahimediasolutions.supportcenter.nativeapp.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import java.util.Locale

/** Tokens are transcribed from the original Expo src/constants/final-theme.ts. */
internal object ScDesign {
    val background = Color(0xFFF7FBF9)
    val surface = Color.White
    val surfaceSoft = Color(0xFFF2F8F5)
    val ink = Color(0xFF102321)
    val muted = Color(0xFF516A66)
    val primary = Color(0xFF0A7B61)
    val primaryDark = Color(0xFF075B4A)
    val mint = Color(0xFFE7F6F0)
    val cyan = Color(0xFF14BFC7)
    val cyanSoft = Color(0xFFE8FAFB)
    val lime = Color(0xFF8BE21D)
    val limeSoft = Color(0xFFF3F9DF)
    val border = Color(0xFFDCE9E4)
    val danger = Color(0xFFC84B4B)
    val warning = Color(0xFFB57A1F)
}

@Composable
internal fun ScSectionHeading(title: String, detail: String, eyebrow: String = "SUPPORT CENTER") {
    Column(Modifier.fillMaxWidth().padding(top = 15.dp, bottom = 11.dp)) {
        Text(eyebrow, color = ScDesign.primaryDark, fontSize = 10.sp,
            fontWeight = FontWeight.ExtraBold, letterSpacing = 1.4.sp)
        Spacer(Modifier.height(6.dp))
        Text(title, color = ScDesign.ink, fontSize = 27.sp, lineHeight = 33.sp,
            fontWeight = FontWeight.ExtraBold, letterSpacing = (-0.6).sp)
        Spacer(Modifier.height(5.dp))
        Text(detail, color = ScDesign.muted, fontSize = 12.sp, lineHeight = 18.sp)
    }
}

@Composable
internal fun ScPanel(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = ScDesign.surface),
        border = BorderStroke(1.dp, ScDesign.border),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(Modifier.fillMaxWidth().padding(17.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp), content = content)
    }
}

@Composable
internal fun ScMetricTile(name: String, value: String, note: String, modifier: Modifier = Modifier) {
    val title = name.lowercase(Locale.ROOT)
    val bg = when {
        title.contains("open") || title.contains("active") -> ScDesign.cyanSoft
        title.contains("priority") || title.contains("high") -> ScDesign.limeSoft
        title.contains("unassigned") -> ScDesign.surface
        else -> Color(0xFFEEF8F3)
    }
    val accent = when {
        title.contains("open") || title.contains("active") -> Color(0xFF0998A7)
        title.contains("priority") || title.contains("high") -> Color(0xFF6E8F21)
        else -> ScDesign.primaryDark
    }
    Card(
        modifier = modifier.heightIn(min = 148.dp),
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = bg),
        border = BorderStroke(1.dp, ScDesign.border)
    ) {
        Column(Modifier.fillMaxWidth().padding(17.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(name, color = ScDesign.muted, fontSize = 11.sp,
                    fontWeight = FontWeight.ExtraBold, modifier = Modifier.weight(1f), maxLines = 2)
                Text("›", color = accent, fontSize = 20.sp, fontWeight = FontWeight.ExtraBold)
            }
            Spacer(Modifier.height(4.dp))
            Text(value, color = accent, fontSize = 32.sp, lineHeight = 38.sp,
                fontWeight = FontWeight.ExtraBold)
            Text(note, color = ScDesign.muted, fontSize = 10.sp, lineHeight = 14.sp,
                maxLines = 2, overflow = TextOverflow.Ellipsis)
        }
    }
}

@Composable
internal fun ScPill(label: String, background: Color = ScDesign.mint,
                    foreground: Color = ScDesign.primaryDark) {
    Text(label, modifier = Modifier.background(background, CircleShape)
        .padding(horizontal = 10.dp, vertical = 6.dp),
        color = foreground, fontSize = 9.sp,
        fontWeight = FontWeight.ExtraBold, maxLines = 1)
}

@Composable
internal fun ScEmptyState(message: String) {
    ScPanel {
        Text("No matching information", color = ScDesign.ink,
            fontSize = 15.sp, fontWeight = FontWeight.ExtraBold)
        Text(message, color = ScDesign.muted, fontSize = 12.sp, lineHeight = 19.sp)
    }
}

@Composable
internal fun ScPeriodRow(days: Int, onChange: (Int) -> Unit) {
    Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        listOf(1 to "Today", 7 to "7 Days", 30 to "30 Days", 90 to "90 Days")
            .forEach { (period, label) ->
                val selected = period == days
                FilterChip(
                    selected = selected, onClick = { onChange(period) },
                    label = { Text(label, fontSize = 11.sp, fontWeight = FontWeight.Bold) },
                    shape = RoundedCornerShape(100.dp),
                    colors = FilterChipDefaults.filterChipColors(
                        containerColor = Color.White,
                        labelColor = ScDesign.muted,
                        selectedContainerColor = ScDesign.mint,
                        selectedLabelColor = ScDesign.primaryDark
                    ),
                    border = BorderStroke(1.dp,
                        if (selected) ScDesign.primary else ScDesign.border)
                )
            }
    }
}
