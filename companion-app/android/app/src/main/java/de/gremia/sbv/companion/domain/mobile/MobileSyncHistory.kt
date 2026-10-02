package de.gremia.sbv.companion.domain.mobile

enum class MobileSyncDirection {
    DesktopToMobile,
    MobileToDesktop,
}

data class MobileSyncEvent(
    val eventId: String,
    val direction: MobileSyncDirection,
    val packageId: String,
    val occurredAt: String,
    val caseCount: Int,
    val deadlineCount: Int,
    val changeCount: Int,
)

class MobileSyncHistoryPolicy {
    fun append(events: List<MobileSyncEvent>, event: MobileSyncEvent): List<MobileSyncEvent> =
        (events.filterNot { existing -> existing.eventId == event.eventId } + event)
            .sortedByDescending { item -> item.occurredAt }
            .take(MAX_EVENTS)

    private companion object {
        private const val MAX_EVENTS = 50
    }
}

data class MobileSnapshotReplacementDecision(
    val allowed: Boolean,
    val unsentChangeCount: Int,
)

class MobileSnapshotReplacementPolicy {
    fun evaluate(drafts: MobileReturnDraftSet): MobileSnapshotReplacementDecision =
        MobileSnapshotReplacementDecision(
            allowed = drafts.changeCount == 0,
            unsentChangeCount = drafts.changeCount,
        )
}

data class MobileReturnExportOutcome(
    val pendingDesktopImportCount: Int,
    val draftsRemainAvailable: Boolean,
)

class MobileReturnExportPolicy {
    fun afterSuccessfulFileSave(changeCount: Int): MobileReturnExportOutcome {
        require(changeCount > 0) { "Eine Rückgabedatei muss mindestens eine Änderung enthalten." }
        return MobileReturnExportOutcome(
            pendingDesktopImportCount = changeCount,
            draftsRemainAvailable = true,
        )
    }
}
