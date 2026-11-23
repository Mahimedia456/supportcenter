package com.mahimediasolutions.supportcenter.nativeapp.data

import org.json.JSONArray
import org.json.JSONObject

private fun JSONObject.text(key: String): String =
    if (isNull(key)) "" else optString(key).takeIf { it != "null" } ?: ""

private fun JSONObject.optionalId(key: String): Long? =
    if (isNull(key)) null else optLong(key).takeIf { it > 0L }

private fun JSONArray.objects(): List<JSONObject> =
    (0 until length()).mapNotNull { optJSONObject(it) }

private fun JSONArray.strings(): List<String> =
    (0 until length()).mapNotNull { optString(it).takeIf { s -> s.isNotBlank() && s != "null" } }

private fun JSONObject.array(key: String): JSONArray = optJSONArray(key) ?: JSONArray()

private fun jsonList(items: List<JSONObject>): JSONArray = JSONArray().also { out -> items.forEach(out::put) }

data class Workspace(
    val id: String,
    val slug: String,
    val name: String,
    val supportLabel: String
) {
    companion object {
        fun fromJson(j: JSONObject) = Workspace(
            id = j.text("id"), slug = j.text("slug"),
            name = j.text("name"), supportLabel = j.text("supportLabel")
        )
    }
}

data class User(val id: String, val email: String, val displayName: String, val role: String) {
    companion object {
        fun fromJson(j: JSONObject) = User(
            id = j.text("id"), email = j.text("email"),
            displayName = j.text("displayName"), role = j.text("role")
        )
    }
}

data class SupportSession(
    val user: User,
    val workspace: Workspace,
    val accessToken: String,
    val refreshToken: String,
    val accessTokenExpiresAt: String
) {
    fun toJson() = JSONObject().apply {
        put("user", JSONObject().apply {
            put("id", user.id); put("email", user.email)
            put("displayName", user.displayName); put("role", user.role)
        })
        put("workspace", JSONObject().apply {
            put("id", workspace.id); put("slug", workspace.slug)
            put("name", workspace.name); put("supportLabel", workspace.supportLabel)
        })
        put("accessToken", accessToken); put("refreshToken", refreshToken)
        put("accessTokenExpiresAt", accessTokenExpiresAt)
    }
    companion object {
        fun fromJson(j: JSONObject) = SupportSession(
            user = User.fromJson(j.getJSONObject("user")),
            workspace = Workspace.fromJson(j.getJSONObject("workspace")),
            accessToken = j.getString("accessToken"),
            refreshToken = j.getString("refreshToken"),
            accessTokenExpiresAt = j.text("accessTokenExpiresAt")
        )
    }
}

data class SnapshotMeta(
    val workspace: String,
    val snapshotStatus: String,
    val syncStatus: String,
    val syncedAt: String?,
    val lastError: String?
) {
    companion object {
        fun fromJson(j: JSONObject) = SnapshotMeta(
            workspace = j.text("workspace"),
            snapshotStatus = j.optString("snapshotStatus", "missing"),
            syncStatus = j.optString("syncStatus", "never"),
            syncedAt = j.text("syncedAt").ifBlank { null },
            lastError = j.text("lastError").ifBlank { null }
        )
    }
    fun toJson(): JSONObject = JSONObject().apply {
        put("workspace", workspace); put("snapshotStatus", snapshotStatus)
        put("syncStatus", syncStatus)
        put("syncedAt", syncedAt ?: JSONObject.NULL)
        put("lastError", lastError ?: JSONObject.NULL)
    }
}

data class FieldValue(val fieldId: Long, val values: List<String>)

/** Keeps the original Zendesk JSON in encrypted snapshot cache, so future detail fields are not lost. */
data class Ticket(
    val id: Long,
    val subject: String,
    val status: String,
    val priority: String,
    val createdAt: String,
    val assigneeId: String?,
    val updatedAt: String = "",
    val description: String = "",
    val requesterId: Long? = null,
    val groupId: Long? = null,
    val formId: Long? = null,
    val type: String = "",
    val tags: List<String> = emptyList(),
    val customFields: List<FieldValue> = emptyList(),
    private val rawJson: String? = null
) {
    fun toJson(): JSONObject = rawJson?.let(::JSONObject) ?: JSONObject().apply {
        put("id", id); put("subject", subject); put("status", status)
        put("priority", priority); put("created_at", createdAt)
        put("updated_at", updatedAt); put("description", description)
        put("assignee_id", assigneeId ?: JSONObject.NULL)
        put("requester_id", requesterId ?: JSONObject.NULL)
        put("group_id", groupId ?: JSONObject.NULL)
        put("ticket_form_id", formId ?: JSONObject.NULL)
        put("type", type)
        put("tags", JSONArray(tags))
        put("custom_fields", JSONArray().also { array ->
            customFields.forEach { field ->
                array.put(JSONObject().put("id", field.fieldId).put("value", field.values.firstOrNull()))
            }
        })
    }

    companion object {
        fun fromJson(j: JSONObject): Ticket {
            val custom = j.array("custom_fields").objects().mapNotNull { row ->
                val id = row.optLong("id")
                if (id <= 0L || row.isNull("value")) return@mapNotNull null
                val raw = row.opt("value")
                val values = when (raw) {
                    is JSONArray -> raw.strings()
                    null, JSONObject.NULL -> emptyList()
                    else -> listOf(raw.toString()).filter { it.isNotBlank() && it != "null" }
                }
                FieldValue(id, values)
            }
            return Ticket(
                id = j.optLong("id"),
                subject = j.text("subject").ifBlank { "Untitled ticket" },
                status = j.text("status"), priority = j.text("priority"),
                createdAt = j.text("created_at"),
                assigneeId = j.text("assignee_id").ifBlank { null },
                updatedAt = j.text("updated_at"), description = j.text("description"),
                requesterId = j.optionalId("requester_id"),
                groupId = j.optionalId("group_id"), formId = j.optionalId("ticket_form_id"),
                type = j.text("type"), tags = j.array("tags").strings(),
                customFields = custom, rawJson = j.toString()
            )
        }
    }
}

data class ReferenceField(
    val id: Long,
    val title: String,
    val active: Boolean,
    val options: Map<String, String>,
    private val rawJson: String
) {
    fun label(raw: String): String = options[raw] ?: raw.replace('_', ' ').trim()
    fun toJson(): JSONObject = JSONObject(rawJson)

    companion object {
        fun fromJson(j: JSONObject): ReferenceField {
            val options = mutableMapOf<String, String>()
            for (key in listOf("custom_field_options", "system_field_options")) {
                j.array(key).objects().forEach { option ->
                    val label = option.text("name").ifBlank { option.text("raw_name") }
                    if (label.isNotBlank()) {
                        option.text("value").takeIf(String::isNotBlank)?.let { options[it] = label }
                        option.text("id").takeIf(String::isNotBlank)?.let { options[it] = label }
                    }
                }
            }
            return ReferenceField(
                id = j.optLong("id"),
                title = j.text("title").ifBlank { j.text("raw_title") }
                    .ifBlank { j.text("description") },
                active = j.optBoolean("active", true),
                options = options, rawJson = j.toString()
            )
        }
    }
}

data class LookupItem(val id: Long, val name: String, private val rawJson: String) {
    fun toJson(): JSONObject = JSONObject(rawJson)
    companion object {
        fun fromJson(j: JSONObject): LookupItem = LookupItem(
            j.optLong("id"), j.text("display_name").ifBlank { j.text("name") }, j.toString()
        )
    }
}

data class SnapshotData(
    val meta: SnapshotMeta,
    val tickets: List<Ticket>,
    val fields: List<ReferenceField> = emptyList(),
    val forms: List<LookupItem> = emptyList(),
    val agents: List<LookupItem> = emptyList(),
    val groups: List<LookupItem> = emptyList(),
    val slaEvents: List<JSONObject> = emptyList(),
    val slaLoaded: Boolean = false,
    val slaWarning: String? = null,
    val satisfaction: List<JSONObject> = emptyList(),
    val metrics: List<JSONObject> = emptyList(),
    val satisfactionLoaded: Boolean = false,
    val metricsLoaded: Boolean = false,
    val satisfactionWarning: String? = null,
    val metricsWarning: String? = null
) {
    fun toJson(): JSONObject = JSONObject().apply {
        put("meta", meta.toJson())
        put("tickets", JSONArray().also { a -> tickets.forEach { a.put(it.toJson()) } })
        put("fields", jsonList(fields.map { it.toJson() }))
        put("forms", jsonList(forms.map { it.toJson() }))
        put("agents", jsonList(agents.map { it.toJson() }))
        put("groups", jsonList(groups.map { it.toJson() }))
        put("slaEvents", jsonList(slaEvents))
        put("slaLoaded", slaLoaded)
        put("slaWarning", slaWarning ?: JSONObject.NULL)
        put("satisfaction", jsonList(satisfaction))
        put("metrics", jsonList(metrics))
        put("satisfactionLoaded", satisfactionLoaded)
        put("metricsLoaded", metricsLoaded)
        put("satisfactionWarning", satisfactionWarning ?: JSONObject.NULL)
        put("metricsWarning", metricsWarning ?: JSONObject.NULL)
    }

    companion object {
        fun fromJson(j: JSONObject) = SnapshotData(
            meta = SnapshotMeta.fromJson(j.getJSONObject("meta")),
            tickets = j.array("tickets").objects().map(Ticket::fromJson).filter { it.id > 0L },
            fields = j.array("fields").objects().map(ReferenceField::fromJson),
            forms = j.array("forms").objects().map(LookupItem::fromJson),
            agents = j.array("agents").objects().map(LookupItem::fromJson),
            groups = j.array("groups").objects().map(LookupItem::fromJson),
            slaEvents = j.array("slaEvents").objects(),
            slaLoaded = j.optBoolean("slaLoaded", false),
            slaWarning = j.text("slaWarning").ifBlank { null },
            satisfaction = j.array("satisfaction").objects(),
            metrics = j.array("metrics").objects(),
            satisfactionLoaded = j.optBoolean("satisfactionLoaded", false),
            metricsLoaded = j.optBoolean("metricsLoaded", false),
            satisfactionWarning = j.text("satisfactionWarning").ifBlank { null },
            metricsWarning = j.text("metricsWarning").ifBlank { null }
        )
    }
}

data class ConversationComment(
    val id: Long, val authorId: Long?, val createdAt: String,
    val body: String, val isPublic: Boolean
) {
    companion object {
        fun fromJson(j: JSONObject): ConversationComment {
            val body = j.text("plain_body").ifBlank { j.text("body") }
            return ConversationComment(
                j.optLong("id"), j.optionalId("author_id"), j.text("created_at"),
                body, j.optBoolean("public", false)
            )
        }
    }
}

data class TicketConversation(
    val workspace: String, val ticketId: Long,
    val comments: List<ConversationComment>, val commentCount: Int,
    val syncedAt: String?
) {
    companion object {
        fun fromJson(j: JSONObject) = TicketConversation(
            workspace = j.text("workspace"), ticketId = j.optLong("ticketId"),
            comments = j.array("comments").objects().map(ConversationComment::fromJson),
            commentCount = j.optInt("commentCount", j.array("comments").length()),
            syncedAt = j.text("syncedAt").ifBlank { null }
        )
    }
}
