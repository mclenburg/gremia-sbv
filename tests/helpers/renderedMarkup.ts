import { createElement, type ComponentType, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

export type RenderedNode = {
  tag: string;
  attrs: Record<string, string>;
  children: RenderedNode[];
  parent?: RenderedNode;
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

export function parseRenderedMarkup(markup: string): RenderedNode {
  const root: RenderedNode = { tag: 'root', attrs: {}, children: [] };
  const stack: RenderedNode[] = [root];
  const tagPattern = /<\/?([a-zA-Z][\w:-]*)([^>]*)>/g;

  for (const match of markup.matchAll(tagPattern)) {
    const [token, rawTag, rawAttributes] = match;
    const tag = rawTag.toLowerCase();
    if (token.startsWith('</')) {
      while (stack.length > 1 && stack.at(-1)?.tag !== tag) stack.pop();
      if (stack.at(-1)?.tag === tag) stack.pop();
      continue;
    }

    const node: RenderedNode = {
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

export function renderComponent<Props extends object>(component: ComponentType<Props>, props: Props): { markup: string; tree: RenderedNode } {
  const markup = renderToStaticMarkup(createElement(component, props));
  return { markup, tree: parseRenderedMarkup(markup) };
}

export function renderElement(element: ReactElement): { markup: string; tree: RenderedNode } {
  const markup = renderToStaticMarkup(element);
  return { markup, tree: parseRenderedMarkup(markup) };
}

export function descendants(node: RenderedNode): RenderedNode[] {
  return node.children.flatMap((child) => [child, ...descendants(child)]);
}

export function classList(node: RenderedNode): string[] {
  return node.attrs.class?.split(/\s+/).filter(Boolean) ?? [];
}

export function hasClasses(node: RenderedNode, expectedClasses: string[]): boolean {
  const classes = new Set(classList(node));
  return expectedClasses.every((className) => classes.has(className));
}

export function visibleText(markup: string): string {
  return markup.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function findDescendants(root: RenderedNode, predicate: (node: RenderedNode) => boolean): RenderedNode[] {
  return descendants(root).filter(predicate);
}

export function firstDescendant(root: RenderedNode, predicate: (node: RenderedNode) => boolean): RenderedNode | undefined {
  return descendants(root).find(predicate);
}
