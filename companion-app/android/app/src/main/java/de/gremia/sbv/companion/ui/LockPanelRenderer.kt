package de.gremia.sbv.companion.ui

import android.content.Context
import android.view.Gravity
import android.widget.LinearLayout
import android.widget.ScrollView
import de.gremia.sbv.companion.R

class LockPanelRenderer(
    private val context: Context,
) {
    private val ui = GremiaUi(context)

    fun render(
        canUseDeviceCredential: Boolean,
        onUnlock: () -> Unit,
        onOpenSecuritySettings: () -> Unit,
    ): ScrollView =
        ScrollView(context).apply {
            setBackgroundColor(ui.color(R.color.gremia_background))
            addView(LinearLayout(context).apply {
                orientation = LinearLayout.VERTICAL
                gravity = Gravity.CENTER_HORIZONTAL
                val padding = ui.dimen(R.dimen.screen_padding)
                setPadding(padding, padding, padding, padding)
                addView(ui.kicker(context.getString(R.string.lock_kicker)))
                addView(ui.title(context.getString(R.string.lock_title)))
                addView(ui.paragraph(context.getString(R.string.lock_description)))
                addView(ui.panel().apply {
                    if (canUseDeviceCredential) {
                        addView(ui.paragraph(context.getString(R.string.lock_unlock_description)))
                        addView(ui.button(context.getString(R.string.lock_unlock_action), onUnlock))
                    } else {
                        addView(ui.sectionTitle(context.getString(R.string.lock_required_title)))
                        addView(ui.paragraph(context.getString(R.string.lock_required_description)))
                        addView(ui.button(context.getString(R.string.lock_open_security_settings), onOpenSecuritySettings))
                    }
                })
            })
        }
}
