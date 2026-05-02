import { ModuleFrame } from './ModuleFrame';
import type { ModuleDefinition } from '../../core/navigation/modules';

export function PlaceholderView({ view }: { view: ModuleDefinition }) {
  return (
    <ModuleFrame title={view.title} kicker={view.shortTitle} description={view.text}>
      <div className="industrial-empty">
        <view.icon className="h-10 w-10 text-yellow-300" />
        <div>
          <h3>Modul in Entwicklung</h3>
          <p>Dieser Bereich ist als Fachmodul vorgesehen, aber noch nicht für die tägliche Arbeit freigeschaltet. Bitte nutze bis dahin die Fallakte und die dort angebundenen Maßnahmen.</p>
          {view.plannedVersion && <p className="industrial-meta">Geplante Ausbaustufe: {view.plannedVersion}</p>}
        </div>
      </div>
    </ModuleFrame>
  );
}
