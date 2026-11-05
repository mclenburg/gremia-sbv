export function addStructuredText(
  document: PDFKit.PDFDocument,
  parent: PDFKit.PDFStructureElement,
  tag: string,
  text: string,
  draw: () => void,
): void {
  parent.add(document.struct(tag, { actual: `${text} ` }, draw));
}
