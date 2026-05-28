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
  return firstDescendant(root, (node) => node.tag === 'main' && hasClasses(node, ['industrial-shell']));
}

function loginPanel(root: HtmlNode): HtmlNode {
  return firstDescendant(root, (node) => node.tag === 'section' && hasClasses(node, ['login-panel']));
}

function renderedControlsInside(panel: HtmlNode) {
  const nodes = descendants(panel);
  return {
    inputs: nodes.filter((node) => node.tag === 'input'),
    buttons: nodes.filter((node) => node.tag === 'button'),
  };
}

describe('LoginGate Overlay-Layout wie 0.9.1', () => {
  it('rendert den Entsperrbildschirm als zentriertes kompaktes 0.9.1-Panel', () => {
    const tree = renderLoginTree('login');
    const shell = loginShell(tree);
    const panel = loginPanel(tree);
    const controls = renderedControlsInside(panel);

    expect(panel.parent).toBe(shell);
    expect(classList(shell)).toEqual(expect.arrayContaining(['industrial-shell', 'flex', 'min-h-screen', 'items-center', 'justify-center', 'px-6', 'py-8', 'text-zinc-100']));
    expect(classList(panel)).toEqual(expect.arrayContaining(['login-panel', 'relative', 'w-full', 'max-w-md', 'overflow-hidden', 'rounded-none', 'border', 'border-zinc-700', 'bg-zinc-950/95', 'p-7', 'shadow-2xl']));
    expect(classList(panel)).not.toEqual(expect.arrayContaining(['max-w-none', 'login-panel-compact']));
    expect(controls.inputs).toHaveLength(1);
    expect(controls.buttons).toHaveLength(1);
    expect(controls.inputs.every((input) => descendants(panel).includes(input))).toBe(true);
    expect(controls.buttons.every((button) => descendants(panel).includes(button))).toBe(true);
  });

  it('hält Ersteinrichtung und Ladezustand im kompakten 0.9.1-Panel', () => {
    for (const mode of ['setup', 'loading'] satisfies AuthMode[]) {
      const tree = renderLoginTree(mode);
      const shell = loginShell(tree);
      const panel = loginPanel(tree);

      expect(panel.parent).toBe(shell);
      expect(classList(panel)).toEqual(expect.arrayContaining(['w-full', 'max-w-md', 'p-7']));
      expect(classList(panel)).not.toEqual(expect.arrayContaining(['max-w-none', 'login-panel-compact']));
      expect(descendants(shell).some((node) => hasClasses(node, ['industrial-sidebar']))).toBe(false);
    }
  });

  it('rendert Sicherheitsfehler kompakt und Recovery bewusst breit wie 0.9.1', () => {
    const unavailablePanel = loginPanel(renderLoginTree('unavailable'));
    const recoveryPanel = loginPanel(renderLoginTree('recovery'));

    expect(classList(unavailablePanel)).toEqual(expect.arrayContaining(['max-w-md', 'border-yellow-500/40', 'p-7']));
    expect(classList(recoveryPanel)).toEqual(expect.arrayContaining(['max-w-3xl', 'border-yellow-500/40', 'p-7']));
    expect(classList(unavailablePanel)).not.toEqual(expect.arrayContaining(['login-panel-compact']));
    expect(classList(recoveryPanel)).not.toEqual(expect.arrayContaining(['max-w-none']));
  });

  it('verwendet keine entsperrte App-Shell-Struktur im Auth-Screen', () => {
    for (const mode of ['login', 'setup', 'loading', 'unavailable', 'recovery'] satisfies AuthMode[]) {
      const shell = loginShell(renderLoginTree(mode));
      const shellChildren = descendants(shell);

      expect(shellChildren.some((node) => hasClasses(node, ['industrial-sidebar']))).toBe(false);
      expect(shellChildren.some((node) => hasClasses(node, ['industrial-content']))).toBe(false);
      expect(shellChildren.some((node) => hasClasses(node, ['industrial-topbar']))).toBe(false);
    }
  });
});
