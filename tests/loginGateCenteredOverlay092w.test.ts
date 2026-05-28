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

    if (!token.endsWith('/>') && !voidElements.has(tag)) stack.push(node);
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

function styleMap(node: HtmlNode): Record<string, string> {
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
  return firstDescendant(root, (node) => node.tag === 'main' && hasClasses(node, ['industrial-shell', 'login-shell', 'auth-screen']));
}

function loginPanel(root: HtmlNode): HtmlNode {
  return firstDescendant(root, (node) => node.tag === 'section' && hasClasses(node, ['login-panel', 'auth-panel']));
}

describe('LoginGate Auth-Layout', () => {
  it('rendert den Entsperrbildschirm als zentriertes, kompaktes Auth-Overlay statt als App-Grid', () => {
    const tree = renderLoginTree('login');
    const shell = loginShell(tree);
    const panel = loginPanel(tree);
    const shellStyle = styleMap(shell);
    const panelStyle = styleMap(panel);

    expect(panel.parent).toBe(shell);
    expect(shellStyle.display).toBe('flex');
    expect(shellStyle['grid-template-columns']).toBe('none');
    expect(shellStyle['align-items']).toBe('center');
    expect(shellStyle['justify-content']).toBe('center');
    expect(panelStyle.width).toBe('min(100%,28rem)');
    expect(panelStyle['max-width']).toBe('28rem');
    expect(classList(panel)).toEqual(expect.arrayContaining(['auth-panel-compact', 'border-zinc-700', 'p-7']));
    expect(classList(panel)).not.toEqual(expect.arrayContaining(['max-w-none']));
  });

  it('hält Ersteinrichtung und Ladezustand in der kompakten Auth-Karte', () => {
    for (const mode of ['setup', 'loading'] satisfies AuthMode[]) {
      const panel = loginPanel(renderLoginTree(mode));
      const panelStyle = styleMap(panel);

      expect(classList(panel)).toEqual(expect.arrayContaining(['auth-panel-compact']));
      expect(panelStyle.width).toBe('min(100%,28rem)');
      expect(panelStyle['max-width']).toBe('28rem');
    }
  });

  it('rendert Recovery bewusst breiter, ohne in das entsperrte App-Layout zu fallen', () => {
    const unavailablePanel = loginPanel(renderLoginTree('unavailable'));
    const recoveryPanel = loginPanel(renderLoginTree('recovery'));

    expect(classList(unavailablePanel)).toEqual(expect.arrayContaining(['auth-panel-compact', 'border-yellow-500/40']));
    expect(styleMap(unavailablePanel)['max-width']).toBe('28rem');
    expect(classList(recoveryPanel)).toEqual(expect.arrayContaining(['auth-panel-wide', 'border-yellow-500/40']));
    expect(styleMap(recoveryPanel)['max-width']).toBe('52rem');
  });

  it('rendert in keinem Auth-Zustand Sidebar, Content-Grid oder Topbar der entsperrten Anwendung', () => {
    for (const mode of ['login', 'setup', 'loading', 'unavailable', 'recovery'] satisfies AuthMode[]) {
      const shellChildren = descendants(loginShell(renderLoginTree(mode)));

      expect(shellChildren.some((node) => hasClasses(node, ['industrial-sidebar']))).toBe(false);
      expect(shellChildren.some((node) => hasClasses(node, ['industrial-content']))).toBe(false);
      expect(shellChildren.some((node) => hasClasses(node, ['industrial-topbar']))).toBe(false);
    }
  });
});
