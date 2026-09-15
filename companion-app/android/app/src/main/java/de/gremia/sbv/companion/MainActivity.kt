package de.gremia.sbv.companion

import android.app.Activity
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.core.content.FileProvider
import de.gremia.sbv.companion.data.mobile.MobileReturnDraftRepository
import de.gremia.sbv.companion.data.mobile.MobileSnapshotRepository
import de.gremia.sbv.companion.data.transfer.TransferIdentityRepository
import de.gremia.sbv.companion.domain.mobile.MobileReturnPackageCreator
import de.gremia.sbv.companion.domain.mobile.MobileSnapshotIntakeResult
import de.gremia.sbv.companion.domain.mobile.MobileSnapshotQrController
import de.gremia.sbv.companion.ui.AppShellRenderer
import java.io.File

class MainActivity : Activity() {
    private lateinit var identityRepository: TransferIdentityRepository
    private lateinit var snapshotRepository: MobileSnapshotRepository
    private lateinit var returnDraftRepository: MobileReturnDraftRepository
    private lateinit var returnPackageCreator: MobileReturnPackageCreator
    private lateinit var snapshotController: MobileSnapshotQrController

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        identityRepository = TransferIdentityRepository(this)
        snapshotRepository = MobileSnapshotRepository(this)
        returnDraftRepository = MobileReturnDraftRepository(this)
        returnPackageCreator = MobileReturnPackageCreator(this)
        snapshotController = MobileSnapshotQrController(identityRepository.getOrCreate(), snapshotRepository)
        renderContent()
    }

    private fun renderContent() {
        val identity = identityRepository.getOrCreate()
        setContentView(
            AppShellRenderer(this).render(
                identity = identity,
                snapshot = snapshotRepository.current(),
                returnNotes = returnDraftRepository.listNotes(),
                onCopyRecipientToken = { copyRecipientToken(identity.recipientToken) },
                onAcceptFrame = { frame ->
                    val result = snapshotController.accept(frame)
                    Toast.makeText(this, result.message, Toast.LENGTH_SHORT).show()
                    if (result is MobileSnapshotIntakeResult.Completed) {
                        returnDraftRepository.clear()
                        renderContent()
                    }
                    result
                },
                onResetFrames = {
                    snapshotController.reset()
                    Toast.makeText(this, R.string.snapshot_frames_reset, Toast.LENGTH_SHORT).show()
                },
                onAddReturnNote = { caseId, title, content -> addReturnNote(caseId, title, content) },
                onCreateReturnPackage = { createAndShareReturnPackage() },
                onClearReturnNotes = {
                    returnDraftRepository.clear()
                    renderContent()
                },
            ),
        )
    }

    private fun copyRecipientToken(recipientToken: String) {
        val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        clipboard.setPrimaryClip(ClipData.newPlainText(getString(R.string.recipient_token_label), recipientToken))
        Toast.makeText(this, R.string.recipient_token_copied, Toast.LENGTH_SHORT).show()
    }

    private fun addReturnNote(caseId: String, title: String, content: String) {
        runCatching {
            returnDraftRepository.addNote(caseId, title, content)
        }.onSuccess {
            renderContent()
        }.onFailure { cause ->
            Toast.makeText(this, cause.message ?: getString(R.string.return_title), Toast.LENGTH_LONG).show()
        }
    }

    private fun createAndShareReturnPackage() {
        runCatching {
            val snapshot = requireNotNull(snapshotRepository.current()) { getString(R.string.return_empty) }
            returnPackageCreator.create(snapshot, identityRepository.getOrCreate(), returnDraftRepository.listNotes())
        }.onSuccess { result ->
            Toast.makeText(this, R.string.return_file_ready, Toast.LENGTH_SHORT).show()
            val file = File(result.filePath)
            val uri = FileProvider.getUriForFile(this, "${packageName}.files", file)
            val sendIntent = Intent(Intent.ACTION_SEND).apply {
                type = "application/vnd.gremia.sbv.mobile-return"
                putExtra(Intent.EXTRA_STREAM, uri)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            startActivity(Intent.createChooser(sendIntent, getString(R.string.return_share_title)))
        }.onFailure { cause ->
            Toast.makeText(this, cause.message ?: getString(R.string.return_title), Toast.LENGTH_LONG).show()
        }
    }
}
