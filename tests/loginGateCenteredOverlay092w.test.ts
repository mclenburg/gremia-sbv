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
  return firstDescendant(root, (node) => node.tag === 'main' && hasClasses(node, ['industrial-shell', 'login-shell']));
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

describe('LoginGate Overlay-Layout', () => {
  it('rendert den Entsperrbildschirm als zentriertes kompaktes Auth-Overlay', () => {
    const tree = renderLoginTree('login');
    const shell = loginShell(tree);
    const panel = loginPanel(tree);
    const controls = renderedControlsInside(panel);
    const fadedIcon = firstDescendant(panel, (node) => node.tag === 'img' && classList(node).includes('opacity-[0.08]'));

    expect(panel.parent).toBe(shell);
    expect(classList(shell)).toEqual(expect.arrayContaining(['industrial-shell', 'login-shell', 'min-h-screen', 'items-center', 'justify-center', 'text-zinc-100']));
    expect(classList(panel)).toEqual(expect.arrayContaining(['login-panel', 'login-panel-compact', 'relative', 'w-full', 'overflow-hidden', 'border', 'border-zinc-700', 'bg-zinc-950/95', 'p-7', 'shadow-2xl']));
    expect(controls.inputs).toHaveLength(1);
    expect(controls.buttons).toHaveLength(1);
    expect(fadedIcon.attrs['aria-hidden']).toBe('true');
    expect(fadedIcon.attrs.alt).toBe('');
  });

  it('hält Ersteinrichtung und Ladezustand im kompakten Panel', () => {
    for (const mode of ['setup', 'loading'] satisfies AuthMode[]) {
      const tree = renderLoginTree(mode);
      const shell = loginShell(tree);
      const panel = loginPanel(tree);

      expect(panel.parent).toBe(shell);
      expect(classList(panel)).toEqual(expect.arrayContaining(['login-panel-compact', 'w-full', 'p-7']));
      expect(descendants(shell).some((node) => hasClasses(node, ['industrial-sidebar']))).toBe(false);
    }
  });

  it('rendert Sicherheitsfehler kompakt und Recovery bewusst breiter', () => {
    const unavailablePanel = loginPanel(renderLoginTree('unavailable'));
    const recoveryKeyPanel = loginPanel(renderLoginTree('loading' as AuthMode));
    const recoveryPanel = loginPanel(renderLoginTree('recovery'));

    expect(classList(unavailablePanel)).toEqual(expect.arrayContaining(['login-panel-compact', 'border-yellow-500/40', 'p-7']));
    expect(classList(recoveryKeyPanel)).toEqual(expect.arrayContaining(['login-panel-compact']));
    expect(classList(recoveryPanel)).toEqual(expect.arrayContaining(['login-panel-wide', 'border-yellow-500/40', 'p-7']));
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
