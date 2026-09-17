package de.gremia.sbv.companion.domain.mobile

import de.gremia.sbv.companion.domain.transfer.TransferIdentity
import de.gremia.sbv.companion.domain.transfer.parseRecipientToken
import java.nio.charset.StandardCharsets
import java.security.MessageDigest
import java.util.Base64

data class MobilePairingResponseResult(
    val pairingResponse: String,
    val securityCode: String,
    val desktopInstanceId: String,
)

class MobilePairingExchange {
    fun createResponse(pairingRequest: String, mobileIdentity: TransferIdentity): MobilePairingResponseResult {
        val request = parseRequest(pairingRequest)
        val response = PairingResponse(request = request, mobileRecipientToken = mobileIdentity.recipientToken)
        val desktop = parseRecipientToken(request.desktopRecipientToken)
        return MobilePairingResponseResult(
            pairingResponse = encode(response.toJson()),
            securityCode = securityCode(response),
            desktopInstanceId = desktop.instanceId,
        )
    }

    private fun parseRequest(value: String): PairingRequest {
        val json = decode(value)
        require(json.string("protocolVersion") == PROTOCOL_VERSION && json.string("role") == REQUEST_ROLE) {
            "Pairinganfrage nutzt kein unterstütztes Format."
        }
        val request = PairingRequest(
            sessionId = json.string("sessionId"),
            createdAt = json.string("createdAt"),
            desktopRecipientToken = json.string("desktopRecipientToken"),
        )
        require(request.sessionId.isNotBlank()) { "Pairing-Session fehlt." }
        require(request.createdAt.isNotBlank()) { "Pairing-Zeitpunkt fehlt." }
        parseRecipientToken(request.desktopRecipientToken)
        return request
    }

    private fun parseResponse(value: String): PairingResponse {
        val json = decode(value)
        require(json.string("protocolVersion") == PROTOCOL_VERSION && json.string("role") == RESPONSE_ROLE) {
            "Pairingantwort nutzt kein unterstütztes Format."
        }
        val request = parseRequest(encode(json.obj("request").toJson()))
        val mobileRecipientToken = json.string("mobileRecipientToken")
        parseRecipientToken(mobileRecipientToken)
        return PairingResponse(request = request, mobileRecipientToken = mobileRecipientToken)
    }

    private fun securityCode(response: PairingResponse): String {
        val desktop = parseRecipientToken(response.request.desktopRecipientToken)
        val mobile = parseRecipientToken(response.mobileRecipientToken)
        val source = listOf(
            "gremia-sbv-mobile-pairing-v1",
            response.request.sessionId,
            desktop.instanceId,
            desktop.keyFingerprint,
            mobile.instanceId,
            mobile.keyFingerprint,
        ).joinToString("|")
        val digest = MessageDigest.getInstance("SHA-256").digest(source.toByteArray(StandardCharsets.UTF_8))
        return base32Code(digest, SECURITY_CODE_LENGTH).chunked(4).joinToString("-")
    }

    private fun encode(json: String): String =
        "$PAIRING_PREFIX.${Base64.getUrlEncoder().withoutPadding().encodeToString(json.toByteArray(StandardCharsets.UTF_8))}"

    private fun decode(value: String): JsonObject {
        val parts = value.trim().split(".")
        require(parts.size == 2 && parts[0] == PAIRING_PREFIX) { "Pairingkennung ist ungültig." }
        return runCatching {
            JsonParser(String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8)).parseObject()
        }.getOrElse {
            throw IllegalArgumentException("Pairingkennung konnte nicht gelesen werden.")
        }
    }

    private fun base32Code(bytes: ByteArray, length: Int): String {
        var bits = 0
        var value = 0
        val output = StringBuilder()
        for (byte in bytes) {
            value = (value shl 8) or (byte.toInt() and 0xff)
            bits += 8
            while (bits >= 5 && output.length < length) {
                output.append(SECURITY_CODE_ALPHABET[(value ushr (bits - 5)) and 31])
                bits -= 5
            }
            if (output.length >= length) break
        }
        return output.toString()
    }

    private data class PairingRequest(
        val sessionId: String,
        val createdAt: String,
        val desktopRecipientToken: String,
    ) {
        fun toJson(): String = buildJsonObject(
            "protocolVersion" to PROTOCOL_VERSION,
            "role" to REQUEST_ROLE,
            "sessionId" to sessionId,
            "createdAt" to createdAt,
            "desktopRecipientToken" to desktopRecipientToken,
        )
    }

    private data class PairingResponse(
        val request: PairingRequest,
        val mobileRecipientToken: String,
    ) {
        fun toJson(): String = buildJsonObject(
            "protocolVersion" to PROTOCOL_VERSION,
            "role" to RESPONSE_ROLE,
            "request" to RawJson(request.toJson()),
            "mobileRecipientToken" to mobileRecipientToken,
        )
    }

    private class RawJson(val value: String)

    private sealed interface JsonValue {
        fun toJson(): String
    }

    private data class JsonString(val value: String) : JsonValue {
        override fun toJson(): String = jsonString(value)
    }

    private data class JsonObject(val fields: Map<String, JsonValue>) : JsonValue {
        fun string(name: String): String =
            (fields[name] as? JsonString)?.value ?: throw IllegalArgumentException("Pairingdaten sind unvollständig.")

        fun obj(name: String): JsonObject =
            fields[name] as? JsonObject ?: throw IllegalArgumentException("Pairingdaten sind unvollständig.")

        override fun toJson(): String = fields.entries.joinToString(prefix = "{", postfix = "}") { entry ->
            "${jsonString(entry.key)}:${entry.value.toJson()}"
        }
    }

    private class JsonParser(private val text: String) {
        private var index = 0

        fun parseObject(): JsonObject {
            skipWhitespace()
            val value = readObject()
            skipWhitespace()
            require(index == text.length) { "Unerwartete Daten nach dem Pairingobjekt." }
            return value
        }

        private fun readObject(): JsonObject {
            expect('{')
            val fields = linkedMapOf<String, JsonValue>()
            skipWhitespace()
            if (peek() == '}') {
                index += 1
                return JsonObject(fields)
            }
            while (true) {
                skipWhitespace()
                val key = readString()
                skipWhitespace()
                expect(':')
                skipWhitespace()
                fields[key] = readValue()
                skipWhitespace()
                when (peek()) {
                    ',' -> index += 1
                    '}' -> {
                        index += 1
                        return JsonObject(fields)
                    }
                    else -> throw IllegalArgumentException("Pairingobjekt ist ungültig.")
                }
            }
        }

        private fun readValue(): JsonValue =
            when (peek()) {
                '"' -> JsonString(readString())
                '{' -> readObject()
                else -> throw IllegalArgumentException("Pairingobjekt enthält keinen unterstützten Wert.")
            }

        private fun readString(): String {
            expect('"')
            val output = StringBuilder()
            while (index < text.length) {
                when (val char = text[index++]) {
                    '"' -> return output.toString()
                    '\\' -> output.append(readEscape())
                    else -> output.append(char)
                }
            }
            throw IllegalArgumentException("Pairingtext ist unvollständig.")
        }

        private fun readEscape(): Char {
            require(index < text.length) { "Pairingtext ist unvollständig." }
            return when (val escape = text[index++]) {
                '"', '\\', '/' -> escape
                'b' -> '\b'
                'f' -> '\u000C'
                'n' -> '\n'
                'r' -> '\r'
                't' -> '\t'
                'u' -> readUnicodeEscape()
                else -> throw IllegalArgumentException("Pairingtext enthält eine ungültige Escape-Sequenz.")
            }
        }

        private fun readUnicodeEscape(): Char {
            require(index + 4 <= text.length) { "Pairingtext ist unvollständig." }
            val hex = text.substring(index, index + 4)
            index += 4
            return hex.toInt(16).toChar()
        }

        private fun expect(expected: Char) {
            require(peek() == expected) { "Pairingobjekt ist ungültig." }
            index += 1
        }

        private fun peek(): Char = text.getOrNull(index) ?: '\u0000'

        private fun skipWhitespace() {
            while (index < text.length && text[index].isWhitespace()) index += 1
        }
    }

    private companion object {
        private const val PAIRING_PREFIX = "GSBVMOBILEPAIR1"
        private const val PROTOCOL_VERSION = "1.0"
        private const val REQUEST_ROLE = "desktop_pairing_request"
        private const val RESPONSE_ROLE = "mobile_pairing_response"
        private const val SECURITY_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
        private const val SECURITY_CODE_LENGTH = 12

        private fun buildJsonObject(vararg entries: Pair<String, Any>): String =
            entries.joinToString(prefix = "{", postfix = "}") { (key, value) ->
                val jsonValue = when (value) {
                    is RawJson -> value.value
                    is String -> jsonString(value)
                    else -> throw IllegalArgumentException("Nicht unterstützter JSON-Wert.")
                }
                "${jsonString(key)}:$jsonValue"
            }

        private fun jsonString(value: String): String = buildString {
            append('"')
            value.forEach { char ->
                when (char) {
                    '\\' -> append("\\\\")
                    '"' -> append("\\\"")
                    '\b' -> append("\\b")
                    '\u000C' -> append("\\f")
                    '\n' -> append("\\n")
                    '\r' -> append("\\r")
                    '\t' -> append("\\t")
                    else -> append(char)
                }
            }
            append('"')
        }
    }
}
