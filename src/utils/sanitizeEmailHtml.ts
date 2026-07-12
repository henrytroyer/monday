const ALLOWED_TAGS = new Set([
  'a',
  'b',
  'blockquote',
  'br',
  'div',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'hr',
  'i',
  'li',
  'ol',
  'p',
  'span',
  'strong',
  'u',
  'ul',
]);

const GLOBAL_UNSAFE = /^(script|style|iframe|object|embed|form|input|button|link|meta)$/i;

function sanitizeNode(node: Node): void {
  const children = [...node.childNodes];
  for (const child of children) {
    if (child.nodeType === Node.TEXT_NODE) continue;

    if (child.nodeType !== Node.ELEMENT_NODE) {
      child.parentNode?.removeChild(child);
      continue;
    }

    const element = child as HTMLElement;
    const tag = element.tagName.toLowerCase();

    if (GLOBAL_UNSAFE.test(tag) || !ALLOWED_TAGS.has(tag)) {
      while (element.firstChild) {
        element.parentNode?.insertBefore(element.firstChild, element);
      }
      element.parentNode?.removeChild(element);
      continue;
    }

    for (const attr of [...element.attributes]) {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim();

      if (name.startsWith('on') || name === 'style') {
        element.removeAttribute(attr.name);
        continue;
      }

      if (tag === 'a' && name === 'href') {
        if (!/^https?:\/\//i.test(value) && !/^mailto:/i.test(value)) {
          element.removeAttribute(attr.name);
        } else {
          element.setAttribute('rel', 'noopener noreferrer');
          element.setAttribute('target', '_blank');
        }
        continue;
      }

      if (!['href', 'target', 'rel', 'class'].includes(name)) {
        element.removeAttribute(attr.name);
      }
    }

    sanitizeNode(element);
  }
}

/** Strip unsafe markup while keeping readable email formatting. */
export function sanitizeEmailHtml(html: string): string {
  const trimmed = html.trim();
  if (!trimmed) return '';

  if (typeof DOMParser === 'undefined') {
    return sanitizeEmailHtmlFallback(trimmed);
  }

  const doc = new DOMParser().parseFromString(trimmed, 'text/html');
  sanitizeNode(doc.body);
  return doc.body.innerHTML.trim();
}

function sanitizeEmailHtmlFallback(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/<(?!br\b|\/p\b|\/div\b|\/span\b|\/strong\b|\/em\b|\/a\b|\/ul\b|\/ol\b|\/li\b|\/h[1-4]\b|p\b|div\b|span\b|a\b|strong\b|em\b|ul\b|ol\b|li\b|h[1-4]\b|blockquote\b|hr\b|b\b|i\b|u\b)[^>]+>/gi, '');
}

export function isLikelyHtmlBody(content: string): boolean {
  return /<[a-z][\s\S]*>/i.test(content);
}
