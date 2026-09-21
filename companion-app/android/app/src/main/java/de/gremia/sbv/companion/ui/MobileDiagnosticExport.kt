package de.gremia.sbv.companion.ui

import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import de.gremia.sbv.companion.R
import de.gremia.sbv.companion.domain.security.MobileDiagnosticReport

class MobileDiagnosticExport(
    private val activity: ComponentActivity,
    private val isUnlocked: () -> Boolean,
    private val report: () -> MobileDiagnosticReport,
) {
    private val launcher = activity.registerForActivityResult(
        ActivityResultContracts.CreateDocument("text/plain"),
    ) { uri ->
        if (uri != null && isUnlocked()) {
            val result = runCatching {
                val stream = requireNotNull(activity.contentResolver.openOutputStream(uri, "w"))
                stream.bufferedWriter(Charsets.UTF_8).use { it.write(report().render()) }
            }
            Toast.makeText(
                activity,
                if (result.isSuccess) R.string.diagnostic_saved else R.string.diagnostic_failed,
                Toast.LENGTH_LONG,
            ).show()
        }
    }

    fun launch() {
        if (isUnlocked()) launcher.launch("Gremia-SBV-Diagnose.txt")
    }
}
