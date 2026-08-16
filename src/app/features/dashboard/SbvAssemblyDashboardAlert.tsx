import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { waitForBridge } from '../../core/bridge/waitForBridge';

export function SbvAssemblyDashboardAlert({ onOpen }: { onOpen: () => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let active = true;
    waitForBridge()
      .then((bridge) => bridge?.sbvOffice?.assemblies.annualWarning(new Date().getFullYear()))
      .then((warning) => { if (active) setVisible(Boolean(warning)); })
      .catch(() => { if (active) setVisible(false); });
    return () => { active = false; };
  }, []);
  if (!visible) return null;
  return <button type="button" className="industrial-card dashboard-focus-card" onClick={onOpen}>
    <span className="dashboard-focus-marker dashboard-focus-marker-warning">Handlungsbedarf</span>
    <AlertTriangle className="h-5 w-5" aria-hidden="true" />
    <strong>Schwerbehindertenversammlung</strong>
    <span>Für das laufende Kalenderjahr ist noch keine Versammlung terminiert oder durchgeführt.</span>
  </button>;
}
