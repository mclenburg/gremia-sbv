package de.gremia.sbv.companion.domain.mobile

interface MobileSnapshotStore {
    fun current(): MobileSnapshot?
    fun save(snapshot: MobileSnapshot)
}
