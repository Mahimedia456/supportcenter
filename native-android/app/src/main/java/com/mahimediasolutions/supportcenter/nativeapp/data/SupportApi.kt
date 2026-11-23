package com.mahimediasolutions.supportcenter.nativeapp.data

import com.mahimediasolutions.supportcenter.nativeapp.BuildConfig
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

class HttpProblem(val httpStatus: Int, message: String) : Exception(message)

/** Authenticated HTTPS only; the Android client never receives a Supabase/Zendesk secret. */
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
            val body = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() } ?: "{}"
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
        SnapshotMeta.fromJson(request("/api/zendesk-cache-snapshot?part=meta", token = token))

    /** Verifies both workspace isolation and monotonic pagination for every part. */
    fun snapshotPartPage(token: String, workspace: String, part: String,
                         offset: Int, limit: Int = 150): Pair<List<JSONObject>, Int?> {
        require(part in setOf("tickets", "fields", "forms", "groups", "agents", "metric-events", "satisfaction", "metrics"))
        require(offset >= 0 && limit in 1..150)
        val response = request(
            "/api/zendesk-cache-snapshot?part=$part&offset=$offset&limit=$limit", token = token
        )
        if (response.optString("workspace") != workspace || response.optString("part") != part) {
            throw IllegalStateException("Workspace or snapshot part mismatch")
        }
        val arr = response.optJSONArray("items") ?: throw IllegalStateException("Missing '$part' items")
        val rows = (0 until arr.length()).mapNotNull { arr.optJSONObject(it) }
        if (rows.size != arr.length()) throw IllegalStateException("Malformed '$part' page")
        if (response.optBoolean("done", false)) return rows to null
        val next = response.optInt("nextOffset", -1)
        if (next <= offset) throw IllegalStateException("Non-progressing '$part' cursor")
        return rows to next
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
