package de.gremia.sbv.companion

import android.Manifest
import android.content.Context
import android.content.Intent
import android.app.KeyguardManager
import android.content.pm.PackageManager
import android.hardware.biometrics.BiometricManager
import android.hardware.biometrics.BiometricPrompt
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.CancellationSignal
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.provider.Settings
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.ComponentActivity
import androidx.annotation.RequiresApi
import androidx.core.content.ContextCompat
import com.journeyapps.barcodescanner.ScanContract
import com.journeyapps.barcodescanner.ScanOptions
import de.gremia.sbv.companion.data.mobile.MobileReturnDraftRepository
import de.gremia.sbv.companion.data.mobile.MobileDeadlineNotificationScheduler
import de.gremia.sbv.companion.data.mobile.MobileSnapshotRepository
import de.gremia.sbv.companion.data.mobile.MobileSyncJournalRepository
import de.gremia.sbv.companion.data.security.AndroidMobileDataResetOperations
import de.gremia.sbv.companion.data.security.MobileAppSettingsRepository
import de.gremia.sbv.companion.data.transfer.TransferIdentityRepository
import de.gremia.sbv.companion.domain.mobile.MobileDeadlineProjection
import de.gremia.sbv.companion.data.transfer.TargetBoundSnapshotDecryptor
import de.gremia.sbv.companion.data.transfer.MobileDesktopTrustRepository
import de.gremia.sbv.companion.domain.mobile.accepts
import de.gremia.sbv.companion.ui.MobilePairingFlow
import de.gremia.sbv.companion.domain.mobile.MobileReturnPackageFile
import de.gremia.sbv.companion.domain.mobile.MobileReturnPackageCreator
import de.gremia.sbv.companion.domain.mobile.MobileSnapshotIntakeResult
import de.gremia.sbv.companion.domain.mobile.MobileSnapshotQrController
import de.gremia.sbv.companion.domain.mobile.MobileSnapshotReplacementPolicy
import de.gremia.sbv.companion.domain.security.MobileLockPolicy
import de.gremia.sbv.companion.domain.security.MobileAppSettings
import de.gremia.sbv.companion.domain.security.MobileAutoLockTimeout
import de.gremia.sbv.companion.domain.security.MobileDataResetCoordinator
import de.gremia.sbv.companion.domain.security.MobileThemeMode
import de.gremia.sbv.companion.ui.AppShellRenderer
import de.gremia.sbv.companion.ui.LockPanelRenderer
import de.gremia.sbv.companion.ui.MobileAppSection
import de.gremia.sbv.companion.ui.MobileWindowProtection
import java.io.File
import java.io.FileInputStream

private const val LOCK_CHECK_INTERVAL_MILLIS = 15_000L
private const val RETURN_PACKAGE_MIME_TYPE = "application/vnd.gremia.sbv.mobile-return"

class MainActivity : ComponentActivity() {
    private lateinit var identityRepository: TransferIdentityRepository
    private lateinit var snapshotRepository: MobileSnapshotRepository
    private lateinit var returnDraftRepository: MobileReturnDraftRepository
    private lateinit var returnPackageCreator: MobileReturnPackageCreator
    private lateinit var deadlineNotificationScheduler: MobileDeadlineNotificationScheduler
    private lateinit var snapshotController: MobileSnapshotQrController
    private lateinit var syncJournalRepository: MobileSyncJournalRepository
    private lateinit var settingsRepository: MobileAppSettingsRepository
    private lateinit var desktopTrust: MobileDesktopTrustRepository
    private lateinit var pairingFlow: MobilePairingFlow
    private val snapshotReplacementPolicy = MobileSnapshotReplacementPolicy()
    private var appSettings = MobileAppSettings()
    private var lockPolicy = MobileLockPolicy(appSettings.autoLockTimeout.milliseconds)
    private val lockCheckHandler = Handler(Looper.getMainLooper())
    private var unlocked = false
    private var lastInteractionAtMillis = 0L
    private var activeSection = MobileAppSection.Dashboard
    private var unlockCancellationSignal: CancellationSignal? = null
    private var pendingReturnPackage: MobileReturnPackageFile? = null
    private val windowProtection by lazy { MobileWindowProtection(this) }
    private val diagnosticExport = de.gremia.sbv.companion.ui.MobileDiagnosticExport(this, { unlocked }) {
        de.gremia.sbv.companion.domain.security.MobileDiagnosticReport(
            androidx.core.content.pm.PackageInfoCompat.getLongVersionCode(packageManager.getPackageInfo(packageName, 0)),
            Build.VERSION.SDK_INT, snapshotRepository.current() != null,
            returnDraftRepository.listDrafts().changeCount, appSettings,
        )
    }
    private val qrScanLauncher = registerForActivityResult(ScanContract()) { result ->
        if (result.contents != null) acceptScannedSnapshotFrame(result.contents)
    }
    private val unlockLauncher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        if (result.resultCode == RESULT_OK) {
            unlock()
        } else {
            renderLockScreen()
        }
    }
    private val notificationPermissionLauncher = registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) snapshotRepository.current()?.let { snapshot -> deadlineNotificationScheduler.schedule(snapshot) }
    }
    private val returnPackageDocumentLauncher = registerForActivityResult(
        ActivityResultContracts.CreateDocument(RETURN_PACKAGE_MIME_TYPE),
    ) { uri ->
        completeReturnPackageSave(uri)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        settingsRepository = MobileAppSettingsRepository(this)
        appSettings = settingsRepository.load()
        lockPolicy = MobileLockPolicy(appSettings.autoLockTimeout.milliseconds)
        windowProtection.apply(appSettings, currentThemeMode())
        identityRepository = TransferIdentityRepository(this)
        snapshotRepository = MobileSnapshotRepository(this)
        returnDraftRepository = MobileReturnDraftRepository(this)
        returnPackageCreator = MobileReturnPackageCreator(this)
        deadlineNotificationScheduler = MobileDeadlineNotificationScheduler(this)
        syncJournalRepository = MobileSyncJournalRepository(this)
        desktopTrust = MobileDesktopTrustRepository(this)
        pairingFlow = MobilePairingFlow(this, identityRepository::getOrCreate, desktopTrust, { unlocked },
            { snapshotRepository.current() != null || returnDraftRepository.listDrafts().changeCount > 0 }, ::renderContent)
        returnPackageCreator.clearTemporaryPackages()
        snapshotController = newSnapshotController()
        val initial = lockPolicy.initialState()
        unlocked = !initial.locked
        if (unlocked) renderContent() else renderLockScreen()
    }

    override fun onUserInteraction() {
        super.onUserInteraction()
        if (unlocked) lastInteractionAtMillis = SystemClock.elapsedRealtime()
    }

    override fun onDestroy() {
        unlockCancellationSignal?.cancel()
        unlockCancellationSignal = null
        lockCheckHandler.removeCallbacksAndMessages(null)
        if (::pairingFlow.isInitialized) pairingFlow.close()
        super.onDestroy()
    }

    private fun renderLockScreen() {
        if (::pairingFlow.isInitialized) pairingFlow.cancel()
        if (::snapshotController.isInitialized) snapshotController.reset()
        lockCheckHandler.removeCallbacksAndMessages(null)
        setContentView(
            LockPanelRenderer(this, currentThemeMode()).render(
                canUseDeviceCredential = canUseDeviceCredential(),
                onUnlock = { requestUnlock() },
                onOpenSecuritySettings = { startActivity(Intent(Settings.ACTION_SECURITY_SETTINGS)) },
            ),
        )
    }

    private fun renderContent() {
        if (!unlocked) {
            renderLockScreen()
            return
        }
        windowProtection.apply(appSettings, currentThemeMode())
        val identity = identityRepository.getOrCreate()
        setContentView(
            AppShellRenderer(this, currentThemeMode()).render(
                identity = identity,
                snapshot = snapshotRepository.current(),
                pendingImport = snapshotController.pendingPreview(),
                returnDrafts = returnDraftRepository.listDrafts(),
                syncEvents = syncJournalRepository.listEvents(),
                settings = appSettings,
                activeSection = activeSection,
                onSelectSection = { section ->
                    activeSection = section
                    renderContent()
                },
                renderPairing = pairingFlow::render,
                onScanFrame = { startQrScan() },
                onAcceptFrame = { frame ->
                    acceptSnapshotFrame(frame)
                },
                onResetFrames = {
                    snapshotController.reset()
                    Toast.makeText(this, R.string.snapshot_frames_reset, Toast.LENGTH_SHORT).show()
                    renderContent()
                },
                onConfirmImport = { confirmSnapshotImport() },
                onCancelImport = { cancelSnapshotImport() },
                onAddReturnNote = { caseId, title, content, noteType, nextSteps -> saveCapture { returnDraftRepository.addNote(caseId, title, content, noteType, nextSteps) } },
                onAddReturnInbox = { title, content, nextSteps -> saveCapture { returnDraftRepository.addInbox(title, content, nextSteps) } },
                onAddReturnDeadline = { caseId, title, dueAt, description, severity ->
                    addReturnDeadline(caseId, title, dueAt, description, severity)
                },
                onCompleteReturnDeadline = { deadline, completedNote ->
                    completeReturnDeadline(deadline, completedNote)
                },
                onCreateReturnPackage = { createAndSaveReturnPackage() },
                onDiscardReturnDraft = { mobileId ->
                    if (returnDraftRepository.remove(mobileId)) renderContent()
                },
                onClearReturnDrafts = {
                    returnDraftRepository.clear()
                    renderContent()
                },
                onSetAutoLockTimeout = { timeout -> updateAutoLockTimeout(timeout) },
                onSetSecureScreen = { enabled -> updateSecureScreen(enabled) },
                onClearWorkData = { clearMobileWorkData() },
                onInitializeNewDevice = { initializeNewDevice() },
                onExportDiagnostics = diagnosticExport::launch,
            ),
        )
        scheduleAutoLockCheck()
    }

    private fun canUseDeviceCredential(): Boolean {
        val keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
        return keyguardManager.isDeviceSecure
    }

    private fun requestUnlock() {
        if (!canUseDeviceCredential()) {
            renderLockScreen()
            return
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            requestPlatformUnlock()
        } else {
            requestLegacyUnlock()
        }
    }

    @RequiresApi(Build.VERSION_CODES.Q)
    private fun requestPlatformUnlock() {
        unlockCancellationSignal?.cancel()
        val cancellationSignal = CancellationSignal()
        unlockCancellationSignal = cancellationSignal
        val builder = BiometricPrompt.Builder(this)
            .setTitle(getString(R.string.lock_title))
            .setDescription(getString(R.string.lock_unlock_description))
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            builder.setAllowedAuthenticators(
                BiometricManager.Authenticators.DEVICE_CREDENTIAL or
                    BiometricManager.Authenticators.BIOMETRIC_STRONG,
            )
        } else {
            @Suppress("DEPRECATION")
            builder.setDeviceCredentialAllowed(true)
        }
        builder.build().authenticate(
            cancellationSignal,
            java.util.concurrent.Executor { command -> lockCheckHandler.post(command) },
            object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult?) {
                    unlockCancellationSignal = null
                    unlock()
                }

                override fun onAuthenticationError(errorCode: Int, errString: CharSequence?) {
                    unlockCancellationSignal = null
                    if (errorCode != BiometricPrompt.BIOMETRIC_ERROR_CANCELED) {
                        Toast.makeText(
                            this@MainActivity,
                            errString ?: getString(R.string.lock_title),
                            Toast.LENGTH_LONG,
                        ).show()
                    }
                    renderLockScreen()
                }
            },
        )
    }

    @Suppress("DEPRECATION")
    private fun requestLegacyUnlock() {
        val keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
        val intent = keyguardManager.createConfirmDeviceCredentialIntent(
            getString(R.string.lock_title),
            getString(R.string.lock_unlock_description),
        )
        if (intent == null) {
            unlock()
            return
        }
        unlockLauncher.launch(intent)
    }

    private fun unlock() {
        unlocked = true
        lastInteractionAtMillis = SystemClock.elapsedRealtime()
        renderContent()
    }

    private fun scheduleAutoLockCheck() {
        lockCheckHandler.removeCallbacksAndMessages(null)
        lockCheckHandler.postDelayed({
            val decision = lockPolicy.stateForInactivity(
                unlocked = unlocked,
                lastInteractionAtMillis = lastInteractionAtMillis,
                nowMillis = SystemClock.elapsedRealtime(),
            )
            if (decision.locked) {
                unlocked = false
                renderLockScreen()
            } else {
                scheduleAutoLockCheck()
            }
        }, LOCK_CHECK_INTERVAL_MILLIS)
    }

    private fun newSnapshotController() = MobileSnapshotQrController(
        identityRepository.getOrCreate(), snapshotRepository, desktopTrust::accepts,
        decryptor = TargetBoundSnapshotDecryptor({ desktopTrust.current()?.identity }),
    )

    private fun currentThemeMode(): MobileThemeMode {
        val snapshotTheme = if (::snapshotRepository.isInitialized) snapshotRepository.current()?.themeMode else null
        return MobileThemeMode.fromSnapshot(snapshotTheme)
    }

    private fun updateAutoLockTimeout(timeout: MobileAutoLockTimeout) {
        appSettings = appSettings.copy(autoLockTimeout = timeout)
        settingsRepository.save(appSettings)
        lockPolicy = MobileLockPolicy(timeout.milliseconds)
        lastInteractionAtMillis = SystemClock.elapsedRealtime()
        renderContent()
    }

    private fun updateSecureScreen(enabled: Boolean) {
        appSettings = appSettings.copy(secureScreenEnabled = enabled)
        settingsRepository.save(appSettings)
        windowProtection.apply(appSettings, currentThemeMode())
        renderContent()
    }

    private fun clearMobileWorkData() {
        dataResetCoordinator().clearWorkData()
        snapshotController = newSnapshotController()
        activeSection = MobileAppSection.Dashboard
        Toast.makeText(this, R.string.settings_work_data_cleared, Toast.LENGTH_LONG).show()
        renderContent()
    }

    private fun initializeNewDevice() {
        dataResetCoordinator().initializeNewDevice()
        appSettings = settingsRepository.load()
        lockPolicy = MobileLockPolicy(appSettings.autoLockTimeout.milliseconds)
        windowProtection.apply(appSettings, currentThemeMode())
        snapshotController = newSnapshotController()
        activeSection = MobileAppSection.Synchronization
        Toast.makeText(this, R.string.settings_device_initialized, Toast.LENGTH_LONG).show()
        renderContent()
    }

    private fun dataResetCoordinator(): MobileDataResetCoordinator =
        MobileDataResetCoordinator(
            AndroidMobileDataResetOperations(
                resetPendingSnapshot = snapshotController::reset,
                snapshotRepository = snapshotRepository,
                returnDraftRepository = returnDraftRepository,
                syncJournalRepository = syncJournalRepository,
                deadlineNotificationScheduler = deadlineNotificationScheduler,
                returnPackageCreator = returnPackageCreator,
                identityRepository = identityRepository,
                desktopTrust = desktopTrust,
                settingsRepository = settingsRepository,
            ),
        )

    private fun startQrScan() {
        if (!unlocked) return
        qrScanLauncher.launch(ScanOptions().apply {
            setDesiredBarcodeFormats(ScanOptions.QR_CODE)
            setPrompt(getString(R.string.snapshot_scan_prompt))
            setBeepEnabled(false)
            setOrientationLocked(false)
        })
    }

    private fun acceptScannedSnapshotFrame(frame: String) {
        val result = acceptSnapshotFrame(frame)
        if (result is MobileSnapshotIntakeResult.Progress && unlocked) {
            startQrScan()
        }
    }

    private fun acceptSnapshotFrame(frame: String): MobileSnapshotIntakeResult {
        if (!unlocked) return MobileSnapshotIntakeResult.Error(getString(R.string.lock_title))
        val result = snapshotController.accept(frame)
        Toast.makeText(this, result.message, Toast.LENGTH_SHORT).show()
        if (result is MobileSnapshotIntakeResult.ReadyForConfirmation) {
            renderContent()
        }
        return result
    }

    private fun confirmSnapshotImport(): MobileSnapshotIntakeResult {
        val replacementDecision = snapshotReplacementPolicy.evaluate(returnDraftRepository.listDrafts())
        if (!replacementDecision.allowed) {
            return MobileSnapshotIntakeResult.Error(getString(
                R.string.snapshot_import_blocked_unsent_changes,
            ))
        }
        val result = snapshotController.confirmPendingImport()
        Toast.makeText(this, result.message, Toast.LENGTH_SHORT).show()
        if (result is MobileSnapshotIntakeResult.Completed) {
            snapshotRepository.current()?.let(syncJournalRepository::recordSnapshotImport)
            scheduleDeadlineNotifications()
            activeSection = MobileAppSection.Dashboard
            renderContent()
        }
        return result
    }

    private fun cancelSnapshotImport(): MobileSnapshotIntakeResult {
        val result = snapshotController.cancelPendingImport()
        Toast.makeText(this, result.message, Toast.LENGTH_SHORT).show()
        renderContent()
        return result
    }

    private fun scheduleDeadlineNotifications() {
        val snapshot = snapshotRepository.current() ?: return
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            deadlineNotificationScheduler.schedule(snapshot)
            return
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) {
            deadlineNotificationScheduler.schedule(snapshot)
        } else {
            notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
    }

    private fun addReturnDeadline(caseId: String, title: String, dueAt: String, description: String?, severity: String) {
        saveCapture {
            returnDraftRepository.addDeadline(caseId, title, dueAt, description, severity)
        }
    }

    private fun saveCapture(save: () -> Unit) {
        runCatching(save).onSuccess {
            activeSection = MobileAppSection.Capture
            renderContent()
        }.onFailure { cause ->
            Toast.makeText(this, cause.message ?: getString(R.string.return_title), Toast.LENGTH_LONG).show()
        }
    }

    private fun completeReturnDeadline(deadline: MobileDeadlineProjection, completedNote: String?) {
        runCatching {
            returnDraftRepository.completeDeadline(deadline, completedNote)
        }.onSuccess {
            activeSection = MobileAppSection.Deadlines
            renderContent()
        }.onFailure { cause ->
            Toast.makeText(this, cause.message ?: getString(R.string.return_title), Toast.LENGTH_LONG).show()
        }
    }

    private fun createAndSaveReturnPackage() {
        runCatching {
            val snapshot = requireNotNull(snapshotRepository.current()) { getString(R.string.return_empty) }
            returnPackageCreator.create(snapshot, identityRepository.getOrCreate(), returnDraftRepository.listDrafts())
        }.onSuccess { result ->
            pendingReturnPackage = result
            Toast.makeText(this, R.string.return_file_ready, Toast.LENGTH_SHORT).show()
            returnPackageDocumentLauncher.launch(result.fileName)
        }.onFailure { cause ->
            Toast.makeText(this, cause.message ?: getString(R.string.return_title), Toast.LENGTH_LONG).show()
        }
    }

    private fun completeReturnPackageSave(uri: Uri?) {
        val pending = pendingReturnPackage ?: return
        pendingReturnPackage = null
        if (uri == null) {
            returnPackageCreator.discardTemporaryPackage(pending.filePath)
            Toast.makeText(this, R.string.return_file_save_canceled, Toast.LENGTH_SHORT).show()
            return
        }
        runCatching {
            contentResolver.openOutputStream(uri, "w")?.use { output ->
                FileInputStream(File(pending.filePath)).use { input -> input.copyTo(output) }
            } ?: error(getString(R.string.return_file_save_failed))
        }.onSuccess {
            syncJournalRepository.recordReturnExport(pending.packageId, pending.changeCount)
            returnDraftRepository.clear()
            Toast.makeText(this, getString(R.string.return_file_saved, pending.fileName), Toast.LENGTH_LONG).show()
            renderContent()
        }.onFailure { cause ->
            Toast.makeText(this, cause.message ?: getString(R.string.return_file_save_failed), Toast.LENGTH_LONG).show()
        }.also {
            returnPackageCreator.discardTemporaryPackage(pending.filePath)
        }
    }

}
