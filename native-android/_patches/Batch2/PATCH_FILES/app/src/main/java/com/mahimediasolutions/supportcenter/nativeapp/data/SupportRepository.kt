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
            val (page, next) = api.snapshotPartPage(s.accessToken, s.workspace.slug, name, offset)
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
        return SnapshotData(
            meta, tickets, fields, forms, agents, groups, events,
            slaLoaded = slaResult.isSuccess,
            slaWarning = slaResult.exceptionOrNull()?.message?.take(160)
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

    fun logout(s: SupportSession) {
        secure.delete("session.dat")
        secure.deleteCaches()
        api.logout(s)
    }
}
