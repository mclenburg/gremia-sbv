export function bootstrapSplashWindowOptions() {
  return {
    width: 760,
    height: 460,
    minWidth: 640,
    minHeight: 420,
    title: 'Gremia.SBV wird gestartet',
    show: true,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    backgroundColor: '#050505',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  };
}

export async function startWithVisibleSplash<TSplash>(
  showSplash: () => Promise<TSplash>,
  loadRuntime: () => Promise<{ startApplication: (splash: TSplash) => Promise<void> }>,
  markPhase: (phase: 'runtime:import-start' | 'runtime:import-complete') => void,
): Promise<void> {
  const splash = await showSplash();
  markPhase('runtime:import-start');
  const runtime = await loadRuntime();
  markPhase('runtime:import-complete');
  await runtime.startApplication(splash);
}
