package de.gremia.sbv.companion.ui

import android.content.Context
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.view.Gravity
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import de.gremia.sbv.companion.R

class GremiaUi(private val context: Context) {
    fun title(value: String): TextView =
        TextView(context).apply {
            text = value
            setTextColor(color(R.color.gremia_text_primary))
            textSize = 28f
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
        }

    fun sectionTitle(value: String): TextView =
        TextView(context).apply {
            text = value
            setTextColor(color(R.color.gremia_text_primary))
            textSize = 22f
            typeface = Typeface.DEFAULT_BOLD
        }

    fun kicker(value: String): TextView =
        TextView(context).apply {
            text = value
            setTextColor(color(R.color.gremia_accent))
            textSize = 12f
            letterSpacing = 0.22f
            typeface = Typeface.DEFAULT_BOLD
        }

    fun paragraph(value: String): TextView =
        TextView(context).apply {
            text = value
            setTextColor(color(R.color.gremia_text_secondary))
            textSize = 16f
            setPadding(0, dimen(R.dimen.space_sm), 0, dimen(R.dimen.space_lg))
        }

    fun fieldLabel(value: String): TextView =
        TextView(context).apply {
            text = value
            setTextColor(color(R.color.gremia_text_secondary))
            textSize = 12f
            typeface = Typeface.DEFAULT_BOLD
            letterSpacing = 0.16f
            setPadding(0, dimen(R.dimen.space_md), 0, dimen(R.dimen.space_xs))
        }

    fun monospaceValue(value: String, label: String): TextView =
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

    fun textInput(label: String, hint: String, multiLine: Boolean = false): EditText =
        EditText(context).apply {
            this.hint = hint
            contentDescription = label
            setTextColor(color(R.color.gremia_text_primary))
            setHintTextColor(color(R.color.gremia_text_secondary))
            textSize = 16f
            val padding = dimen(R.dimen.space_md)
            setPadding(padding, padding, padding, padding)
            background = valueBackground()
            if (multiLine) {
                minLines = 4
                setSingleLine(false)
            } else {
                setSingleLine(true)
            }
        }

    fun listItem(primary: String, secondary: String? = null, label: String = primary): TextView =
        TextView(context).apply {
            text = listOfNotNull(primary, secondary).joinToString("\n")
            contentDescription = label
            setTextColor(color(R.color.gremia_text_primary))
            textSize = 15f
            typeface = Typeface.DEFAULT_BOLD
            val padding = dimen(R.dimen.space_md)
            setPadding(padding, padding, padding, padding)
            background = valueBackground()
        }

    fun listText(value: String, label: String = value): TextView =
        TextView(context).apply {
            text = value
            contentDescription = label
            setTextColor(color(R.color.gremia_text_primary))
            textSize = 15f
            setPadding(0, dimen(R.dimen.space_xs), 0, dimen(R.dimen.space_xs))
        }

    fun button(label: String, onClick: () -> Unit): Button =
        Button(context).apply {
            text = label
            contentDescription = label
            isAllCaps = false
            setTextColor(color(R.color.gremia_background))
            textSize = 14f
            typeface = Typeface.DEFAULT_BOLD
            background = actionBackground()
            setOnClickListener { onClick() }
        }

    fun horizontalActions(vararg buttons: Button): LinearLayout =
        LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            buttons.forEachIndexed { index, button ->
                button.layoutParams = LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                ).apply {
                    if (index > 0) topMargin = dimen(R.dimen.space_sm)
                }
                addView(button)
            }
        }

    fun panel(): LinearLayout =
        LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            background = panelBackground()
            val padding = dimen(R.dimen.panel_padding)
            val margin = dimen(R.dimen.space_lg)
            setPadding(padding, padding, padding, padding)
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT,
            ).apply { setMargins(0, margin, 0, 0) }
        }

    fun valueBackground(): GradientDrawable =
        GradientDrawable().apply {
            setColor(color(R.color.gremia_value_background))
            setStroke(dimen(R.dimen.border_width), color(R.color.gremia_border))
        }

    fun dimen(id: Int): Int = context.resources.getDimensionPixelSize(id)

    fun color(id: Int): Int = context.getColor(id)

    private fun panelBackground(): GradientDrawable =
        GradientDrawable().apply {
            setColor(color(R.color.gremia_surface))
            setStroke(dimen(R.dimen.border_width), color(R.color.gremia_border))
        }

    private fun actionBackground(): GradientDrawable =
        GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM, intArrayOf(
            color(R.color.gremia_accent),
            color(R.color.gremia_accent_dark),
        )).apply {
            setStroke(dimen(R.dimen.border_width), color(R.color.gremia_accent))
        }
}
