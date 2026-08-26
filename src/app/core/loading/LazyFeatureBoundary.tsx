import { Component, Suspense, createRef, useEffect, type ErrorInfo, type ReactNode } from "react";
import type { ViewId } from "../navigation/modules";
import { recordRendererDiagnostic } from "../diagnostics/rendererDiagnostics";
import { useOptionalAnnouncer } from "../../shared/a11y/LiveRegionProvider";
import { lazyFeatureLabel } from "./lazyFeatureViews";

export function LoadingState({ label }: { label: string }) {
  return (
    <section className="industrial-lazy-state" aria-labelledby="lazy-feature-loading-title" aria-busy="true">
      <div className="industrial-loading-spinner" aria-hidden="true" />
      <div>
        <h3 id="lazy-feature-loading-title">{label} wird geladen</h3>
        <p role="status" aria-live="polite">Der Bereich wird vorbereitet. Die Navigation bleibt bedienbar.</p>
      </div>
    </section>
  );
}

function FeatureReadySignal({ label }: { label: string }) {
  const announce = useOptionalAnnouncer();
  useEffect(() => { announce?.(`${label} ist geladen.`); }, [announce, label]);
  return null;
}

type BoundaryProps = {
  view: ViewId;
  children: ReactNode;
  onRetry?: () => void;
};

type BoundaryState = {
  error: Error | null;
  retryKey: number;
};

export class LazyFeatureBoundary extends Component<BoundaryProps, BoundaryState> {
  private readonly headingRef = createRef<HTMLHeadingElement>();

  state: BoundaryState = { error: null, retryKey: 0 };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error, retryKey: 0 };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    recordRendererDiagnostic("error", `Bereich ${this.props.view} konnte nicht geladen werden.`, { name: error.name, message: info.componentStack });
  }

  componentDidUpdate(_previousProps: BoundaryProps, previousState: BoundaryState) {
    if (!previousState.error && this.state.error) this.headingRef.current?.focus();
    if (_previousProps.view !== this.props.view && this.state.error) {
      this.setState({ error: null, retryKey: this.state.retryKey + 1 });
    }
  }

  private retry = () => {
    this.setState((state) => ({ error: null, retryKey: state.retryKey + 1 }));
    this.props.onRetry?.();
  };

  render() {
    const label = lazyFeatureLabel(this.props.view);
    if (this.state.error) {
      return (
        <section className="industrial-lazy-state industrial-lazy-state-error" role="alert" aria-labelledby="lazy-feature-error-title">
          <h3 id="lazy-feature-error-title" ref={this.headingRef} tabIndex={-1}>{label} konnte nicht geladen werden</h3>
          <p>Die übrigen Bereiche bleiben nutzbar. Versuchen Sie den Ladevorgang erneut.</p>
          <button type="button" className="industrial-button" onClick={this.retry}>Erneut laden</button>
        </section>
      );
    }
    return (
      <Suspense key={this.state.retryKey} fallback={<LoadingState label={label} />}>
        {this.props.children}
        <FeatureReadySignal label={label} />
      </Suspense>
    );
  }
}
