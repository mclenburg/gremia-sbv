import { Settings as SettingsIcon, TerminalSquare } from 'lucide-react';
import { modules, type ViewId } from '../core/navigation/modules';

export function ShellNav({ current, onNavigate }: { current: ViewId; onNavigate: (view: ViewId) => void }) {
  return (
    <nav className="industrial-nav" aria-label="Hauptnavigation">
      <button className={current === 'dashboard' ? 'active' : ''} onClick={() => onNavigate('dashboard')}>
        <TerminalSquare className="h-4 w-4" />
        Dashboard
      </button>
      {modules.map((module) => (
        <button key={module.id} className={current === module.id ? 'active' : ''} onClick={() => onNavigate(module.id)} disabled={module.status === 'planned'} title={module.status === 'planned' ? `In Entwicklung${module.plannedVersion ? `: ${module.plannedVersion}` : ''}` : undefined}>
          <module.icon className="h-4 w-4" />
          {module.shortTitle}
        </button>
      ))}
      <button className={current === 'settings' ? 'active' : ''} onClick={() => onNavigate('settings')}>
        <SettingsIcon className="h-4 w-4" />
        Einstellungen
      </button>
    </nav>
  );
}
