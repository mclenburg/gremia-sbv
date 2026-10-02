package de.gremia.sbv.companion.domain.mobile

data class MobileSnapshotImportPreview(
    val packageId: String,
    val sourceInstanceId: String,
    val targetInstanceId: String,
    val createdAt: String,
    val caseCount: Int,
    val deadlineCount: Int,
    val progress: MobileFrameProgress,
)

fun MobileSnapshot.toImportPreview(progress: MobileFrameProgress): MobileSnapshotImportPreview =
    MobileSnapshotImportPreview(
        packageId = packageId,
        sourceInstanceId = sourceInstanceId,
        targetInstanceId = targetInstanceId,
        createdAt = createdAt,
        caseCount = cases.size,
        deadlineCount = deadlines.size,
        progress = progress,
    )
