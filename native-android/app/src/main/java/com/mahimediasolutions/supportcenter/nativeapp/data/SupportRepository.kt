package com.mahimediasolutions.supportcenter.nativeapp.data

import android.content.Context
import org.json.JSONObject

internal data class LoadedSnapshot(
    val session: SupportSession,
    val data: SnapshotData?,
    val fromCache: Boolean,
    val error: String?
)

internal data class LoadedConversation(
    val session: SupportSession,
    val conversation: TicketConversation?
)

/** All network/disk functions are dispatched from IO by the ViewModel. */
internal class SupportRepository(context: Context) {
    private val api = SupportApi()
    private val secure = SecureFiles(context.applicationContext)

    fun login(email: String, password: String): SupportSession = api.login(email, password).also {
        require(it.workspace.slug == "atomos" || it.workspace.slug == "angelbird") { "Unsupported workspace" }
        secure.write("session.dat", it.toJson().toString())
    }

    fun restoreSession(): SupportSession? {
        val raw = secure.read("session.dat") ?: return null
        return try {
            val existing = SupportSession.fromJson(JSONObject(raw))
            val next = api.refresh(existing.refreshToken)
            verifyAccount(existing, next)
            secure.write("session.dat", next.toJson().toString())
            next
        } catch (e: HttpProblem) {
            if (e.httpStatus == 401 || e.httpStatus == 403) {
                secure.delete("session.dat")
                null
            } else existingFallback(raw)
        } catch (_: Exception) { existingFallback(raw) }
    }

    private fun verifyAccount(previous: SupportSession, refreshed: SupportSession) {
        require(previous.user.id == refreshed.user.id &&
            previous.workspace.slug == refreshed.workspace.slug &&
            previous.workspace.id == refreshed.workspace.id) { "Session workspace changed" }
    }

    private fun existingFallback(raw: String): SupportSession? =
        try { SupportSession.fromJson(JSONObject(raw)) } catch (_: Exception) { null }

    private fun cacheName(s: SupportSession): String {
        val safeId = s.user.id.replace(Regex("[^a-zA-Z0-9_-]"), "_")
        return "snapshot-${s.workspace.slug}-$safeId.dat"
    }

    private fun readCache(s: SupportSession): SnapshotData? = try {
        secure.read(cacheName(s))?.let { SnapshotData.fromJson(JSONObject(it)) }?.takeIf {
            it.meta.workspace == s.workspace.slug
        }
    } catch (_: Exception) { null }

    /** A complete part must finish; never represent a partial page set as complete. */
    private fun fetchPart(s: SupportSession, name: String, maxPages: Int = 200): List<JSONObject> {
        val rows = ArrayList<JSONObject>()
        var offset = 0
        for (pageIndex in 1..maxPages) {
            val (page, next) = api.snapshotPartPage(s.accessToken, s.workspace.slug, name, offset, 60)
            rows.addAll(page)
            if (next == null) return rows
            offset = next
        }
        throw IllegalStateException("Snapshot '$name' exceeded $maxPages pages")
    }

    private fun fetchData(s: SupportSession): SnapshotData {
        val meta = api.snapshotMeta(s.accessToken)
        if (meta.workspace != s.workspace.slug) throw IllegalStateException("Snapshot workspace mismatch")
        if (meta.snapshotStatus != "ready") throw IllegalStateException("Snapshot not imported yet. Run server sync first.")
        val tickets = fetchPart(s, "tickets").map(Ticket::fromJson).filter { it.id > 0L }
        val fields = fetchPart(s, "fields").map(ReferenceField::fromJson)
        val forms = fetchPart(s, "forms").map(LookupItem::fromJson)
        val agents = fetchPart(s, "agents").map(LookupItem::fromJson)
        val groups = fetchPart(s, "groups").map(LookupItem::fromJson)
        // SLA event stream is a supplemental view: a failure must never hide the primary tickets.
        // This endpoint exposes only breach-type events, not the entire raw event stream.
        val slaResult = runCatching { fetchPart(s, "metric-events", maxPages = 40) }
        val events = slaResult.getOrNull().orEmpty()
        // Rating and metric pages are optional supplements; ticket availability is primary.
        // An unavailable part is never silently described as zero ratings or zero metrics.
        val ratingsResult = runCatching { fetchPart(s, "satisfaction", maxPages = 120) }
        val metricsResult = runCatching { fetchPart(s, "metrics", maxPages = 120) }
        return SnapshotData(
            meta, tickets, fields, forms, agents, groups, events,
            slaLoaded = slaResult.isSuccess,
            slaWarning = slaResult.exceptionOrNull()?.message?.take(160),
            satisfaction = ratingsResult.getOrNull().orEmpty(),
            metrics = metricsResult.getOrNull().orEmpty(),
            satisfactionLoaded = ratingsResult.isSuccess,
            metricsLoaded = metricsResult.isSuccess,
            satisfactionWarning = ratingsResult.exceptionOrNull()?.message?.take(160),
            metricsWarning = metricsResult.exceptionOrNull()?.message?.take(160)
        )
    }

    private fun <T> withAccessRefresh(session: SupportSession,
                                      operation: (SupportSession) -> T): Pair<SupportSession, T> {
        return try { session to operation(session) }
        catch (e: HttpProblem) {
            if (e.httpStatus != 401) throw e
            val next = api.refresh(session.refreshToken)
            verifyAccount(session, next)
            secure.write("session.dat", next.toJson().toString())
            next to operation(next)
        }
    }

    fun loadSnapshot(session: SupportSession): LoadedSnapshot {
        return try {
            val (current, data) = withAccessRefresh(session) { fetchData(it) }
            secure.write(cacheName(current), data.toJson().toString())
            LoadedSnapshot(current, data, false, null)
        } catch (e: Exception) {
            val cached = readCache(session)
            LoadedSnapshot(session, cached, cached != null, e.message ?: "Network error")
        }
    }

    fun loadConversation(session: SupportSession, ticketId: Long): LoadedConversation {
        require(ticketId > 0L)
        val (current, result) = withAccessRefresh(session) {
            api.ticketConversation(it.accessToken, ticketId, it.workspace.slug)
        }
        return LoadedConversation(current, result)
    }

    /** Clear snapshot cache only. Keep the logged-in session intact. */
    fun clearOfflineCache() { secure.deleteCaches() }

    fun logout(s: SupportSession) {
        secure.delete("session.dat")
        secure.deleteCaches()
        api.logout(s)
    }


    /**
     * Streaming, read-only loading. Never cache partial pages or label them as complete.
     * Only the last verified published server version becomes a SnapshotData.
     * The callback runs on the caller's coroutine context, not the IO thread.
     */
    suspend fun loadSnapshotProgressive(
        session: SupportSession,
        emit: suspend (SnapshotLoadProgress) -> Unit
    ): LoadedSnapshot {
        var current = session
        val cached = kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) { readCache(session) }
        if (cached != null) {
            emit(SnapshotLoadProgress(stage = "Saved snapshot", detail = "Showing last complete 90-day report", cachedSnapshot = cached))
        }
        try {
            var response = kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) {
                withAccessRefresh(current) { api.snapshotMeta(it.accessToken) }
            }
            current = response.first
            val initialMeta = response.second
            if (initialMeta.workspace != current.workspace.slug) {
                throw IllegalStateException("Snapshot workspace mismatch")
            }
            if (initialMeta.snapshotStatus != "ready" || initialMeta.syncStatus != "ok" || initialMeta.syncedAt.isNullOrBlank()) {
                throw IllegalStateException(
                    if (initialMeta.syncStatus == "syncing")
                        "Server snapshot is syncing. Keeping the previous complete report until publication."
                    else "Complete server snapshot is not ready yet (status: ${initialMeta.syncStatus})."
                )
            }
            if (cached != null && cached.meta.syncedAt == initialMeta.syncedAt &&
                cached.meta.syncStatus == "ok" && cached.slaLoaded &&
                cached.satisfactionLoaded && cached.metricsLoaded) {
                emit(SnapshotLoadProgress(stage = "Up to date", detail = "Latest published server version verified", cachedSnapshot = cached))
                return LoadedSnapshot(current, cached, false, null)
            }

            // Every part is bounded, authenticated, and paginated. Ticket previews are not KPI totals.
            suspend fun part(
                name: String,
                maxPages: Int,
                onPage: suspend (List<org.json.JSONObject>, Int, Boolean) -> Unit = { _, _, _ -> }
            ): List<org.json.JSONObject> {
                val all = ArrayList<org.json.JSONObject>()
                var offset = 0
                for (page in 1..maxPages) {
                    val fetched = kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) {
                        withAccessRefresh(current) { s ->
                            api.snapshotPartPage(s.accessToken, s.workspace.slug, name, offset, if (name == "tickets") 40 else 60)
                        }
                    }
                    current = fetched.first
                    val (items, next) = fetched.second
                    all.addAll(items)
                    if (all.size > 50_000) throw IllegalStateException("Part $name unexpectedly large")
                    onPage(items, all.size, next == null)
                    if (next == null) return all
                    offset = next
                }
                throw IllegalStateException("Part $name exceeded $maxPages pages")
            }

            val ticketRows = ArrayList<Ticket>()
            part("tickets", 300) { page, _, done ->
                ticketRows.addAll(page.map(Ticket::fromJson).filter { it.id > 0L })
                emit(SnapshotLoadProgress(
                    stage = "Tickets", detail = if (done) "Ticket pages complete" else "Reading 90-day ticket pages",
                    received = ticketRows.size,
                    // Keep only a few preview rows so Compose does not recompose thousands repeatedly.
                    previewTickets = ticketRows.takeLast(12),
                    cachedSnapshot = cached
                ))
            }
            val fields = part("fields", 30).map(ReferenceField::fromJson)
            emit(SnapshotLoadProgress("Custom fields", "Ticket classifications and device fields", fields.size, cachedSnapshot = cached))
            val forms = part("forms", 30).map(LookupItem::fromJson)
            val agents = part("agents", 30).map(LookupItem::fromJson)
            val groups = part("groups", 30).map(LookupItem::fromJson)
            emit(SnapshotLoadProgress("Reference data", "Forms, agents and groups loaded", fields.size + forms.size + agents.size + groups.size, cachedSnapshot = cached))

            // Supplemental parts may be unavailable, but must never silently be treated as real zeros.
            val slaResult = runCatching { part("metric-events", 850) }
            emit(SnapshotLoadProgress("SLA events", "Server-filtered breach events", slaResult.getOrNull()?.size ?: 0, cachedSnapshot = cached))
            val satisfactionResult = runCatching {
                part("satisfaction", 150) { _, received, _ ->
                    emit(SnapshotLoadProgress("Satisfaction", "Loading ratings", received, cachedSnapshot = cached))
                }
            }
            val metricsResult = runCatching {
                part("metrics", 150) { _, received, _ ->
                    emit(SnapshotLoadProgress("Analytics", "Loading historical ticket metrics", received, cachedSnapshot = cached))
                }
            }

            // Prevent mixing pages from two different hourly GitHub sync versions.
            response = kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) {
                withAccessRefresh(current) { api.snapshotMeta(it.accessToken) }
            }
            current = response.first
            val finalMeta = response.second
            if (finalMeta.workspace != initialMeta.workspace ||
                finalMeta.syncedAt != initialMeta.syncedAt ||
                finalMeta.syncStatus != "ok" || finalMeta.snapshotStatus != "ready") {
                throw IllegalStateException("Server published or started another sync during download. Previous complete snapshot kept; refresh again.")
            }
            val data = SnapshotData(
                finalMeta, ticketRows.toList(), fields, forms, agents, groups,
                slaResult.getOrNull().orEmpty(),
                slaLoaded = slaResult.isSuccess,
                slaWarning = slaResult.exceptionOrNull()?.message?.take(160),
                satisfaction = satisfactionResult.getOrNull().orEmpty(),
                metrics = metricsResult.getOrNull().orEmpty(),
                satisfactionLoaded = satisfactionResult.isSuccess,
                metricsLoaded = metricsResult.isSuccess,
                satisfactionWarning = satisfactionResult.exceptionOrNull()?.message?.take(160),
                metricsWarning = metricsResult.exceptionOrNull()?.message?.take(160)
            )
            // A failed local cache write must not discard a successfully verified server report.
            val cacheProblem = kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) {
                runCatching { secure.write(cacheName(current), data.toJson().toString()) }.exceptionOrNull()
            }
            return LoadedSnapshot(current, data, false,
                cacheProblem?.let { "Report is live, but offline cache could not be updated" })
        } catch (e: Exception) {
            return LoadedSnapshot(current, cached, cached != null,
                e.message ?: "Snapshot refresh failed. Previous complete report preserved.")
        }
    }

}
