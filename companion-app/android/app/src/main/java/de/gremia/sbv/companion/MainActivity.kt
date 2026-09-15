package de.gremia.sbv.companion

import android.app.Activity
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.os.Bundle
import android.widget.Toast
import de.gremia.sbv.companion.data.mobile.MobileSnapshotRepository
import de.gremia.sbv.companion.data.transfer.TransferIdentityRepository
import de.gremia.sbv.companion.domain.mobile.MobileSnapshotIntakeResult
import de.gremia.sbv.companion.domain.mobile.MobileSnapshotQrController
import de.gremia.sbv.companion.ui.AppShellRenderer

class MainActivity : Activity() {
    private lateinit var identityRepository: TransferIdentityRepository
    private lateinit var snapshotRepository: MobileSnapshotRepository
    private lateinit var snapshotController: MobileSnapshotQrController

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        identityRepository = TransferIdentityRepository(this)
        snapshotRepository = MobileSnapshotRepository(this)
        snapshotController = MobileSnapshotQrController(identityRepository.getOrCreate(), snapshotRepository)
        renderContent()
    }

    private fun renderContent() {
        val identity = identityRepository.getOrCreate()
        setContentView(
            AppShellRenderer(this).render(
                identity = identity,
                snapshot = snapshotRepository.current(),
                onCopyRecipientToken = { copyRecipientToken(identity.recipientToken) },
                onAcceptFrame = { frame ->
                    val result = snapshotController.accept(frame)
                    Toast.makeText(this, result.message, Toast.LENGTH_SHORT).show()
                    if (result is MobileSnapshotIntakeResult.Completed) renderContent()
                    result
                },
                onResetFrames = {
                    snapshotController.reset()
                    Toast.makeText(this, R.string.snapshot_frames_reset, Toast.LENGTH_SHORT).show()
                },
            ),
        )
    }

    private fun copyRecipientToken(recipientToken: String) {
        val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        clipboard.setPrimaryClip(ClipData.newPlainText(getString(R.string.recipient_token_label), recipientToken))
        Toast.makeText(this, R.string.recipient_token_copied, Toast.LENGTH_SHORT).show()
    }
}
