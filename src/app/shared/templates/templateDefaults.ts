import { waitForBridge } from "../../core/bridge/waitForBridge";
import {
  EMPTY_TEMPLATE_DEFAULT_VALUES,
  TEMPLATE_DEFAULT_FIELDS,
  normalizeTemplateDefaultValues,
  type TemplateDefaultKey,
  type TemplateDefaultValues,
} from "../../core/models/template-default.model";

export {
  EMPTY_TEMPLATE_DEFAULT_VALUES,
  TEMPLATE_DEFAULT_FIELDS,
  normalizeTemplateDefaultValues,
};
export type { TemplateDefaultKey, TemplateDefaultValues };

const LEGACY_TEMPLATE_DEFAULT_VALUES_STORAGE_KEY =
  "gremia.sbv.templateDefaultValues";

type TemplateDefaultsBridge = NonNullable<Window["gremiaSbv"]>["templateDefaults"];

function readLegacyTemplateDefaultValues(): TemplateDefaultValues | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(
      LEGACY_TEMPLATE_DEFAULT_VALUES_STORAGE_KEY,
    );
    if (!raw) return null;
    return normalizeTemplateDefaultValues(
      JSON.parse(raw) as Record<string, unknown>,
    );
  } catch {
    return null;
  }
}

function removeLegacyTemplateDefaultValues(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LEGACY_TEMPLATE_DEFAULT_VALUES_STORAGE_KEY);
  } catch {
    // Die verschlüsselte Bridge-Persistenz ist maßgeblich; Legacy-Cleanup ist best effort.
  }
}

async function migrateLegacyTemplateDefaultValues(
  bridge: TemplateDefaultsBridge,
): Promise<TemplateDefaultValues | null> {
  const legacy = readLegacyTemplateDefaultValues();
  if (!legacy) return null;
  const saved = normalizeTemplateDefaultValues(await bridge.save(legacy));
  removeLegacyTemplateDefaultValues();
  return saved;
}

async function requireTemplateDefaultsBridge(): Promise<TemplateDefaultsBridge> {
  const bridge = await waitForBridge();
  const templateDefaults = bridge?.templateDefaults;
  if (!templateDefaults?.list || !templateDefaults.save) {
    throw new Error(
      "Vorlagen-Standardwerte können nur im entsperrten verschlüsselten Tresor geladen werden.",
    );
  }
  return templateDefaults;
}

export async function loadTemplateDefaultValues(): Promise<TemplateDefaultValues> {
  const bridge = await requireTemplateDefaultsBridge();
  const migrated = await migrateLegacyTemplateDefaultValues(bridge);
  if (migrated) return migrated;
  return normalizeTemplateDefaultValues(await bridge.list());
}

export async function saveTemplateDefaultValues(
  values: TemplateDefaultValues,
): Promise<TemplateDefaultValues> {
  const bridge = await requireTemplateDefaultsBridge();
  const saved = normalizeTemplateDefaultValues(
    await bridge.save(normalizeTemplateDefaultValues(values)),
  );
  removeLegacyTemplateDefaultValues();
  return saved;
}
