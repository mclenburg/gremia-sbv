import { bindTrustedIpcRenderer } from '../../electron/ipc/ipcHandler.js';

export function trustedIpcEvent(ipcMain: object, url = 'file:///app/index.html') {
  const mainFrame = { url };
  const sender = { mainFrame };
  bindTrustedIpcRenderer(ipcMain as never, sender as never, true, 'file:///app/index.html');
  return { sender, senderFrame: mainFrame };
}
