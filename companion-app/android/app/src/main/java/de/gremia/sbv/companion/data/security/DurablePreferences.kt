package de.gremia.sbv.companion.data.security

import android.annotation.SuppressLint
import android.content.SharedPreferences

@SuppressLint("ApplySharedPref")
fun SharedPreferences.Editor.commitOrThrow(message: String) {
    requireCommitted(commit(), message)
}

internal fun requireCommitted(committed: Boolean, message: String) {
    check(committed) { message }
}
