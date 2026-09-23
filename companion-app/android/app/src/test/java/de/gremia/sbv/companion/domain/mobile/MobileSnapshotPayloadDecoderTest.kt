package de.gremia.sbv.companion.domain.mobile

import java.io.ByteArrayOutputStream
import java.util.Base64
import java.util.zip.DeflaterOutputStream
import kotlin.test.Test
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

class MobileSnapshotPayloadDecoderTest {
    @Test
    fun `rejects highly compressed snapshot while inflating beyond limit`() {
        val compressed = ByteArrayOutputStream().also { output ->
            DeflaterOutputStream(output).use { it.write(ByteArray(1_000_001) { 'x'.code.toByte() }) }
        }.toByteArray()
        val wrapper = """{
          "protocolVersion":"1.0",
          "schemaVersion":1,
          "payloadCompression":"deflate",
          "payloadBase64":"${Base64.getEncoder().encodeToString(compressed)}"
        }"""

        val error = assertFailsWith<IllegalArgumentException> {
            MobileSnapshotPayloadDecoder().decodeWrappedPayload(wrapper)
        }

        assertTrue(error.message.orEmpty().contains("zu groß"))
    }
}
