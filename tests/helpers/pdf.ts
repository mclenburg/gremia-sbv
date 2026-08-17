import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

export interface InspectedPdf {
  pageCount: number;
  textByPage: string[];
  title: string | undefined;
  language: string | undefined;
  hasStructureTree: boolean;
  structureRoles: string[];
}

interface StructureNode {
  role?: string;
  children?: unknown[];
}

function collectStructureRoles(node: unknown, roles: string[]): void {
  if (!node || typeof node !== 'object') return;
  const structureNode = node as StructureNode;
  if (structureNode.role) roles.push(structureNode.role);
  for (const child of structureNode.children ?? []) collectStructureRoles(child, roles);
}

export async function inspectPdf(buffer: Buffer): Promise<InspectedPdf> {
  const document = await getDocument({ data: new Uint8Array(buffer) }).promise;
  try {
    const textByPage: string[] = [];
    let hasStructureTree = false;
    let language: string | undefined;
    const structureRoles: string[] = [];

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      language ??= content.lang ?? undefined;
      textByPage.push(
        content.items
          .flatMap((item) => ('str' in item ? [item.str] : []))
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim(),
      );
      const structureTree = await page.getStructTree();
      hasStructureTree ||= Boolean(structureTree);
      collectStructureRoles(structureTree, structureRoles);
    }

    const metadata = await document.getMetadata();
    const markInfo = await document.getMarkInfo();
    const info = metadata.info as { Title?: string };
    return {
      pageCount: document.numPages,
      textByPage,
      title: info.Title,
      language,
      hasStructureTree: hasStructureTree && markInfo?.Marked === true,
      structureRoles,
    };
  } finally {
    await document.destroy();
  }
}
