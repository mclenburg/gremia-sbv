import { createRequire } from 'node:module';
import postcss from 'postcss';
import { describe, expect, it } from 'vitest';

const config = createRequire(import.meta.url)('../../postcss.config.js').default as {
  plugins: Record<string, object>;
};

describe('Tailwind-PostCSS-Verarbeitung', () => {
  it('erzeugt eine angeforderte Utility-Klasse mit der Projektkonfiguration', async () => {
    const plugins = await Promise.all(Object.entries(config.plugins).map(async ([name, options]) => {
      const plugin = (await import(name)) as { default: (options: object) => postcss.AcceptedPlugin };
      return plugin.default(options);
    }));
    const result = await postcss(plugins).process(
      '@import "tailwindcss"; @source inline("underline");',
      { from: 'src/styles/tailwind.css' },
    );
    const declarations: Array<{ property: string; value: string }> = [];

    result.root.walkRules('.underline', (rule) => {
      rule.walkDecls((declaration) => {
        declarations.push({ property: declaration.prop, value: declaration.value });
      });
    });

    expect(declarations).toContainEqual({ property: 'text-decoration-line', value: 'underline' });
  });
});
