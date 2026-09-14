package de.gremia.sbv.companion.ui

import android.content.Context
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import de.gremia.sbv.companion.R
import de.gremia.sbv.companion.domain.transfer.TransferIdentity

class AppShellRenderer(
    private val context: Context,
) {
    fun render(identity: TransferIdentity, onCopyRecipientToken: () -> Unit): ScrollView =
        ScrollView(context).apply {
            setBackgroundColor(color(R.color.gremia_background))
            addView(content(identity, onCopyRecipientToken))
        }

    private fun content(identity: TransferIdentity, onCopyRecipientToken: () -> Unit): LinearLayout =
        LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            val padding = dimen(R.dimen.screen_padding)
            setPadding(padding, padding, padding, padding)
            addView(kicker(context.getString(R.string.app_shell_kicker)))
            addView(title(context.getString(R.string.app_name)))
            addView(paragraph(context.getString(R.string.app_shell_description)))
            addView(identityCard(identity, onCopyRecipientToken))
        }

    private fun identityCard(identity: TransferIdentity, onCopyRecipientToken: () -> Unit): LinearLayout =
        LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            background = panelBackground()
            val padding = dimen(R.dimen.panel_padding)
            setPadding(padding, padding, padding, padding)
            addView(kicker(context.getString(R.string.pairing_kicker)))
            addView(sectionTitle(context.getString(R.string.pairing_title)))
            addView(paragraph(context.getString(R.string.pairing_description)))
            addView(fieldLabel(context.getString(R.string.instance_id_label)))
            addView(monospaceValue(identity.instanceId, context.getString(R.string.instance_id_label)))
            addView(fieldLabel(context.getString(R.string.recipient_token_label)))
            addView(monospaceValue(identity.recipientToken, context.getString(R.string.recipient_token_label)))
            addView(copyButton(onCopyRecipientToken))
        }

    private fun copyButton(onCopyRecipientToken: () -> Unit): Button =
        Button(context).apply {
            text = context.getString(R.string.copy_recipient_token)
            contentDescription = context.getString(R.string.copy_recipient_token)
            isAllCaps = false
            setOnClickListener { onCopyRecipientToken() }
        }

    private fun title(value: String): TextView =
        TextView(context).apply {
            text = value
            setTextColor(color(R.color.gremia_text_primary))
            textSize = 28f
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
        }

    private fun sectionTitle(value: String): TextView =
        TextView(context).apply {
            text = value
            setTextColor(color(R.color.gremia_text_primary))
            textSize = 22f
            typeface = Typeface.DEFAULT_BOLD
        }

    private fun kicker(value: String): TextView =
        TextView(context).apply {
            text = value
            setTextColor(color(R.color.gremia_accent))
            textSize = 12f
            letterSpacing = 0.22f
            typeface = Typeface.DEFAULT_BOLD
        }

    private fun paragraph(value: String): TextView =
        TextView(context).apply {
            text = value
            setTextColor(color(R.color.gremia_text_secondary))
            textSize = 16f
            setPadding(0, dimen(R.dimen.space_sm), 0, dimen(R.dimen.space_lg))
        }

    private fun fieldLabel(value: String): TextView =
        TextView(context).apply {
            text = value
            setTextColor(color(R.color.gremia_text_secondary))
            textSize = 12f
            typeface = Typeface.DEFAULT_BOLD
            letterSpacing = 0.16f
            setPadding(0, dimen(R.dimen.space_md), 0, dimen(R.dimen.space_xs))
        }

    private fun monospaceValue(value: String, label: String): TextView =
        TextView(context).apply {
            text = value
            contentDescription = "$label: $value"
            setTextColor(color(R.color.gremia_text_primary))
            textSize = 14f
            typeface = Typeface.MONOSPACE
            setTextIsSelectable(true)
            val padding = dimen(R.dimen.space_md)
            setPadding(padding, padding, padding, padding)
            background = valueBackground()
        }

    private fun panelBackground(): GradientDrawable =
        GradientDrawable().apply {
            setColor(color(R.color.gremia_surface))
            setStroke(dimen(R.dimen.border_width), color(R.color.gremia_border))
        }

    private fun valueBackground(): GradientDrawable =
        GradientDrawable().apply {
            setColor(color(R.color.gremia_value_background))
            setStroke(dimen(R.dimen.border_width), color(R.color.gremia_border))
        }

    private fun dimen(id: Int): Int = context.resources.getDimensionPixelSize(id)

    private fun color(id: Int): Int = context.getColor(id)
}
