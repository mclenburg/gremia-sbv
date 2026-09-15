package de.gremia.sbv.companion.domain.mobile

import org.json.JSONObject
import java.security.MessageDigest
import java.util.Base64

interface MobileFrameParser {
    fun parse(rawValue: String): MobileQrFrame
}

class MobileQrFrameParser : MobileFrameParser {
    override fun parse(rawValue: String): MobileQrFrame {
        val trimmed = rawValue.trim()
        require(trimmed.startsWith(QR_PREFIX)) {
            "Dieser QR-Code gehört nicht zu einer Gremia.SBV-Mobile-Projektion."
        }
        val jsonText = String(
            Base64.getUrlDecoder().decode(trimmed.removePrefix(QR_PREFIX)),
            Charsets.UTF_8,
        )
        val json = JSONObject(jsonText)
        val frame = MobileQrFrame(
            protocolVersion = json.getString("protocolVersion"),
            transferSessionId = json.getString("transferSessionId"),
            encryptionMode = json.getString("encryptionMode"),
            packageId = json.getString("packageId"),
            frameIndex = json.getInt("frameIndex"),
            frameCount = json.getInt("frameCount"),
            payloadLength = json.getInt("payloadLength"),
            chunkChecksum = json.getString("chunkChecksum"),
            packageSha256 = json.getString("packageSha256"),
            payload = json.getString("payload"),
        )
        require(frame.protocolVersion == "1.0") { "Die Mobile-Projektion nutzt kein unterstütztes Protokoll." }
        require(frame.encryptionMode == "recipient_key_only") { "Die Mobile-Projektion nutzt keine unterstützte Verschlüsselung." }
        require(frame.frameCount in 1..MAX_FRAME_COUNT) { "Die Mobile-Projektion enthält zu viele QR-Frames." }
        require(frame.frameIndex in 0 until frame.frameCount) { "Der QR-Frame enthält eine ungültige Position." }
        require(frame.payloadLength == frame.payload.toByteArray(Charsets.UTF_8).size) {
            "Der QR-Frame enthält eine widersprüchliche Nutzdatenlänge."
        }
        require(frame.chunkChecksum.equals(sha256(frame.payload), ignoreCase = true)) {
            "Der QR-Frame ist beschädigt."
        }
        require(SHA256_HEX.matches(frame.packageSha256)) {
            "Die Mobile-Projektion enthält keine gültige Paketprüfsumme."
        }
        return frame
    }

    private companion object {
        private const val QR_PREFIX = "gsbvmobile://v1/"
        private const val MAX_FRAME_COUNT = 300
        private val SHA256_HEX = Regex("^[0-9a-fA-F]{64}$")
    }
}

fun sha256(value: String): String =
    MessageDigest.getInstance("SHA-256")
        .digest(value.toByteArray(Charsets.UTF_8))
        .joinToString(separator = "") { byte -> "%02x".format(byte) }

fun sha256(value: ByteArray): String =
    MessageDigest.getInstance("SHA-256")
        .digest(value)
        .joinToString(separator = "") { byte -> "%02x".format(byte) }
