package de.gremia.sbv.companion.ui

import android.content.Context
import android.widget.TextView
import android.widget.LinearLayout
import de.gremia.sbv.companion.R
import de.gremia.sbv.companion.domain.mobile.MobilePairingResponseResult
import de.gremia.sbv.companion.domain.transfer.TransferIdentity

class PairingPanelRenderer(
    private val context: Context,
    private val ui: GremiaUi,
) {
    fun render(
        identity: TransferIdentity,
        onCopyRecipientToken: () -> Unit,
        onCreatePairingResponse: (String) -> MobilePairingResponseResult,
    ): LinearLayout =
        ui.panel().apply {
            addView(ui.kicker(context.getString(R.string.pairing_kicker)))
            addView(ui.sectionHeader(
                context.getString(R.string.pairing_title),
                context.getString(R.string.pairing_description),
            ))
            addView(ui.fieldLabel(context.getString(R.string.instance_id_label)))
            addView(ui.monospaceValue(identity.instanceId, context.getString(R.string.instance_id_label)))
            addView(ui.fieldLabel(context.getString(R.string.recipient_token_label)))
            addView(ui.monospaceValue(identity.recipientToken, context.getString(R.string.recipient_token_label)))
            addView(ui.button(context.getString(R.string.copy_recipient_token), onCopyRecipientToken))
            val requestInput = ui.textInput(
                context.getString(R.string.pairing_request_label),
                context.getString(R.string.pairing_request_hint),
                multiLine = true,
            )
            val responseOutput = pairingOutputText(context.getString(R.string.pairing_response_empty))
            val codeOutput = pairingOutputText(context.getString(R.string.pairing_security_code_empty))
            addView(ui.fieldLabel(context.getString(R.string.pairing_request_label)))
            addView(requestInput)
            addView(ui.button(context.getString(R.string.pairing_create_response)) {
                runCatching { onCreatePairingResponse(requestInput.text.toString()) }
                    .onSuccess { result ->
                        responseOutput.text = result.pairingResponse
                        codeOutput.text = context.getString(R.string.pairing_security_code_value, result.securityCode)
                    }
                    .onFailure { cause ->
                        responseOutput.text = cause.message ?: context.getString(R.string.pairing_response_error)
                        codeOutput.text = context.getString(R.string.pairing_security_code_empty)
                    }
            })
            addView(ui.fieldLabel(context.getString(R.string.pairing_response_label)))
            addView(responseOutput)
            addView(ui.fieldLabel(context.getString(R.string.pairing_security_code_label)))
            addView(codeOutput)
        }

    private fun pairingOutputText(value: String): TextView =
        ui.monospaceValue(value, value)
}
