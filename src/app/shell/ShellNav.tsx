import { Settings as SettingsIcon, TerminalSquare } from 'lucide-react';
import { modules, type ViewId } from '../core/navigation/modules';

export function ShellNav({ current, onNavigate }: { current: ViewId; onNavigate: (view: ViewId) => void }) {
  return (
    <nav className="industrial-nav" aria-label="Hauptnavigation" data-e2e="main-nav">
      <button type="button" data-e2e="main-nav-dashboard" className={current === 'dashboard' ? 'active' : ''} aria-current={current === 'dashboard' ? 'page' : undefined} onClick={() => onNavigate('dashboard')}>
        <TerminalSquare className="h-4 w-4" />
        Dashboard
      </button>
      {modules.map((module) => (
        <button key={module.id} type="button" data-e2e={`main-nav-${module.id === 'cases' ? 'cases' : module.id === 'compliance' ? 'compliance' : module.id}`} className={current === module.id ? 'active' : ''} aria-current={current === module.id ? 'page' : undefined} aria-disabled={module.status === 'planned' ? true : undefined} onClick={() => onNavigate(module.id)} disabled={module.status === 'planned'} title={module.status === 'planned' ? `In Entwicklung${module.plannedVersion ? `: ${module.plannedVersion}` : ''}` : undefined}>
          <module.icon className="h-4 w-4" />
          {module.shortTitle}
        </button>
      ))}
      <button type="button" data-e2e="main-nav-settings" className={current === 'settings' ? 'active' : ''} aria-current={current === 'settings' ? 'page' : undefined} onClick={() => onNavigate('settings')}>
        <SettingsIcon className="h-4 w-4" />
        Einstellungen
      </button>
    </nav>
  );
}
