import { Fragment, type ReactNode } from 'react';

const URL_PATTERN = /https?:\/\/[^\s<>"')\]]+/gi;
const BULLET_LINE = /^\s*(?:[-*•]|\d+\.)\s+/;

export function splitEmailBodyParagraphs(body: string): string[] {
  const normalized = body.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];
  return normalized
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function linkifyPlainText(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(URL_PATTERN)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      nodes.push(text.slice(lastIndex, index));
    }
    const url = match[0];
    nodes.push(
      <a
        key={`${index}-${url}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all text-crm-indigo underline decoration-crm-indigo/35 underline-offset-2 hover:text-crm-indigo-dark"
      >
        {url}
      </a>,
    );
    lastIndex = index + url.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
}

function renderTextWithLineBreaks(text: string): ReactNode {
  const lines = text.split('\n');
  return lines.map((line, index) => (
    <Fragment key={index}>
      {index > 0 && <br />}
      {linkifyPlainText(line)}
    </Fragment>
  ));
}

function renderListBlock(lines: string[]): ReactNode {
  const ordered = /^\s*\d+\.\s+/.test(lines[0] ?? '');
  const Tag = ordered ? 'ol' : 'ul';
  return (
    <Tag className={ordered ? 'list-decimal' : 'list-disc'}>
      {lines.map((line, index) => (
        <li key={index}>{renderTextWithLineBreaks(line.replace(BULLET_LINE, ''))}</li>
      ))}
    </Tag>
  );
}

function renderParagraphBlock(text: string): ReactNode {
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  const listLines = lines.filter((line) => BULLET_LINE.test(line));
  if (listLines.length >= 2 && listLines.length === lines.length) {
    return renderListBlock(lines);
  }

  return <p>{renderTextWithLineBreaks(text)}</p>;
}

export function renderFormattedEmailBody(body: string): ReactNode {
  const paragraphs = splitEmailBodyParagraphs(body);
  if (paragraphs.length === 0) {
    return <p className="text-crm-slate">No message body.</p>;
  }

  return paragraphs.map((paragraph, index) => (
    <Fragment key={index}>{renderParagraphBlock(paragraph)}</Fragment>
  ));
}
