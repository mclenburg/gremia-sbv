package de.gremia.sbv.companion.ui

import android.content.Context
import android.app.AlertDialog
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.text.InputType
import android.view.Gravity
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import de.gremia.sbv.companion.R

class GremiaUi(private val context: Context) {
    val tabletLayout: Boolean
        get() = context.resources.configuration.smallestScreenWidthDp >= 600

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
                inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_MULTI_LINE or InputType.TYPE_TEXT_FLAG_CAP_SENTENCES
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
            minHeight = dimen(R.dimen.button_min_height)
            val padding = dimen(R.dimen.space_md)
            setPadding(padding, 0, padding, 0)
            setOnClickListener { onClick() }
        }

    fun navigationButton(label: String, selected: Boolean, onClick: () -> Unit): Button =
        Button(context).apply {
            text = label
            contentDescription = label
            isAllCaps = false
            setTextColor(color(if (selected) R.color.gremia_background else R.color.gremia_text_primary))
            textSize = 14f
            typeface = Typeface.DEFAULT_BOLD
            background = if (selected) actionBackground() else valueBackground()
            minHeight = dimen(R.dimen.button_min_height)
            val padding = dimen(R.dimen.space_md)
            setPadding(padding, 0, padding, 0)
            setOnClickListener { onClick() }
        }

    fun helpButton(title: String, message: String): Button =
        Button(context).apply {
            text = context.getString(R.string.help_action)
            contentDescription = "${context.getString(R.string.help_action)}: $title"
            isAllCaps = false
            setTextColor(color(R.color.gremia_text_primary))
            textSize = 14f
            typeface = Typeface.DEFAULT_BOLD
            background = valueBackground()
            minHeight = dimen(R.dimen.button_min_height)
            setOnClickListener {
                AlertDialog.Builder(context)
                    .setTitle(title)
                    .setMessage(message)
                    .setPositiveButton(android.R.string.ok, null)
                    .show()
            }
        }

    fun sectionHeader(title: String, helpText: String? = null): LinearLayout =
        LinearLayout(context).apply {
            orientation = if (tabletLayout) LinearLayout.HORIZONTAL else LinearLayout.VERTICAL
            gravity = if (tabletLayout) Gravity.CENTER_VERTICAL else Gravity.NO_GRAVITY
            addView(sectionTitle(title).apply {
                layoutParams = LinearLayout.LayoutParams(
                    if (tabletLayout) 0 else LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    if (tabletLayout) 1f else 0f,
                )
            })
            if (helpText != null) {
                addView(helpButton(title, helpText).apply {
                    layoutParams = LinearLayout.LayoutParams(
                        if (tabletLayout) LinearLayout.LayoutParams.WRAP_CONTENT else LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT,
                    ).apply {
                        if (tabletLayout) leftMargin = dimen(R.dimen.space_md) else topMargin = dimen(R.dimen.space_sm)
                    }
                })
            }
        }

    fun horizontalActions(vararg buttons: Button): LinearLayout =
        LinearLayout(context).apply {
            orientation = if (tabletLayout) LinearLayout.HORIZONTAL else LinearLayout.VERTICAL
            buttons.forEachIndexed { index, button ->
                button.layoutParams = LinearLayout.LayoutParams(
                    if (tabletLayout) 0 else ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                    if (tabletLayout) 1f else 0f,
                ).apply {
                    if (index > 0 && tabletLayout) leftMargin = dimen(R.dimen.space_sm)
                    if (index > 0 && !tabletLayout) topMargin = dimen(R.dimen.space_sm)
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

    fun responsiveColumns(left: LinearLayout, right: LinearLayout): LinearLayout =
        LinearLayout(context).apply {
            orientation = if (tabletLayout) LinearLayout.HORIZONTAL else LinearLayout.VERTICAL
            left.layoutParams = LinearLayout.LayoutParams(
                if (tabletLayout) 0 else LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT,
                if (tabletLayout) 1f else 0f,
            )
            right.layoutParams = LinearLayout.LayoutParams(
                if (tabletLayout) 0 else LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT,
                if (tabletLayout) 1.35f else 0f,
            ).apply {
                if (tabletLayout) leftMargin = dimen(R.dimen.space_lg)
            }
            addView(left)
            addView(right)
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
