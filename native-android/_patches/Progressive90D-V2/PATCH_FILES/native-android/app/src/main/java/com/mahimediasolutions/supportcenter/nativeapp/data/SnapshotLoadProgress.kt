package com.mahimediasolutions.supportcenter.nativeapp.data

/** Progress is informational: a ticket preview is NOT the complete 90-day analytics dataset. */
internal data class SnapshotLoadProgress(
    val stage: String,
    val detail: String = "",
    val received: Int = 0,
    val previewTickets: List<Ticket> = emptyList(),
    val cachedSnapshot: SnapshotData? = null
)
