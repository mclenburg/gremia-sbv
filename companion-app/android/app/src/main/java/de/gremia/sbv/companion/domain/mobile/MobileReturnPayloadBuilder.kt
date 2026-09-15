package de.gremia.sbv.companion.domain.mobile

import de.gremia.sbv.companion.domain.transfer.TransferIdentity
import org.json.JSONArray
import org.json.JSONObject

class MobileReturnPayloadBuilder {
    fun plan(
        packageId: String,
        createdAt: String,
        snapshot: MobileSnapshot,
        sourceIdentity: TransferIdentity,
        drafts: MobileReturnDraftSet,
    ): MobileReturnPayloadPlan {
        require(drafts.changeCount > 0) { "Es liegen keine mobilen Änderungen für eine Rückgabe vor." }
        return MobileReturnPayloadPlan(
            packageId = packageId,
            createdAt = createdAt,
            sourceInstanceId = sourceIdentity.instanceId,
            targetInstanceId = snapshot.returnTarget.instanceId,
            sourceSnapshotPackageId = snapshot.packageId,
            changes = plannedChanges(drafts),
        )
    }

    fun build(
        packageId: String,
        createdAt: String,
        snapshot: MobileSnapshot,
        sourceIdentity: TransferIdentity,
        drafts: MobileReturnDraftSet,
    ): String {
        val plan = plan(packageId, createdAt, snapshot, sourceIdentity, drafts)
        return JSONObject()
            .put("protocolVersion", "1.0")
            .put("schemaVersion", 1)
            .put("packageId", plan.packageId)
            .put("sourceInstanceId", plan.sourceInstanceId)
            .put("targetInstanceId", plan.targetInstanceId)
            .put("sourceSnapshotPackageId", plan.sourceSnapshotPackageId)
            .put("createdAt", plan.createdAt)
            .put("changes", changes(plan.changes))
            .toString()
    }

    private fun plannedChanges(drafts: MobileReturnDraftSet): List<MobileReturnPayloadChange> =
        drafts.notes.map { note ->
            MobileReturnPayloadChange(
                type = "create_note",
                values = mapOf(
                    "mobileId" to note.mobileId,
                    "caseId" to note.caseId,
                    "changedAt" to note.changedAt,
                    "title" to note.title,
                    "content" to note.content,
                    "containsHealthData" to true,
                ),
            )
        } + drafts.deadlines.map { deadline ->
            MobileReturnPayloadChange(
                type = "create_deadline",
                values = mapOf(
                    "mobileId" to deadline.mobileId,
                    "caseId" to deadline.caseId,
                    "changedAt" to deadline.changedAt,
                    "title" to deadline.title,
                    "dueAt" to deadline.dueAt,
                    "reminderAt" to deadline.reminderAt,
                    "description" to deadline.description,
                    "severity" to deadline.severity,
                ),
            )
        } + drafts.deadlineCompletions.map { completion ->
            MobileReturnPayloadChange(
                type = "complete_deadline",
                values = mapOf(
                    "mobileId" to completion.mobileId,
                    "deadlineId" to completion.deadlineId,
                    "changedAt" to completion.changedAt,
                    "baseUpdatedAt" to completion.baseUpdatedAt,
                    "completedNote" to completion.completedNote,
                ),
            )
        }

    private fun changes(plannedChanges: List<MobileReturnPayloadChange>): JSONArray =
        JSONArray().also { changes ->
            plannedChanges.forEach { change ->
                changes.put(JSONObject().apply {
                    put("type", change.type)
                    change.values.forEach { (key, value) ->
                        if (value != null) put(key, value)
                    }
                })
            }
        }
}

data class MobileReturnPayloadPlan(
    val packageId: String,
    val createdAt: String,
    val sourceInstanceId: String,
    val targetInstanceId: String,
    val sourceSnapshotPackageId: String,
    val changes: List<MobileReturnPayloadChange>,
)

data class MobileReturnPayloadChange(
    val type: String,
    val values: Map<String, Any?>,
)
