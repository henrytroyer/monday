/** HTML ↔ plain text helpers for rich email bodies. */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function isLikelyHtmlBody(value: string): boolean {
  const trimmed = value.trim();
  return /<(p|div|br|ul|ol|li|strong|em|span|a|h[1-6])\b/i.test(trimmed);
}

export function plainTextToHtml(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '<p><br></p>';
  if (isLikelyHtmlBody(trimmed)) return trimmed;

  return trimmed
    .split(/\n{2,}/)
    .map((paragraph) => {
      const lines = paragraph.split('\n').map(escapeHtml).join('<br>');
      return `<p>${lines || '<br>'}</p>`;
    })
    .join('');
}

export function htmlToPlainText(html: string): string {
  const trimmed = html.trim();
  if (!trimmed) return '';
  if (!isLikelyHtmlBody(trimmed)) return trimmed;

  if (typeof DOMParser === 'undefined') {
    return trimmed
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  const doc = new DOMParser().parseFromString(trimmed, 'text/html');
  const root = doc.body;

  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent ?? '';
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const element = node as HTMLElement;
    const tag = element.tagName.toLowerCase();
    const childText = [...element.childNodes].map(walk).join('');

    switch (tag) {
      case 'br':
        return '\n';
      case 'p':
      case 'div':
      case 'h1':
      case 'h2':
      case 'h3':
      case 'li':
        return `${childText}\n`;
      case 'ul':
      case 'ol':
        return `${childText}\n`;
      default:
        return childText;
    }
  };

  return walk(root)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function insertTextAtSelection(
  root: HTMLElement,
  text: string,
): void {
  root.focus();
  const selection = window.getSelection();
  if (!selection) {
    root.innerHTML += escapeHtml(text);
    return;
  }

  if (selection.rangeCount === 0 || !root.contains(selection.anchorNode)) {
    const range = document.createRange();
    range.selectNodeContents(root);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  const range = selection.getRangeAt(0);
  range.deleteContents();
  const node = document.createTextNode(text);
  range.insertNode(node);
  range.setStartAfter(node);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

export function normalizeEditorHtml(html: string): string {
  const trimmed = html.trim();
  if (!trimmed || trimmed === '<br>' || trimmed === '<p><br></p>') {
    return '<p><br></p>';
  }
  return trimmed;
}
