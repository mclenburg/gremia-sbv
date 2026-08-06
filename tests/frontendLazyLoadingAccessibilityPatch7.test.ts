import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LoadingState } from "../src/app/core/loading/LazyFeatureBoundary";
import {
  getLazyFeatureComponent,
  isLazyFeatureView,
  lazyFeatureLabel,
  preloadLazyFeature,
} from "../src/app/core/loading/lazyFeatureViews";
import type { ViewId } from "../src/app/core/navigation/modules";

const lazyViews: ViewId[] = ["knowledge", "templates", "reports", "compliance", "recruiting_participations", "settings"];

describe("Frontend-Ladegrenzen", () => {
  it("hält Kernbereiche synchron und markiert nur selten genutzte Bereiche als lazy", () => {
    expect(lazyViews.every((view) => isLazyFeatureView(view))).toBe(true);
    expect(isLazyFeatureView("dashboard")).toBe(false);
    expect(isLazyFeatureView("cases")).toBe(false);
    expect(isLazyFeatureView("deadlines")).toBe(false);
  });

  it("liefert pro Lazy-Bereich eine stabile React-Komponente", () => {
    for (const view of lazyViews) {
      const first = getLazyFeatureComponent(view);
      const second = getLazyFeatureComponent(view);
      expect(first).not.toBeNull();
      expect(second).toBe(first);
      expect(lazyFeatureLabel(view).length).toBeGreaterThan(3);
    }
  });

  it("behandelt Vorladen eines synchronen Bereichs als sicheren No-op", async () => {
    await expect(preloadLazyFeature("dashboard")).resolves.toBeUndefined();
  });

  it("rendert einen verständlichen, nicht blockierenden und screenreader-tauglichen Ladezustand", () => {
    const html = renderToStaticMarkup(createElement(LoadingState, { label: "Berichte und Auswertungen" }));
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("Die Navigation bleibt bedienbar");
    expect(html).toContain('aria-hidden="true"');
  });
});
