package de.gremia.sbv.companion.ui

import android.content.Context
import android.widget.LinearLayout
import de.gremia.sbv.companion.R
import de.gremia.sbv.companion.domain.transfer.TransferIdentity

class PairingPanelRenderer(
    private val context: Context,
    private val ui: GremiaUi,
) {
    fun render(identity: TransferIdentity, onCopyRecipientToken: () -> Unit): LinearLayout =
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
        }
}
