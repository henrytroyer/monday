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

/** A printable page of the copy kept on file in the portal. */
export function preparationDocumentPrintHtml(
  id: PreparationDocumentId,
  draft: PreparationDocumentDraft,
): string {
  const fields = DOCUMENT_FIELDS[id];
  const certificate = id === 'safeguarding_certificate';
  const title = escapeHtml(fields.title);
  const name = escapeHtml(draft.name);
  const dateLabel = escapeHtml(fields.dateLabel);
  const date = escapeHtml(draft.date);
  const body = certificate
    ? `<header style="text-align:center">
        <p style="margin:0;letter-spacing:0.28em;font-size:12px;font-weight:700">i58</p>
        <h1 style="margin:18px 0 0;font-size:28px">${title}</h1>
        <div style="width:64px;height:3px;margin:16px auto 0;background:#c96c39"></div>
      </header>
      <div style="margin-top:36px;text-align:center">
        <p style="margin:0;font-size:11px;letter-spacing:0.14em;text-transform:uppercase">Certificate holder</p>
        <p style="margin:8px 0 0;font-size:26px;font-weight:700">${name}</p>
        <p style="margin:28px 0 0;font-size:11px;letter-spacing:0.14em;text-transform:uppercase">${dateLabel}</p>
        <p style="margin:8px 0 0;font-size:16px;font-weight:700">${date}</p>
        <p style="width:72px;height:72px;margin:36px auto 0;border:2px solid #c96c39;border-radius:999px;line-height:72px;letter-spacing:0.14em;font-size:11px;font-weight:700;color:#c96c39">i58</p>
      </div>`
    : `<header style="background:#1b365d;color:#fff;padding:18px 28px">
        <p style="margin:0;letter-spacing:0.28em;font-size:12px;font-weight:700">i58</p>
        <h1 style="margin:8px 0 0;font-size:24px;color:#fff">${title}</h1>
      </header>
      <div style="padding:28px">
        <div style="width:48px;height:3px;background:#c96c39"></div>
        <p style="margin:24px 0 0;font-size:11px;letter-spacing:0.14em;text-transform:uppercase">${escapeHtml(fields.nameLabel)}</p>
        <p style="margin:8px 0 0;font-size:22px;font-weight:700">${name}</p>
        <p style="margin:24px 0 0;font-size:11px;letter-spacing:0.14em;text-transform:uppercase">${dateLabel}</p>
        <p style="margin:8px 0 0;font-size:16px;font-weight:700">${date}</p>
      </div>`;
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${title}</title>
<style>
  @page { margin: 0.6in; }
  body { margin: 0; font-family: Helvetica, Arial, sans-serif; color: #1b365d; }
  article { min-height: 9in; border: ${certificate ? '6px double #1b365d' : '1px solid #d4c8b8'}; }
  .status { margin: 36px ${certificate ? '0' : '28px'} 0; color: #1f9d55; font-weight: 700; text-align: ${certificate ? 'center' : 'left'}; }
</style>
</head>
<body>
  <article>
    ${body}
    <p class="status">On file with i58</p>
  </article>
</body>
</html>`;
}

export function printPreparationDocument(
  id: PreparationDocumentId,
  draft: PreparationDocumentDraft,
): void {
  printHtmlDocument(preparationDocumentPrintHtml(id, draft));
}

export function printHtmlDocument(html: string): void {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0';
  document.body.appendChild(frame);
  const win = frame.contentWindow;
  const doc = frame.contentDocument;
  if (!win || !doc) {
    frame.remove();
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
  win.addEventListener('afterprint', () => frame.remove(), { once: true });
  win.focus();
  win.print();
}

export function downloadPdfFile(filename: string, lines: readonly string[]): void {
  const bytes = buildPdf(lines);
  const blob = new Blob(
    [bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer],
    { type: 'application/pdf' },
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadPreparationDocumentPdf(
  id: PreparationDocumentId,
  draft: PreparationDocumentDraft,
): void {
  downloadPdfFile(`${id.replaceAll('_', '-')}.pdf`, [
    DOCUMENT_FIELDS[id].title,
    `${DOCUMENT_FIELDS[id].nameLabel}: ${draft.name}`,
    `${DOCUMENT_FIELDS[id].dateLabel}: ${draft.date}`,
    `${DOCUMENT_FIELDS[id].confirmLabel}: ${draft.confirmed === 'yes' ? 'Yes' : ''}`,
  ]);
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pdfEscape(value: string): string {
  return value
    .replace(/[^\x20-\x7e]/g, '?')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}
