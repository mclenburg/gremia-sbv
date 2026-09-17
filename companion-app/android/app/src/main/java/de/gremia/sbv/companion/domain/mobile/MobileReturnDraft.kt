package de.gremia.sbv.companion.domain.mobile

data class MobileReturnNoteDraft(
    val mobileId: String,
    val caseId: String,
    val changedAt: String,
    val title: String,
    val content: String,
    val noteType: String,
    val nextSteps: String?,
)

data class MobileReturnDeadlineDraft(
    val mobileId: String,
    val caseId: String,
    val changedAt: String,
    val title: String,
    val dueAt: String,
    val reminderAt: String?,
    val description: String?,
    val severity: String,
)

data class MobileReturnDeadlineCompletionDraft(
    val mobileId: String,
    val deadlineId: String,
    val changedAt: String,
    val baseUpdatedAt: String,
    val completedNote: String?,
)

data class MobileReturnInboxDraft(
    val mobileId: String,
    val changedAt: String,
    val title: String,
    val content: String,
    val nextSteps: String?,
    val containsHealthData: Boolean,
)

data class MobileReturnDraftSet(
    val notes: List<MobileReturnNoteDraft>,
    val deadlines: List<MobileReturnDeadlineDraft>,
    val deadlineCompletions: List<MobileReturnDeadlineCompletionDraft>,
    val inboxEntries: List<MobileReturnInboxDraft> = emptyList(),
) {
    val changeCount: Int = notes.size + deadlines.size + deadlineCompletions.size + inboxEntries.size
}

data class MobileReturnPackageFile(
    val packageId: String,
    val fileName: String,
    val filePath: String,
    val changeCount: Int,
)
