package de.gremia.sbv.companion.domain.mobile

data class MobileSnapshot(
    val packageId: String,
    val sourceInstanceId: String,
    val targetInstanceId: String,
    val returnTarget: MobileReturnTarget,
    val createdAt: String,
    val themeMode: String,
    val cases: List<MobileCaseProjection>,
    val deadlines: List<MobileDeadlineProjection>,
    val rawPayloadJson: String,
)

data class MobileReturnTarget(
    val instanceId: String,
    val keyFingerprint: String,
    val publicKeyPem: String,
)

data class MobileCaseProjection(
    val id: String,
    val caseNumber: String,
    val displayName: String,
    val category: String,
    val status: String,
    val priority: String,
    val updatedAt: String,
)

data class MobileDeadlineProjection(
    val id: String,
    val caseId: String,
    val title: String,
    val dueAt: String,
    val severity: String,
    val status: String,
    val updatedAt: String,
)
