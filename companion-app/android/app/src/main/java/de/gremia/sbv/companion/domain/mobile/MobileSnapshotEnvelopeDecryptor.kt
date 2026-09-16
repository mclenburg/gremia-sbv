package de.gremia.sbv.companion.domain.mobile

import de.gremia.sbv.companion.domain.transfer.TransferIdentity

interface MobileSnapshotEnvelopeDecryptor {
    fun decryptSnapshotEnvelope(envelopeText: String, identity: TransferIdentity): MobileSnapshot
}
