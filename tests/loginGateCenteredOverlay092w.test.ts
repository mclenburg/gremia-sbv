import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LoginGate } from '../src/app/features/auth/LoginGate';
import type { AuthMode } from '../src/app/core/auth/authTypes';

type HtmlNode = {
  tag: string;
  attrs: Record<string, string>;
  children: HtmlNode[];
  parent?: HtmlNode;
};

const voidElements = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

function parseAttributes(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attributePattern = /([:\w-]+)(?:=("([^"]*)"|'([^']*)'|([^\s"'>/=`]+)))?/g;
  for (const match of raw.matchAll(attributePattern)) {
    const [, name, , doubleQuoted, singleQuoted, unquoted] = match;
    attrs[name] = doubleQuoted ?? singleQuoted ?? unquoted ?? '';
  }
  return attrs;
}

function parseRenderedMarkup(markup: string): HtmlNode {
  const root: HtmlNode = { tag: 'root', attrs: {}, children: [] };
  const stack: HtmlNode[] = [root];
  const tagPattern = /<\/?([a-zA-Z][\w:-]*)([^>]*)>/g;

  for (const match of markup.matchAll(tagPattern)) {
    const [token, rawTag, rawAttributes] = match;
    const tag = rawTag.toLowerCase();
    if (token.startsWith('</')) {
      while (stack.length > 1 && stack.at(-1)?.tag !== tag) stack.pop();
      if (stack.at(-1)?.tag === tag) stack.pop();
      continue;
    }

    const node: HtmlNode = {
      tag,
      attrs: parseAttributes(rawAttributes),
      children: [],
      parent: stack.at(-1),
    };
    stack.at(-1)?.children.push(node);

    const selfClosing = token.endsWith('/>') || voidElements.has(tag);
    if (!selfClosing) stack.push(node);
  }

  return root;
}

function descendants(node: HtmlNode): HtmlNode[] {
  return node.children.flatMap((child) => [child, ...descendants(child)]);
}

function classList(node: HtmlNode): string[] {
  return node.attrs.class?.split(/\s+/).filter(Boolean) ?? [];
}

function hasClasses(node: HtmlNode, expectedClasses: string[]): boolean {
  const classes = new Set(classList(node));
  return expectedClasses.every((className) => classes.has(className));
}

function firstDescendant(root: HtmlNode, predicate: (node: HtmlNode) => boolean): HtmlNode {
  const node = descendants(root).find(predicate);
  expect(node).toBeTruthy();
  return node!;
}

function inlineStyle(node: HtmlNode): Record<string, string> {
  return Object.fromEntries(
    (node.attrs.style ?? '')
      .split(';')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const separator = entry.indexOf(':');
        return [entry.slice(0, separator).trim(), entry.slice(separator + 1).trim()];
      })
  );
}

function renderLoginTree(mode: AuthMode): HtmlNode {
  return parseRenderedMarkup(
    renderToStaticMarkup(
      createElement(LoginGate, {
        mode,
        onUnlock: () => undefined,
        onResetToSetup: () => undefined,
      })
    )
  );
}

function loginShell(root: HtmlNode): HtmlNode {
  return firstDescendant(root, (node) => node.tag === 'main' && hasClasses(node, ['industrial-shell', 'login-shell']));
}

function loginPanel(root: HtmlNode): HtmlNode {
  return firstDescendant(root, (node) => node.tag === 'section' && hasClasses(node, ['login-panel']));
}

function formInside(panel: HtmlNode): HtmlNode {
  return firstDescendant(panel, (node) => node.tag === 'form' && hasClasses(node, ['auth-form']));
}

function renderedControlsInside(panel: HtmlNode) {
  const nodes = descendants(panel);
  return {
    labels: nodes.filter((node) => node.tag === 'label'),
    inputs: nodes.filter((node) => node.tag === 'input'),
    buttons: nodes.filter((node) => node.tag === 'button'),
  };
}

describe('LoginGate zentriertes Overlay 0.9.2w', () => {
  it('rendert den Entsperrbildschirm als ausreichend großes, zentriertes Auth-Panel', () => {
    const tree = renderLoginTree('login');
    const shell = loginShell(tree);
    const panel = loginPanel(tree);
    const form = formInside(panel);
    const controls = renderedControlsInside(panel);
    const panelStyle = inlineStyle(panel);

    expect(panel.parent).toBe(shell);
    expect(classList(shell)).toEqual(expect.arrayContaining(['flex', 'items-center', 'justify-center', 'min-h-screen']));
    expect(classList(panel)).toEqual(expect.arrayContaining(['login-panel-compact', 'w-full']));
    expect(panelStyle['--auth-panel-max-width']).toBe('32rem');
    expect(panelStyle['--auth-panel-min-height']).toBe('18rem');
    expect(controls.inputs).toHaveLength(1);
    expect(controls.buttons).toHaveLength(1);
    expect(controls.labels.every((label) => label.parent === form)).toBe(true);
    expect(controls.inputs.every((input) => descendants(form).includes(input))).toBe(true);
    expect(controls.buttons.every((button) => descendants(form).includes(button))).toBe(true);
  });

  it('hält die Ersteinrichtung im selben großzügigen Auth-Panel', () => {
    const panel = loginPanel(renderLoginTree('setup'));
    const form = formInside(panel);
    const controls = renderedControlsInside(panel);
    const panelStyle = inlineStyle(panel);

    expect(classList(panel)).toEqual(expect.arrayContaining(['login-panel-compact']));
    expect(panelStyle['--auth-panel-max-width']).toBe('32rem');
    expect(panelStyle['--auth-panel-min-height']).toBe('18rem');
    expect(controls.inputs).toHaveLength(2);
    expect(controls.buttons).toHaveLength(1);
    expect(controls.labels.every((label) => label.parent === form)).toBe(true);
  });

  it('rendert Ladezustand und Sicherheitsfehler ohne App-Shell und ohne Fullwidth-Panel', () => {
    for (const mode of ['loading', 'unavailable'] satisfies AuthMode[]) {
      const tree = renderLoginTree(mode);
      const shell = loginShell(tree);
      const panel = loginPanel(tree);
      const panelStyle = inlineStyle(panel);

      expect(panel.parent).toBe(shell);
      expect(classList(panel)).toEqual(expect.arrayContaining(['login-panel-compact']));
      expect(panelStyle['--auth-panel-max-width']).toBe('32rem');
      expect(descendants(shell).some((node) => hasClasses(node, ['industrial-sidebar']))).toBe(false);
      expect(classList(panel)).not.toEqual(expect.arrayContaining(['max-w-none']));
    }
  });

  it('gibt Recovery bewusst mehr Raum, ohne das entsperrte App-Layout zu verwenden', () => {
    const tree = renderLoginTree('recovery');
    const shell = loginShell(tree);
    const panel = loginPanel(tree);
    const controls = renderedControlsInside(panel);
    const panelStyle = inlineStyle(panel);

    expect(panel.parent).toBe(shell);
    expect(classList(panel)).toEqual(expect.arrayContaining(['login-panel-wide']));
    expect(panelStyle['--auth-panel-max-width']).toBe('48rem');
    expect(panelStyle['--auth-panel-min-height']).toBe('24rem');
    expect(controls.inputs).toHaveLength(4);
    expect(controls.buttons).toHaveLength(2);
    expect(descendants(shell).some((node) => hasClasses(node, ['industrial-sidebar']))).toBe(false);
  });
});
