package com.mahimediasolutions.supportcenter.nativeapp.data

import com.mahimediasolutions.supportcenter.nativeapp.BuildConfig
import android.util.JsonReader
import android.util.JsonToken
import java.io.InputStreamReader
import java.io.IOException
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

class HttpProblem(val httpStatus: Int, message: String) : Exception(message)

/** Authenticated HTTPS only; the Android client never receives a Supabase/Zendesk secret. */
internal data class FastPublishedPeriod(val data: SnapshotData, val version: String, val period: String, val summary: JSONObject)

internal class SupportApi {
    private val base = BuildConfig.API_BASE_URL.trimEnd('/')

    private fun request(path: String, method: String = "GET", token: String? = null, payload: JSONObject? = null): JSONObject {
        require(path.startsWith('/'))
        require(base.startsWith("https://")) { "HTTPS API base URL required" }
        val connection = URL("$base$path").openConnection() as HttpURLConnection
        try {
            connection.requestMethod = method
            connection.connectTimeout = 20_000
            connection.readTimeout = 40_000
            connection.setRequestProperty("Accept", "application/json")
            connection.setRequestProperty("Cache-Control", "no-store")
            if (token != null) connection.setRequestProperty("Authorization", "Bearer $token")
            if (payload != null) {
                connection.doOutput = true
                connection.setRequestProperty("Content-Type", "application/json; charset=utf-8")
                connection.outputStream.use { it.write(payload.toString().toByteArray(Charsets.UTF_8)) }
            }
            val status = connection.responseCode
            val stream = if (status in 200..299) connection.inputStream else connection.errorStream
            val body = stream?.bufferedReader(Charsets.UTF_8)?.use { reader ->
                val buffer = CharArray(8192)
                val content = StringBuilder()
                while (true) {
                    val count = reader.read(buffer)
                    if (count < 0) break
                    if (content.length + count > 2_000_000) throw IOException("Non-paged API response exceeded 2 MB")
                    content.append(buffer, 0, count)
                }
                content.toString()
            } ?: "{}"
            val json = try { JSONObject(body) } catch (_: Exception) { JSONObject() }
            if (status !in 200..299) {
                // NestJS returns both {error:"Unauthorized", message:"Invalid email or password."}.
                // Prefer the specific message rather than hiding it behind the generic label.
                val detail = json.opt("message")
                val fromMessage = when (detail) {
                    is JSONArray -> (0 until detail.length()).joinToString(", ") { detail.optString(it) }
                    is String -> detail
                    else -> ""
                }
                val message = fromMessage.ifBlank {
                    json.optString("error").ifBlank { "Backend returned HTTP $status" }
                }
                throw HttpProblem(status, "${message.take(240)} (HTTP $status)")
            }
            return json
        } finally { connection.disconnect() }
    }

    fun login(email: String, password: String): SupportSession =
        SupportSession.fromJson(request("/auth/login", "POST", payload = JSONObject()
            .put("email", email.trim().lowercase()).put("password", password)))

    fun refresh(token: String): SupportSession =
        SupportSession.fromJson(request("/auth/refresh", "POST", payload = JSONObject().put("refreshToken", token)))

    fun logout(session: SupportSession) {
        try { request("/auth/logout", "POST", session.accessToken,
            JSONObject().put("refreshToken", session.refreshToken)) } catch (_: Exception) { }
    }

    fun snapshotMeta(token: String): SnapshotMeta =
        SnapshotMeta.fromJson(request("/api/zendesk-mobile-snapshot?part=meta", token = token))

    /**
     * Streaming, bounded JSON parser for large paged snapshots.
     * This deliberately bypasses request() (which reads the entire response into a String)
     * so a page is never duplicated as String + JSONObject + JSONArray.
     */
    private fun readJsonValue(r: JsonReader, depth: Int = 0): Any {
        if (depth > 32) throw IOException("Snapshot JSON nesting exceeded safety limit")
        return when (r.peek()) {
            JsonToken.BEGIN_OBJECT -> {
                val obj = JSONObject()
                r.beginObject()
                while (r.hasNext()) obj.put(r.nextName(), readJsonValue(r, depth + 1))
                r.endObject()
                obj
            }
            JsonToken.BEGIN_ARRAY -> {
                val arr = JSONArray()
                r.beginArray()
                while (r.hasNext()) arr.put(readJsonValue(r, depth + 1))
                r.endArray()
                arr
            }
            JsonToken.STRING -> r.nextString()
            JsonToken.NUMBER -> {
                val value = r.nextString()
                value.toLongOrNull() ?: value.toDoubleOrNull() ?: value
            }
            JsonToken.BOOLEAN -> r.nextBoolean()
            JsonToken.NULL -> { r.nextNull(); JSONObject.NULL }
            else -> throw IOException("Unexpected JSON token in snapshot response")
        }
    }

    /**
     * Keep every field that the currently implemented Kotlin screens/models consume.
     * The complete original source remains unmodified in Supabase. These are compact
     * phone-side projections, NOT changes to the 90-day backend dataset.
     */
    private fun mobileFields(part: String): List<String> = when (part) {
        "tickets" -> listOf("id", "subject", "status", "priority", "created_at",
            "updated_at", "description", "assignee_id", "requester_id", "group_id",
            "ticket_form_id", "type", "tags", "custom_fields")
        "metric-events" -> listOf("ticket_id", "type", "time", "created_at", "updated_at")
        "metrics" -> listOf("ticket_id", "replies", "reopens", "reply_time_in_minutes")
        "satisfaction" -> listOf("id", "ticket_id", "score", "comment", "created_at", "updated_at")
        "fields" -> listOf("id", "title", "raw_title", "description", "active",
            "custom_field_options", "system_field_options")
        "forms", "agents", "groups" -> listOf("id", "name", "display_name")
        else -> throw IllegalArgumentException("Invalid snapshot part")
    }

    private fun compactItem(part: String, original: JSONObject): JSONObject {
        val projected = JSONObject()
        for (name in mobileFields(part)) {
            if (original.has(name)) projected.put(name, original.opt(name))
        }
        return projected
    }

    /** Workspace isolation, bounded pagination and streaming response parsing. */
    fun snapshotPartPage(token: String, workspace: String, part: String,
                         offset: Int, limit: Int = 60, periodDays: Int = 90, version: String? = null): Pair<List<JSONObject>, Int?> {
        require(part in setOf("tickets", "fields", "forms", "groups", "agents", "metric-events", "satisfaction", "metrics"))
        require(offset >= 0 && limit in 1..100)
        val period = if (periodDays == 1) "today" else periodDays.toString()
        require(period in setOf("today", "7", "30", "60", "90"))
        val versionQuery = version?.let { "&version=" + java.net.URLEncoder.encode(it, "UTF-8") } ?: ""
        val path = "/api/zendesk-mobile-snapshot?part=$part&period=$period&offset=$offset&limit=$limit$versionQuery"
        val connection = URL("$base$path").openConnection() as HttpURLConnection
        try {
            connection.requestMethod = "GET"
            connection.connectTimeout = 20_000
            connection.readTimeout = 40_000
            connection.setRequestProperty("Accept", "application/json")
            connection.setRequestProperty("Cache-Control", "no-store")
            connection.setRequestProperty("Authorization", "Bearer $token")
            val status = connection.responseCode
            if (status !in 200..299) {
                val detail = connection.errorStream?.bufferedReader(Charsets.UTF_8)?.use { reader ->
                    val block = CharArray(2048)
                    val count = reader.read(block)
                    if (count > 0) String(block, 0, count) else ""
                } ?: ""
                val error = runCatching { JSONObject(detail) }.getOrNull()
                val message = error?.optString("message")?.ifBlank { error.optString("error") }
                    ?: "Snapshot backend HTTP $status"
                throw HttpProblem(status, message.take(200))
            }
            var responseWorkspace: String? = null
            var responsePart: String? = null
            var done: Boolean? = null
            var nextOffset: Int? = null
            var foundItems = false
            val rows = ArrayList<JSONObject>(limit)
            connection.inputStream.use { stream ->
                JsonReader(InputStreamReader(stream, Charsets.UTF_8)).use { reader ->
                    reader.isLenient = false
                    reader.beginObject()
                    while (reader.hasNext()) {
                        when (reader.nextName()) {
                            "workspace" -> responseWorkspace = reader.nextString()
                            "part" -> responsePart = reader.nextString()
                            "done" -> done = reader.nextBoolean()
                            "nextOffset" -> {
                                nextOffset = if (reader.peek() == JsonToken.NULL) {
                                    reader.nextNull()
                                    null
                                } else reader.nextInt()
                            }
                            "items" -> {
                                if (foundItems) throw IOException("Duplicate items in snapshot page")
                                foundItems = true
                                reader.beginArray()
                                while (reader.hasNext()) {
                                    if (rows.size >= limit) throw IOException("Page exceeded requested $limit items")
                                    val value = readJsonValue(reader)
                                    if (value !is JSONObject) throw IOException("Malformed item in snapshot page")
                                    rows.add(compactItem(part, value))
                                }
                                reader.endArray()
                            }
                            else -> reader.skipValue()
                        }
                    }
                    reader.endObject()
                }
            }
            if (responseWorkspace != workspace || responsePart != part || !foundItems || done == null) {
                throw IOException("Snapshot page metadata or workspace mismatch")
            }
            if (done == true) return rows to null
            val next = nextOffset ?: throw IOException("Missing snapshot page cursor")
            if (next <= offset || next > 1_000_000) throw IOException("Non-progressing snapshot cursor")
            return rows to next
        } finally { connection.disconnect() }
    }

    /** Legacy signature retained for Batch 1 tests; Batch 2 uses snapshotPartPage. */
    fun ticketPage(token: String, offset: Int, limit: Int = 150): Pair<List<Ticket>, Int?> {
        val response = request("/api/zendesk-cache-snapshot?part=tickets&offset=$offset&limit=$limit", token = token)
        val arr = response.optJSONArray("items") ?: JSONArray()
        val rows = (0 until arr.length()).mapNotNull { arr.optJSONObject(it)?.let(Ticket::fromJson) }
        val next = if (response.optBoolean("done", false)) null
            else response.optInt("nextOffset", -1).takeIf { it > offset }
        return rows to next
    }

    /** Cheap version check; a cached report needs no body download. */
    fun fastPublishedVersion(token: String, workspace: String, days: Int): String {
        val period = if (days == 1) "today" else days.toString()
        val meta = request("/api/zendesk-mobile-period?period=$period&meta=1", token = token)
        if (meta.optString("workspace") != workspace || meta.optString("snapshotStatus") != "ready")
            throw IOException("Published meta workspace mismatch")
        return meta.getString("version")
    }

    /** One authenticated read from the committed period table, never an import. */
    fun fastPublishedPeriod(token: String, workspace: String, days: Int): FastPublishedPeriod {
        val period = if (days == 1) "today" else days.toString()
        require(period in setOf("today", "30", "60", "90"))
        val connection = URL("$base/api/zendesk-mobile-period?period=$period").openConnection() as HttpURLConnection
        try {
            connection.requestMethod = "GET"
            connection.connectTimeout = 20_000
            connection.readTimeout = 50_000
            connection.setRequestProperty("Accept", "application/json")
            connection.setRequestProperty("Accept-Encoding", "gzip")
            connection.setRequestProperty("Authorization", "Bearer $token")
            connection.setRequestProperty("Cache-Control", "no-store")
            val status = connection.responseCode
            if (status !in 200..299) {
                val detail = connection.errorStream?.bufferedReader(Charsets.UTF_8)?.use { it.readText().take(500) } ?: ""
                val error = runCatching { JSONObject(detail) }.getOrNull()
                throw HttpProblem(status, error?.optString("error")?.take(200) ?: "Published period HTTP $status")
            }
            val input = if (connection.contentEncoding?.contains("gzip", ignoreCase = true) == true)
                java.util.zip.GZIPInputStream(connection.inputStream) else connection.inputStream
            val root = input.use { stream ->
                JsonReader(InputStreamReader(stream, Charsets.UTF_8)).use { reader ->
                    readJsonValue(reader) as? JSONObject
                        ?: throw IOException("Malformed published period JSON")
                }
            }
            if (root.optString("workspace") != workspace || root.optString("period") != period ||
                root.optString("snapshotStatus") != "ready") throw IOException("Published period workspace/version mismatch")
            val data = SnapshotData.fromJson(root.getJSONObject("report"))
            val version = root.getString("version")
            if (data.meta.workspace != workspace || data.meta.syncedAt != version ||
                data.meta.snapshotStatus != "ready") throw IOException("Unverified published report")
            return FastPublishedPeriod(data, version, period, root.optJSONObject("summary") ?: JSONObject())
        } finally { connection.disconnect() }
    }

    fun ticketConversation(token: String, ticketId: Long, workspace: String): TicketConversation {
        require(ticketId > 0L)
        val j = request("/api/zendesk-ticket-conversation?ticketId=$ticketId", token = token)
        val result = TicketConversation.fromJson(j)
        if (result.workspace != workspace || result.ticketId != ticketId ||
            j.optString("snapshotStatus") != "ready") {
            throw IllegalStateException("Conversation is not ready for this workspace")
        }
        return result
    }
}
