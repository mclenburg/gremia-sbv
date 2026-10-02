package de.gremia.sbv.companion.ui

import android.net.Uri
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import com.journeyapps.barcodescanner.ScanContract
import com.journeyapps.barcodescanner.ScanOptions
import de.gremia.sbv.companion.R
import java.util.concurrent.Executors

/** Only public pairing messages use SAF; no identity secrets are exported. */
class MobilePairingTransport(
    private val activity: ComponentActivity,
    private val isActive: () -> Boolean,
    private val onRequest: (String) -> Unit,
    private val onFailure: () -> Unit,
) {
    private val worker = Executors.newSingleThreadExecutor()
    private var generation = 0
    private var scanGeneration = -1
    private var importGeneration = -1
    private var export: Pair<Int, String>? = null
    private val scanner = activity.registerForActivityResult(ScanContract()) { result ->
        if (scanGeneration == generation && isActive()) result.contents?.let(onRequest)
    }
    private val importer = activity.registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null && importGeneration == generation && isActive()) read(uri, generation)
    }
    private val exporter = activity.registerForActivityResult(ActivityResultContracts.CreateDocument("application/octet-stream")) { uri ->
        val pending = export
        export = null
        if (uri != null && pending != null && pending.first == generation && isActive()) {
            work(pending.first, {
                activity.contentResolver.openOutputStream(uri, "w")?.use {
                    it.write(pending.second.toByteArray(Charsets.UTF_8))
                } ?: error("Kein Ausgabeziel")
            }, {})
        }
    }

    fun scan() {
        scanGeneration = generation
        scanner.launch(ScanOptions().apply {
            setDesiredBarcodeFormats(ScanOptions.QR_CODE)
            setPrompt(activity.getString(R.string.pairing_scan_request))
            setBeepEnabled(false)
            setOrientationLocked(false)
        })
    }

    fun openFile() { importGeneration = generation; importer.launch(arrayOf("*/*")) }
    fun saveFile(response: String) {
        require(response.length <= MAX_MESSAGE_BYTES)
        export = generation to response
        exporter.launch("gremia-kopplungsantwort.gsbvpair")
    }
    fun cancel() { generation += 1; export = null }
    fun close() { cancel(); worker.shutdownNow() }

    private fun read(uri: Uri, token: Int) = work(token, {
        activity.contentResolver.openInputStream(uri)?.use { input ->
            val buffer = ByteArray(MAX_MESSAGE_BYTES + 1)
            var size = 0
            while (size < buffer.size) {
                val count = input.read(buffer, size, buffer.size - size)
                if (count < 0) break
                size += count
            }
            require(size in 1..MAX_MESSAGE_BYTES)
            String(buffer, 0, size, Charsets.UTF_8)
        } ?: error("Keine Eingabe")
    }, onRequest)

    private fun <T> work(token: Int, operation: () -> T, success: (T) -> Unit) {
        worker.execute {
            val result = runCatching(operation)
            activity.runOnUiThread {
                if (generation == token && isActive()) result.fold(success, { onFailure() })
            }
        }
    }

    private companion object { const val MAX_MESSAGE_BYTES = 16_384 }
}
