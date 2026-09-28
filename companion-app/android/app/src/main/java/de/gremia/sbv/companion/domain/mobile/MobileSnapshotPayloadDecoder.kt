package de.gremia.sbv.companion.domain.mobile

import org.json.JSONObject
import java.io.ByteArrayInputStream
import java.util.Base64
import java.util.zip.InflaterInputStream

class MobileSnapshotPayloadDecoder {
    fun decodeWrappedPayload(encodedPayloadText: String): MobileSnapshot {
        val wrapper = JSONObject(encodedPayloadText)
        require(wrapper.getString("protocolVersion") == "1.0") {
            "Der Mobile-Snapshot nutzt kein unterstütztes Protokoll."
        }
        require(wrapper.getInt("schemaVersion") == 1) {
            "Der Mobile-Snapshot nutzt kein unterstütztes Schema."
        }
        require(wrapper.getString("payloadCompression") == "deflate") {
            "Der Mobile-Snapshot nutzt keine unterstützte Komprimierung."
        }
        val compressed = Base64.getDecoder().decode(wrapper.getString("payloadBase64"))
        require(compressed.size <= MAX_SNAPSHOT_BYTES) { "Der Mobile-Snapshot ist zu groß." }
        var inflated: ByteArray? = null
        return try {
            inflated = inflateBounded(compressed)
            decodePlainPayload(String(inflated, Charsets.UTF_8))
        } finally {
            inflated?.fill(0)
            compressed.fill(0)
        }
    }

    fun decodePlainPayload(payloadJson: String): MobileSnapshot {
        val json = JSONObject(payloadJson)
        require(json.getString("protocolVersion") == "1.0") {
            "Der Mobile-Snapshot nutzt kein unterstütztes Protokoll."
        }
        require(json.getInt("schemaVersion") == 1) {
            "Der Mobile-Snapshot nutzt kein unterstütztes Schema."
        }
        val preferences = json.getJSONObject("uiPreferences")
        val returnTarget = json.getJSONObject("returnTarget")
        val cases = json.getJSONArray("cases")
        val deadlines = json.getJSONArray("deadlines")
        return MobileSnapshot(
            packageId = json.getString("packageId"),
            sourceInstanceId = json.getString("sourceInstanceId"),
            targetInstanceId = json.getString("targetInstanceId"),
            returnTarget = MobileReturnTarget(
                instanceId = returnTarget.getString("instanceId"),
                keyFingerprint = returnTarget.getString("keyFingerprint"),
                publicKeyPem = returnTarget.getString("publicKeyPem"),
            ),
            createdAt = json.getString("createdAt"),
            themeMode = preferences.optString("themeMode", "dark"),
            cases = List(cases.length()) { index ->
                val item = cases.getJSONObject(index)
                MobileCaseProjection(
                    id = item.getString("id"),
                    caseNumber = item.getString("caseNumber"),
                    displayName = item.getString("displayName"),
                    category = item.getString("category"),
                    status = item.getString("status"),
                    priority = item.getString("priority"),
                    updatedAt = item.getString("updatedAt"),
                )
            },
            deadlines = List(deadlines.length()) { index ->
                val item = deadlines.getJSONObject(index)
                MobileDeadlineProjection(
                    id = item.getString("id"),
                    caseId = item.getString("caseId"),
                    type = item.optString("type", "follow_up"),
                    title = item.getString("title"),
                    dueAt = item.getString("dueAt"),
                    reminderAt = item.optString("reminderAt").takeIf { value -> value.isNotBlank() },
                    legalBasis = item.optString("legalBasis").takeIf { value -> value.isNotBlank() },
                    severity = item.getString("severity"),
                    status = item.getString("status"),
                    isLegalDeadline = item.optBoolean("isLegalDeadline", false),
                    updatedAt = item.getString("updatedAt"),
                )
            },
            rawPayloadJson = payloadJson,
        )
    }

    private companion object {
        private const val MAX_SNAPSHOT_BYTES = 1_000_000

        fun inflateBounded(compressed: ByteArray): ByteArray {
            val output = ByteArray(MAX_SNAPSHOT_BYTES + 1)
            var size = 0
            try {
                InflaterInputStream(ByteArrayInputStream(compressed)).use { input ->
                    while (true) {
                        val count = input.read(output, size, output.size - size)
                        if (count == -1) break
                        size += count
                        require(size <= MAX_SNAPSHOT_BYTES) { "Der Mobile-Snapshot ist zu groß." }
                    }
                }
                return output.copyOf(size)
            } finally {
                output.fill(0)
            }
        }
    }
}
