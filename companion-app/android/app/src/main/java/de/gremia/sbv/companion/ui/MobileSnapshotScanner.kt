package de.gremia.sbv.companion.ui

import android.app.AlertDialog
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.widget.LinearLayout
import com.google.zxing.BarcodeFormat
import com.google.zxing.ResultPoint
import com.journeyapps.barcodescanner.BarcodeCallback
import com.journeyapps.barcodescanner.BarcodeResult
import com.journeyapps.barcodescanner.DecoratedBarcodeView
import com.journeyapps.barcodescanner.DefaultDecoderFactory
import de.gremia.sbv.companion.R
import de.gremia.sbv.companion.domain.mobile.MobileSnapshotIntakeResult
import de.gremia.sbv.companion.domain.security.MobileThemeMode
import androidx.activity.ComponentActivity

class MobileSnapshotScanner(
    private val activity: ComponentActivity,
    private val themeMode: () -> MobileThemeMode,
    private val onFrame: (String) -> MobileSnapshotIntakeResult,
    private val onCancel: () -> Unit,
) {
    private val timer = Handler(Looper.getMainLooper())
    private var dialog: AlertDialog? = null
    private var scanner: DecoratedBarcodeView? = null
    private var startedAt = 0L
    private var lastFrameAt = 0L
    private var completed = false

    fun open() {
        close()
        completed = false
        startedAt = SystemClock.elapsedRealtime()
        lastFrameAt = startedAt
        val style = GremiaUi(activity, themeMode())
        val status = style.paragraph(activity.getString(R.string.snapshot_frame_empty)).apply {
            accessibilityLiveRegion = android.view.View.ACCESSIBILITY_LIVE_REGION_POLITE
        }
        val camera = DecoratedBarcodeView(activity).apply {
            barcodeView.decoderFactory = DefaultDecoderFactory(listOf(BarcodeFormat.QR_CODE))
            decodeContinuous(object : BarcodeCallback {
                override fun barcodeResult(result: BarcodeResult) {
                    if (dialog?.isShowing != true) return
                    lastFrameAt = SystemClock.elapsedRealtime()
                    val intake = onFrame(result.text)
                    if (status.text != intake.message) status.text = intake.message
                    if (intake is MobileSnapshotIntakeResult.ReadyForConfirmation) {
                        completed = true
                        dialog?.dismiss()
                    }
                }

                override fun possibleResultPoints(resultPoints: List<ResultPoint>) = Unit
            })
        }
        scanner = camera
        val content = style.panel().apply {
            addView(camera, LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                (320 * activity.resources.displayMetrics.density).toInt(),
            ))
            addView(status)
        }
        dialog = AlertDialog.Builder(activity)
            .setTitle(R.string.snapshot_scan_prompt)
            .setView(content)
            .setNegativeButton(android.R.string.cancel, null)
            .create().apply {
                setOnDismissListener {
                    camera.pause()
                    timer.removeCallbacksAndMessages(null)
                    scanner = null
                    dialog = null
                    if (!completed) onCancel()
                }
                show()
            }
        camera.resume()
        scheduleTimeout()
    }

    fun pause() { scanner?.pause() }
    fun resume() { if (dialog?.isShowing == true) scanner?.resume() }
    fun close() { dialog?.dismiss() }

    private fun scheduleTimeout() {
        timer.postDelayed({
            val now = SystemClock.elapsedRealtime()
            if (dialog?.isShowing == true) {
                if (now - startedAt >= TOTAL_TIMEOUT_MILLIS || now - lastFrameAt >= INACTIVITY_TIMEOUT_MILLIS) {
                    dialog?.dismiss()
                    android.widget.Toast.makeText(activity, R.string.snapshot_scan_expired, android.widget.Toast.LENGTH_LONG).show()
                } else scheduleTimeout()
            }
        }, 1_000L)
    }

    private companion object {
        const val INACTIVITY_TIMEOUT_MILLIS = 5 * 60_000L
        const val TOTAL_TIMEOUT_MILLIS = 15 * 60_000L
    }
}
