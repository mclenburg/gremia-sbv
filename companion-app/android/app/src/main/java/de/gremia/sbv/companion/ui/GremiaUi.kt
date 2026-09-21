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
import de.gremia.sbv.companion.domain.security.MobileThemeMode

class GremiaUi(
    private val context: Context,
    private val themeMode: MobileThemeMode = MobileThemeMode.Dark,
) {
    val tabletLayout: Boolean
        get() = context.resources.configuration.smallestScreenWidthDp >= 600

    fun title(value: String): TextView =
        TextView(context).apply {
            text = value
            setTextColor(textPrimaryColor())
            textSize = 28f
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
        }

    fun sectionTitle(value: String): TextView =
        TextView(context).apply {
            text = value
            setTextColor(textPrimaryColor())
            textSize = 22f
            typeface = Typeface.DEFAULT_BOLD
        }

    fun kicker(value: String): TextView =
        TextView(context).apply {
            text = value
            setTextColor(accentColor())
            textSize = 12f
            letterSpacing = 0.22f
            typeface = Typeface.DEFAULT_BOLD
        }

    fun paragraph(value: String): TextView =
        TextView(context).apply {
            text = value
            setTextColor(textSecondaryColor())
            textSize = 16f
            setPadding(0, dimen(R.dimen.space_sm), 0, dimen(R.dimen.space_lg))
        }

    fun fieldLabel(value: String): TextView =
        TextView(context).apply {
            text = value
            setTextColor(textSecondaryColor())
            textSize = 12f
            typeface = Typeface.DEFAULT_BOLD
            letterSpacing = 0.16f
            setPadding(0, dimen(R.dimen.space_md), 0, dimen(R.dimen.space_xs))
        }

    fun monospaceValue(value: String, label: String): TextView =
        TextView(context).apply {
            text = value
            contentDescription = "$label: $value"
            setTextColor(textPrimaryColor())
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
            setTextColor(textPrimaryColor())
            setHintTextColor(textSecondaryColor())
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
            setTextColor(textPrimaryColor())
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
            setTextColor(textPrimaryColor())
            textSize = 15f
            setPadding(0, dimen(R.dimen.space_xs), 0, dimen(R.dimen.space_xs))
        }

    fun actionListItem(primary: String, secondary: String?, actionLabel: String, onAction: () -> Unit): LinearLayout =
        LinearLayout(context).apply {
            orientation = if (tabletLayout) LinearLayout.HORIZONTAL else LinearLayout.VERTICAL
            gravity = if (tabletLayout) Gravity.CENTER_VERTICAL else Gravity.NO_GRAVITY
            addView(listItem(primary, secondary).apply {
                layoutParams = LinearLayout.LayoutParams(
                    if (tabletLayout) 0 else LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    if (tabletLayout) 1f else 0f,
                )
            })
            addView(secondaryButton(actionLabel, onAction).apply {
                layoutParams = LinearLayout.LayoutParams(
                    if (tabletLayout) LinearLayout.LayoutParams.WRAP_CONTENT else LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                ).apply {
                    if (tabletLayout) leftMargin = dimen(R.dimen.space_sm) else topMargin = dimen(R.dimen.space_sm)
                }
            })
        }

    fun confirmingSecondaryButton(label: String, title: String, message: String, onConfirmed: () -> Unit): Button =
        secondaryButton(label) {
            AlertDialog.Builder(context)
                .setTitle(title)
                .setMessage(message)
                .setNegativeButton(android.R.string.cancel, null)
                .setPositiveButton(label) { _, _ -> onConfirmed() }
                .show()
        }

    fun button(label: String, onClick: () -> Unit): Button =
        Button(context).apply {
            text = label
            contentDescription = label
            isAllCaps = false
            setTextColor(actionTextColor())
            textSize = 14f
            typeface = Typeface.DEFAULT_BOLD
            background = actionBackground()
            minHeight = dimen(R.dimen.button_min_height)
            val padding = dimen(R.dimen.space_md)
            setPadding(padding, 0, padding, 0)
            setOnClickListener { onClick() }
        }

    fun secondaryButton(label: String, onClick: () -> Unit): Button =
        Button(context).apply {
            text = label
            contentDescription = label
            isAllCaps = false
            setTextColor(textPrimaryColor())
            textSize = 14f
            typeface = Typeface.DEFAULT_BOLD
            background = valueBackground()
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
            setTextColor(if (selected) actionTextColor() else textPrimaryColor())
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
            setTextColor(textPrimaryColor())
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

    fun summaryCard(label: String, value: String): LinearLayout =
        LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            background = valueBackground()
            val padding = dimen(R.dimen.space_md)
            setPadding(padding, padding, padding, padding)
            addView(kicker(label))
            addView(sectionTitle(value))
        }

    fun promptForOptionalText(
        title: String,
        label: String,
        hint: String,
        confirmLabel: String,
        onConfirmed: (String) -> Unit,
    ) {
        val input = textInput(label, hint)
        val content = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            val padding = dimen(R.dimen.space_lg)
            setPadding(padding, padding, padding, padding)
            addView(fieldLabel(label))
            addView(input)
        }
        AlertDialog.Builder(context)
            .setTitle(title)
            .setView(content)
            .setNegativeButton(android.R.string.cancel, null)
            .setPositiveButton(confirmLabel) { _, _ -> onConfirmed(input.text.toString()) }
            .show()
    }

    fun valueBackground(): GradientDrawable =
        GradientDrawable().apply {
            setColor(valueBackgroundColor())
            setStroke(dimen(R.dimen.border_width), borderColor())
        }

    fun dimen(id: Int): Int = context.resources.getDimensionPixelSize(id)

    fun color(id: Int): Int = context.getColor(id)

    fun backgroundColor(): Int = themedColor(R.color.gremia_background, R.color.gremia_background_light)

    private fun panelBackground(): GradientDrawable =
        GradientDrawable().apply {
            setColor(themedColor(R.color.gremia_surface, R.color.gremia_surface_light))
            setStroke(dimen(R.dimen.border_width), borderColor())
        }

    private fun actionBackground(): GradientDrawable =
        GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM, intArrayOf(
            accentColor(),
            themedColor(R.color.gremia_accent_dark, R.color.gremia_accent_dark_light),
        )).apply {
            setStroke(dimen(R.dimen.border_width), accentColor())
        }

    private fun textPrimaryColor(): Int = themedColor(R.color.gremia_text_primary, R.color.gremia_text_primary_light)

    private fun textSecondaryColor(): Int = themedColor(R.color.gremia_text_secondary, R.color.gremia_text_secondary_light)

    private fun valueBackgroundColor(): Int = themedColor(R.color.gremia_value_background, R.color.gremia_value_background_light)

    private fun borderColor(): Int = themedColor(R.color.gremia_border, R.color.gremia_border_light)

    private fun accentColor(): Int = themedColor(R.color.gremia_accent, R.color.gremia_accent_light)

    private fun actionTextColor(): Int = color(R.color.gremia_action_text)

    private fun themedColor(darkColor: Int, lightColor: Int): Int =
        color(if (themeMode == MobileThemeMode.Light) lightColor else darkColor)
}
