/** Parse monday.com WorkDoc block JSON into plain text for email templates. */

export interface MondayDocBlock {
  type: string;
  content: string;
}

interface DeltaOp {
  insert?: string;
  attributes?: {
    bold?: boolean;
    link?: string;
  };
}

interface BlockContentJson {
  deltaFormat?: DeltaOp[];
}

export function deltaFormatToText(content: string): string {
  if (!content.trim()) return '';

  let parsed: BlockContentJson;
  try {
    parsed = JSON.parse(content) as BlockContentJson;
  } catch {
    return content.trim();
  }

  const delta = parsed.deltaFormat;
  if (!Array.isArray(delta)) return '';

  return delta
    .map((op) => (typeof op.insert === 'string' ? op.insert : ''))
    .join('')
    .replace(/\u00a0/g, ' ')
    .trim();
}

export function blocksToPlainText(blocks: MondayDocBlock[]): string {
  const lines: string[] = [];
  let numberedIndex = 0;

  for (const block of blocks) {
    const text = deltaFormatToText(block.content);
    const type = block.type.trim().toLowerCase();

    if (!text) {
      if (type !== 'numbered list' && type !== 'bulleted list') {
        numberedIndex = 0;
      }
      continue;
    }

    if (type === 'numbered list') {
      numberedIndex += 1;
      lines.push(`${numberedIndex}. ${text}`);
      continue;
    }

    if (type === 'bulleted list') {
      numberedIndex = 0;
      lines.push(`• ${text}`);
      continue;
    }

    numberedIndex = 0;
    lines.push(text);
  }

  return lines
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Replace monday doc redaction markers (***, **) with CRM merge fields. */
export function generalizeDocPlaceholders(text: string): string {
  let result = text;

  result = result.replace(/Hello \*{2,3},/gi, 'Hello {{firstName}},');
  result = result.replace(/Dear \*{2,3},/gi, 'Dear {{firstName}},');
  result = result.replace(
    /pastor(?:'|’)?s reference for \*{2}\./gi,
    "pastor's reference for {{name}}.",
  );
  result = result.replace(
    /serving in \*{2} from beginning \*{2}/gi,
    'serving in {{location}} from {{timelineLabel}}',
  );
  result = result.replace(
    /join our in \*{2,3} from \*{2,3}/gi,
    'join our team in {{location}} from {{timelineLabel}}',
  );
  result = result.replace(
    /in \*{2,3} from \*{2,3}/gi,
    'in {{location}} from {{timelineLabel}}',
  );
  result = result.replace(
    /The date of departure is \*{4}\./gi,
    'The date of departure is {{timelineLabel}}.',
  );
  result = result.replace(/\*{4,}/g, '{{timelineLabel}}');
  result = result.replace(/\*{3}/g, '{{name}}');
  result = result.replace(/\*{2}/g, '{{name}}');

  return result;
}

export function slugFromDocName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
