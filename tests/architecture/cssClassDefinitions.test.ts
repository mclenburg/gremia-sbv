import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();

const ignoredDirectories = new Set([
  "node_modules",
  "dist",
  "dist-electron",
  "release",
  "test-results",
]);

const cssContractFiles = [
  "src/styles/tailwind.css",
  "src/app/accessibility.css",
  "src/app/accessibilityLiveRegion.css",
  "src/app/ui/designTokens.css",
  "src/app/ui/base.css",
  "src/app/ui/appShell.css",
  "src/app/ui/components.css",
  "src/app/ui/modal.css",
  "src/app/ui/workbench.css",
  "src/app/ui/forms.css",
  "src/app/ui/processes.css",
  "src/app/ui/featureModules.css",
  "src/app/ui/responsiveDesign.css",
];

type ClassUsage = {
  className: string;
  file: string;
};

function toPosix(relativePath: string): string {
  return relativePath.split(path.sep).join("/");
}

function walkFiles(
  directory: string,
  predicate: (file: string) => boolean,
  files: string[] = [],
): string[] {
  if (!existsSync(directory)) return files;
  for (const entry of readdirSync(directory)) {
    if (ignoredDirectories.has(entry)) continue;
    const absolute = path.join(directory, entry);
    const stat = statSync(absolute);
    if (stat.isDirectory()) {
      walkFiles(absolute, predicate, files);
    } else if (predicate(absolute)) {
      files.push(toPosix(path.relative(projectRoot, absolute)));
    }
  }
  return files.sort((a, b) => a.localeCompare(b));
}

function cssSources(): string {
  return cssContractFiles
    .map((file) => path.join(projectRoot, file))
    .filter((file) => existsSync(file))
    .map((file) => readFileSync(file, "utf8"))
    .join("\n");
}

function definedCssClasses(): Set<string> {
  const classes = new Set<string>();
  const cssClassSelector = /\.(-?[_a-zA-Z][-_a-zA-Z0-9]*(?:\\:[-_a-zA-Z0-9]+)?(?:\\\.[-_a-zA-Z0-9]+)?)/g;
  for (const match of cssSources().matchAll(cssClassSelector)) {
    classes.add(match[1].replace(/\\:/g, ":").replace(/\\\./g, "."));
  }
  return classes;
}

function isExternalUtilityClass(className: string): boolean {
  return /^(?:-?(?:left|right|top|bottom)-\d+|-?(?:mt|mr|mb|ml|mx|my|pt|pr|pb|pl|px|py|p|m|gap|space-y)-\d+(?:\.\d)?|(?:h|w)-\d+(?:\.\d)?|min-h-screen|max-w-\w+|flex(?:-\w+)?|grid(?:-cols-\d+)?|items-\w+|justify-\w+|place-items-\w+|relative|absolute|overflow-\w+|pointer-events-none|select-all|rounded-none|border(?:-[trblxy])?|border-[a-z]+-\d+(?:\/\d+)?|bg-[a-z]+-\d+(?:\/\d+)?|text-(?:xs|sm|lg|xl|\dxl|left|center|[a-z]+-\d+(?:\/\d+)?)|font-\w+|leading-\d+|tracking-(?:tight|\[[^\]]+\])|shadow(?:-\w+|-\[[^\]]+\])?|opacity-\[[^\]]+\]|saturate-\d+|uppercase|inline|sr-only|w-full|shrink-0|(?:sm|md|lg|xl):[\w:-]+)$/.test(className);
}

function pushTokens(usages: ClassUsage[], raw: string, file: string): void {
  for (const className of raw.split(/\s+/).filter(Boolean)) {
    if (className.includes("${") || isExternalUtilityClass(className)) continue;
    usages.push({ className, file });
  }
}

function collectClassTokens(expression: ts.Expression | undefined, file: string): ClassUsage[] {
  const usages: ClassUsage[] = [];
  if (!expression) return usages;

  function collect(node: ts.Expression | undefined): void {
    if (!node) return;
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      pushTokens(usages, node.text, file);
      return;
    }
    if (ts.isTemplateExpression(node)) {
      pushTokens(usages, node.head.text, file);
      for (const span of node.templateSpans) pushTokens(usages, span.literal.text, file);
      return;
    }
    if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) {
      collect(node.expression);
      return;
    }
    if (ts.isConditionalExpression(node)) {
      collect(node.whenTrue);
      collect(node.whenFalse);
      return;
    }
    if (ts.isArrayLiteralExpression(node)) {
      for (const element of node.elements) collect(element as ts.Expression);
      return;
    }
    if (ts.isBinaryExpression(node)) {
      if (node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
        collect(node.right);
        return;
      }
      if (
        node.operatorToken.kind === ts.SyntaxKind.PlusToken ||
        node.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
        node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
      ) {
        collect(node.left);
        collect(node.right);
      }
      return;
    }
    if (ts.isCallExpression(node)) {
      const callee = node.expression.getText();
      if (/(?:joinClassNames|classNames|clsx|twMerge)$/.test(callee)) {
        for (const argument of node.arguments) collect(argument as ts.Expression);
      }
    }
  }

  collect(expression);
  return usages;
}

function usedClassNames(): ClassUsage[] {
  return walkFiles(path.join(projectRoot, "src", "app"), (file) => /\.(ts|tsx)$/.test(file))
    .flatMap((file) => {
      const absolute = path.join(projectRoot, file);
      const source = ts.createSourceFile(
        file,
        readFileSync(absolute, "utf8"),
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      );
      const usages: ClassUsage[] = [];

      function visit(node: ts.Node): void {
        if (
          ts.isJsxAttribute(node) &&
          ts.isIdentifier(node.name) &&
          node.name.text === "className" &&
          node.initializer
        ) {
          if (ts.isStringLiteral(node.initializer)) {
            pushTokens(usages, node.initializer.text, file);
          } else if (ts.isJsxExpression(node.initializer)) {
            usages.push(...collectClassTokens(node.initializer.expression, file));
          }
        }
        ts.forEachChild(node, visit);
      }

      visit(source);
      return usages;
    });
}

describe("CSS-Klassenvertrag", () => {
  it("definiert alle statisch verwendeten Projektklassen in der zentralen CSS-Schicht", () => {
    const defined = definedCssClasses();
    const missing = usedClassNames()
      .filter(({ className }) => {
        if (className.endsWith("-")) {
          return ![...defined].some((candidate) => candidate.startsWith(className));
        }
        return !defined.has(className);
      })
      .map(({ className, file }) => `${className} (${file})`)
      .sort((a, b) => a.localeCompare(b));

    expect(missing).toEqual([]);
  });
});
