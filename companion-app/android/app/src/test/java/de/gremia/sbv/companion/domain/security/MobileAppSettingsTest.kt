package de.gremia.sbv.companion.domain.security

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class MobileAppSettingsTest {
    @Test
    fun `verwendet nur freigegebene Auto-Lock-Zeiten und Dark als sicheren Theme-Fallback`() {
        assertEquals(MobileAutoLockTimeout.OneMinute, MobileAutoLockTimeout.fromMinutes(1))
        assertEquals(MobileAutoLockTimeout.FiveMinutes, MobileAutoLockTimeout.fromMinutes(7))
        assertEquals(15 * 60_000L, MobileAutoLockTimeout.FifteenMinutes.milliseconds)
        assertEquals(MobileThemeMode.Light, MobileThemeMode.fromSnapshot("light"))
        assertEquals(MobileThemeMode.Dark, MobileThemeMode.fromSnapshot("unbekannt"))
        assertEquals(MobileThemeMode.Dark, MobileThemeMode.fromSnapshot(null))
    }

    @Test
    fun `loescht Arbeitsbestand ohne Identitaet und initialisiert ein neues Geraet vollstaendig`() {
        val operations = RecordingResetOperations()
        val coordinator = MobileDataResetCoordinator(operations)

        coordinator.clearWorkData()
        assertEquals(
            listOf("snapshot", "drafts", "history", "notifications", "temporary"),
            operations.calls,
        )

        operations.calls.clear()
        coordinator.initializeNewDevice()
        assertEquals(
            listOf("snapshot", "drafts", "history", "notifications", "temporary", "identity", "settings"),
            operations.calls,
        )
    }

    @Test
    fun `erzwingt Displayschutz standardmaessig und trennt ihn vom Farbschema`() {
        val policy = MobileWindowProtectionPolicy()

        val protectedDark = policy.resolve(MobileAppSettings(), MobileThemeMode.Dark)
        assertTrue(protectedDark.preventScreenshots)
        assertFalse(protectedDark.useLightSystemBars)

        val explicitLight = policy.resolve(
            MobileAppSettings(secureScreenEnabled = false),
            MobileThemeMode.Light,
        )
        assertFalse(explicitLight.preventScreenshots)
        assertTrue(explicitLight.useLightSystemBars)
    }

    private class RecordingResetOperations : MobileDataResetOperations {
        val calls = mutableListOf<String>()
        override fun clearSnapshot() { calls += "snapshot" }
        override fun clearDrafts() { calls += "drafts" }
        override fun clearSyncHistory() { calls += "history" }
        override fun clearNotifications() { calls += "notifications" }
        override fun clearTemporaryFiles() { calls += "temporary" }
        override fun clearIdentity() { calls += "identity" }
        override fun resetSettings() { calls += "settings" }
    }
}
