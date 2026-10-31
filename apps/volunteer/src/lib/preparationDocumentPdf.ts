import type { PreparationDocumentDraft, PreparationDocumentId } from '../contract/volunteerApi';
import { DOCUMENT_FIELDS } from './preparationDocuments';

/** A one-page PDF of the submitted answers. ASCII text only. */
export function preparationDocumentPdf(
  id: PreparationDocumentId,
  draft: PreparationDocumentDraft,
): Uint8Array {
  const fields = DOCUMENT_FIELDS[id];
  const lines = [
    fields.title,
    `${fields.nameLabel}: ${draft.name}`,
    `${fields.dateLabel}: ${draft.date}`,
    `${fields.confirmLabel}: ${draft.confirmed === 'yes' ? 'Yes' : ''}`,
  ];
  return buildPdf(lines);
}

export function downloadPreparationDocumentPdf(
  id: PreparationDocumentId,
  draft: PreparationDocumentDraft,
): void {
  const bytes = preparationDocumentPdf(id, draft);
  const blob = new Blob(
    [bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer],
    { type: 'application/pdf' },
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${id.replaceAll('_', '-')}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}

function buildPdf(lines: readonly string[]): Uint8Array {
  const commands = ['BT', '/F1 16 Tf', '72 740 Td', `(${pdfEscape(lines[0] ?? '')}) Tj`, '/F1 12 Tf'];
  for (const line of lines.slice(1)) {
    commands.push('0 -22 Td', `(${pdfEscape(line)}) Tj`);
  }
  commands.push('ET');
  const stream = commands.join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Count 1 /Kids [3 0 R] >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

function pdfEscape(value: string): string {
  return value
    .replace(/[^\x20-\x7e]/g, '?')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}
