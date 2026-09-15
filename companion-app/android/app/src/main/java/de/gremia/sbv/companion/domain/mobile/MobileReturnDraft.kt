package de.gremia.sbv.companion.domain.mobile

data class MobileReturnNoteDraft(
    val mobileId: String,
    val caseId: String,
    val changedAt: String,
    val title: String,
    val content: String,
)

data class MobileReturnPackageFile(
    val packageId: String,
    val fileName: String,
    val filePath: String,
    val changeCount: Int,
)
