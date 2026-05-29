import { Settings as SettingsIcon, TerminalSquare } from 'lucide-react';
import { moduleGroups, modules, type ModuleGroupDefinition, type ViewId } from '../core/navigation/modules';

function modulesForGroup(group: ModuleGroupDefinition) {
  return modules.filter((module) => module.group === group.id);
}

export function ShellNav({ current, onNavigate }: { current: ViewId; onNavigate: (view: ViewId) => void }) {
  return (
    <nav className="industrial-nav" aria-label="Hauptnavigation" data-e2e="main-nav">
      <div className="industrial-nav-primary">
        <button type="button" data-e2e="main-nav-dashboard" className={current === 'dashboard' ? 'active' : ''} aria-current={current === 'dashboard' ? 'page' : undefined} onClick={() => onNavigate('dashboard')}>
          <TerminalSquare className="h-4 w-4" />
          Dashboard
        </button>
      </div>

      {moduleGroups.map((group) => {
        const groupModules = modulesForGroup(group);
        if (!groupModules.length) return null;
        return (
          <section key={group.id} className="industrial-nav-group" aria-labelledby={`main-nav-group-${group.id}`}>
            <h2 id={`main-nav-group-${group.id}`} className="industrial-nav-group-title">{group.label}</h2>
            <div className="industrial-nav-group-items">
              {groupModules.map((module) => (
                <button
                  key={module.id}
                  type="button"
                  data-e2e={`main-nav-${module.id === 'cases' ? 'cases' : module.id === 'compliance' ? 'compliance' : module.id}`}
                  className={current === module.id ? 'active' : ''}
                  aria-current={current === module.id ? 'page' : undefined}
                  aria-disabled={module.status === 'planned' ? true : undefined}
                  onClick={() => onNavigate(module.id)}
                  disabled={module.status === 'planned'}
                  title={module.status === 'planned' ? `In Entwicklung${module.plannedVersion ? `: ${module.plannedVersion}` : ''}` : module.text}
                >
                  <module.icon className="h-4 w-4" />
                  {module.shortTitle}
                </button>
              ))}
            </div>
          </section>
        );
      })}

      <section className="industrial-nav-group" aria-labelledby="main-nav-group-settings">
        <h2 id="main-nav-group-settings" className="industrial-nav-group-title">Konfiguration</h2>
        <div className="industrial-nav-group-items">
          <button
            type="button"
            data-e2e="main-nav-settings"
            className={current === 'settings' ? 'active' : ''}
            aria-current={current === 'settings' ? 'page' : undefined}
            onClick={() => onNavigate('settings')}
            title="Lokale Konfiguration und Sicherheitsoptionen"
          >
            <SettingsIcon className="h-4 w-4" />
            Einstellungen
          </button>
        </div>
      </section>
    </nav>
  );
}
