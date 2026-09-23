package de.gremia.sbv.companion.data.security

import de.gremia.sbv.companion.data.mobile.MobileDeadlineNotificationScheduler
import de.gremia.sbv.companion.data.mobile.MobileReturnDraftRepository
import de.gremia.sbv.companion.data.mobile.MobileSnapshotRepository
import de.gremia.sbv.companion.data.mobile.MobileSyncJournalRepository
import de.gremia.sbv.companion.data.transfer.TransferIdentityRepository
import de.gremia.sbv.companion.domain.mobile.MobileReturnPackageCreator
import de.gremia.sbv.companion.domain.security.MobileDataResetOperations
import de.gremia.sbv.companion.domain.mobile.MobileDesktopTrustStore

class AndroidMobileDataResetOperations(
    private val resetPendingSnapshot: () -> Unit,
    private val snapshotRepository: MobileSnapshotRepository,
    private val returnDraftRepository: MobileReturnDraftRepository,
    private val syncJournalRepository: MobileSyncJournalRepository,
    private val deadlineNotificationScheduler: MobileDeadlineNotificationScheduler,
    private val returnPackageCreator: MobileReturnPackageCreator,
    private val identityRepository: TransferIdentityRepository,
    private val desktopTrust: MobileDesktopTrustStore,
    private val settingsRepository: MobileAppSettingsRepository,
) : MobileDataResetOperations {
    override fun clearSnapshot() {
        resetPendingSnapshot()
        snapshotRepository.clear()
    }

    override fun clearDrafts() = returnDraftRepository.clear(destroyKey = true)

    override fun clearSyncHistory() = syncJournalRepository.clear(destroyKey = true)

    override fun clearNotifications() = deadlineNotificationScheduler.cancelAll()

    override fun clearTemporaryFiles() = returnPackageCreator.clearTemporaryPackages()

    override fun clearIdentity() {
        desktopTrust.clear()
        identityRepository.clear()
    }

    override fun resetSettings() = settingsRepository.reset()
}
