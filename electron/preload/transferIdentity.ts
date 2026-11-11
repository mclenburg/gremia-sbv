import type { IpcInvoker } from './invoke.js';
import { IPC_CHANNELS } from '../ipc/channels.js';
import type { TransferInstanceIdentity } from '../../src/domain/models/transfer-identity.model.js';
import type { TransferCapabilityDocument } from '../../src/domain/models/transfer-capability.model.js';
import type { SaveTransferRecipientProfileInput, TransferRecipientProfile } from '../../src/domain/models/transfer-recipient-profile.model.js';

export function createTransferIdentityApi(invokeIpc: IpcInvoker) {
  return {
    get: (): Promise<TransferInstanceIdentity> => invokeIpc(IPC_CHANNELS.transferIdentityGet),
    exportCapability: (profileId: string): Promise<{ exported: boolean; filePath?: string }> =>
      invokeIpc(IPC_CHANNELS.transferCapabilityExport, profileId),
    selectCapability: (profileId: string): Promise<{ canceled: true } | { canceled: false; fileToken: string; fileName: string; document: TransferCapabilityDocument }> =>
      invokeIpc(IPC_CHANNELS.transferCapabilitySelectInspect, profileId),
    importCapability: (profileId: string, fileToken: string): Promise<TransferRecipientProfile> =>
      invokeIpc(IPC_CHANNELS.transferCapabilityImport, profileId, fileToken),
    listRecipientProfiles: (): Promise<TransferRecipientProfile[]> => invokeIpc(IPC_CHANNELS.transferRecipientProfilesList),
    saveRecipientProfile: (input: SaveTransferRecipientProfileInput): Promise<TransferRecipientProfile> =>
      invokeIpc(IPC_CHANNELS.transferRecipientProfilesSave, input),
    setRecipientProfileActive: (id: string, active: boolean): Promise<TransferRecipientProfile> =>
      invokeIpc(IPC_CHANNELS.transferRecipientProfilesSetActive, id, active),
    deleteRecipientProfile: (id: string): Promise<{ deleted: boolean }> =>
      invokeIpc(IPC_CHANNELS.transferRecipientProfilesDelete, id),
  } as const;
}
