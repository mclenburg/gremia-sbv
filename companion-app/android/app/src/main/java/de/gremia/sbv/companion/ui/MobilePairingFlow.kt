package de.gremia.sbv.companion.ui

import android.app.AlertDialog
import android.os.Handler
import android.os.Looper
import android.view.View
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.Toast
import androidx.activity.ComponentActivity
import de.gremia.sbv.companion.R
import de.gremia.sbv.companion.domain.mobile.MobileDesktopTrustStore
import de.gremia.sbv.companion.domain.mobile.MobilePairingSession
import de.gremia.sbv.companion.domain.transfer.TransferIdentity

class MobilePairingFlow(
    private val activity: ComponentActivity,
    private val identity: () -> TransferIdentity,
    private val trustStore: MobileDesktopTrustStore,
    private val isUnlocked: () -> Boolean,
    private val hasWorkData: () -> Boolean,
    private val onChanged: () -> Unit,
) {
    private var session: MobilePairingSession? = null
    private var dialog: AlertDialog? = null
    private var body: LinearLayout? = null
    private var ui: GremiaUi? = null
    private val timer = Handler(Looper.getMainLooper())
    private val transport = MobilePairingTransport(activity, { dialog?.isShowing == true && isUnlocked() },
        ::acceptRequest, { showError(activity.getString(R.string.pairing_file_error)) })

    fun render(ui: GremiaUi): View = PairingPanelRenderer(activity, ui).render(trustStore.current(), { open(ui) })

    private fun open(style: GremiaUi) {
        if (!isUnlocked()) return
        if (hasWorkData()) {
            showError(activity.getString(R.string.pairing_work_data_blocked))
            return
        }
        cancel()
        ui = style
        session = MobilePairingSession(identity(), trustStore)
        val content = style.panel()
        body = content
        dialog = AlertDialog.Builder(activity).setView(ScrollView(activity).apply { addView(content) }).create().apply {
            setOnDismissListener { clearSession() }
            show()
        }
        renderRequest()
        scheduleExpiry()
    }

    private fun renderRequest() {
        val style = ui ?: return
        body?.apply {
            removeAllViews()
            addView(style.sectionHeader(activity.getString(R.string.pairing_connect), activity.getString(R.string.pairing_flow_help)))
            addView(style.horizontalActions(
                style.secondaryButton(activity.getString(R.string.pairing_scan_request), transport::scan),
                style.secondaryButton(activity.getString(R.string.pairing_open_file), transport::openFile),
            ))
            val input = style.textInput(activity.getString(R.string.pairing_request_label), activity.getString(R.string.pairing_request_hint), true)
            addView(style.fieldLabel(activity.getString(R.string.pairing_request_label)))
            addView(input)
            addView(style.horizontalActions(
                style.secondaryButton(activity.getString(android.R.string.cancel), ::cancel),
                style.button(activity.getString(R.string.pairing_create_response)) { acceptRequest(input.text.toString()) },
            ))
        }
    }

    private fun acceptRequest(request: String) {
        if (!isUnlocked() || dialog?.isShowing != true) return
        runCatching { requireNotNull(session).begin(request) }
            .onSuccess { renderConfirmation() }
            .onFailure { showError(it.message ?: activity.getString(R.string.pairing_response_error)) }
    }

    private fun renderConfirmation() {
        val pending = session?.pending() ?: return
        val style = ui ?: return
        body?.apply {
            removeAllViews()
            addView(style.sectionHeader(activity.getString(R.string.pairing_confirm_title), activity.getString(R.string.pairing_flow_help)))
            addView(style.listItem(activity.getString(R.string.pairing_candidate_value, pending.desktopInstanceId)))
            addView(style.monospaceValue(pending.securityCode, activity.getString(R.string.pairing_security_code_label)))
            addView(style.monospaceValue(pending.pairingResponse, activity.getString(R.string.pairing_response_label)))
            addView(style.secondaryButton(activity.getString(R.string.pairing_save_file)) {
                session?.touch()
                transport.saveFile(pending.pairingResponse)
            })
            addView(style.horizontalActions(
                style.secondaryButton(activity.getString(android.R.string.cancel), ::cancel),
                style.button(activity.getString(R.string.pairing_confirm_codes)) {
                    if (isUnlocked()) runCatching { requireNotNull(session).confirm(pending.securityCode) }
                        .onSuccess { cancel(); onChanged() }
                        .onFailure { showError(it.message ?: activity.getString(R.string.pairing_response_error)) }
                },
            ))
        }
    }

    private fun scheduleExpiry() {
        timer.postDelayed({
            if (session?.expire() == true) {
                cancel()
                showError(activity.getString(R.string.pairing_expired))
            } else if (dialog?.isShowing == true) scheduleExpiry()
        }, 1_000L)
    }

    private fun showError(message: String) { Toast.makeText(activity, message, Toast.LENGTH_LONG).show() }
    fun cancel() { dialog?.dismiss(); clearSession(); dialog = null }
    fun close() { cancel(); transport.close() }
    private fun clearSession() {
        timer.removeCallbacksAndMessages(null)
        transport.cancel()
        session?.cancel()
        session = null
        body = null
    }
}
