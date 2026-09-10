package de.gremia.sbv.companion

import android.app.Activity
import android.os.Bundle
import android.view.Gravity
import android.widget.LinearLayout
import android.widget.TextView

class MainActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(createShellView())
    }

    private fun createShellView(): LinearLayout {
        val spacing = resources.getDimensionPixelSize(R.dimen.screen_padding)
        return LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(spacing, spacing, spacing, spacing)
            setBackgroundColor(getColor(R.color.gremia_background))
            addView(titleView())
            addView(descriptionView())
        }
    }

    private fun titleView(): TextView =
        TextView(this).apply {
            text = getString(R.string.app_name)
            setTextColor(getColor(R.color.gremia_text_primary))
            textSize = 28f
            gravity = Gravity.CENTER
            contentDescription = getString(R.string.app_name)
        }

    private fun descriptionView(): TextView =
        TextView(this).apply {
            text = getString(R.string.app_shell_description)
            setTextColor(getColor(R.color.gremia_text_secondary))
            textSize = 16f
            gravity = Gravity.CENTER
        }
}
