import {
  canEditEmailTemplates,
  resolveEmailTemplatesBoardId,
  useMockData,
} from '../config/boards';
import { emailTemplateMap } from '../config/emailTemplateMap';
import type { EmailTemplate, EmailTemplateInput } from '../types/emailTemplate';
import { MOCK_EMAIL_TEMPLATES } from '../data/emailTemplates';
import { formatColumnValue, mutations, queries } from '../utils/mondayQueries';
import { fetchBoardColumns } from './crmApi';
import { mondayGraphQL } from './mondayGraphQL';

type MondayTemplateItem = {
  id: string;
  name: string;
  column_values: Array<{
    id: string;
    text?: string | null;
    value?: string | null;
    type?: string;
    column?: { title?: string | null } | null;
  }>;
};

function normalizeColumnTitle(title: string): string {
  return title.trim().toLowerCase();
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function parseLongText(value: string | null | undefined): string {
  if (!value?.trim()) return '';
  try {
    const parsed = JSON.parse(value) as { text?: string };
    if (typeof parsed.text === 'string') return parsed.text;
  } catch {
    // plain text fallback
  }
  return value.trim();
}

function columnText(item: MondayTemplateItem, title: string): string {
  const target = normalizeColumnTitle(title);
  for (const column of item.column_values ?? []) {
    const columnTitle = column.column?.title?.trim();
    if (!columnTitle || normalizeColumnTitle(columnTitle) !== target) continue;
    if (column.type === 'long_text') {
      return parseLongText(column.value ?? column.text);
    }
    return column.text?.trim() ?? parseLongText(column.value);
  }
  return '';
}

function mapItemToTemplate(item: MondayTemplateItem): EmailTemplate {
  const subject = columnText(item, emailTemplateMap.subject);
  const body = columnText(item, emailTemplateMap.body);
  const templateIdColumn = columnText(item, emailTemplateMap.templateId);
  const templateId = templateIdColumn || slugify(item.name) || item.id;

  return {
    id: item.id,
    templateId,
    name: item.name.trim() || templateId,
    subject,
    body,
  };
}

async function resolveBoardId(): Promise<string> {
  const boardId = resolveEmailTemplatesBoardId();
  if (!boardId) {
    throw new Error(
      'Email Templates board is not configured. Set VITE_EMAIL_TEMPLATES_BOARD_ID in .env (run npm run import:communications-docs).',
    );
  }
  return boardId;
}

async function resolveColumnId(
  boardId: string,
  title: string,
): Promise<{ id: string; type: string }> {
  const columns = await fetchBoardColumns(boardId);
  const target = normalizeColumnTitle(title);
  const column = columns.find((entry) => normalizeColumnTitle(entry.title) === target);
  if (!column) {
    throw new Error(
      `Column "${title}" not found on Email Templates board. Run npm run import:communications-docs.`,
    );
  }
  return { id: column.id, type: column.type };
}

type BoardItemsPageResponse = {
  boards: Array<{
    items_page: {
      cursor: string | null;
      items: MondayTemplateItem[];
    };
  }>;
};

export async function fetchEmailTemplates(): Promise<EmailTemplate[]> {
  if (useMockData()) return [...MOCK_EMAIL_TEMPLATES];

  const boardId = await resolveBoardId();
  const limit = 500;
  let cursor: string | null = null;
  const items: MondayTemplateItem[] = [];

  do {
    const data: BoardItemsPageResponse = await mondayGraphQL<BoardItemsPageResponse>(
      queries.getBoardItemsPage,
      {
        boardId: [boardId],
        limit,
        cursor: cursor ?? undefined,
      },
    );

    const page: BoardItemsPageResponse['boards'][number]['items_page'] | undefined =
      data.boards?.[0]?.items_page;
    if (!page?.items?.length) break;
    items.push(...page.items);
    cursor = page.cursor || null;
  } while (cursor);

  return items
    .map(mapItemToTemplate)
    .filter((template) => template.subject || template.body)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function createEmailTemplate(
  input: EmailTemplateInput,
): Promise<EmailTemplate> {
  if (!canEditEmailTemplates()) {
    throw new Error('Email templates are read-only.');
  }

  const boardId = await resolveBoardId();
  const created = await mondayGraphQL<{
    create_item: { id: string; name: string };
  }>(mutations.createItem, {
    boardId,
    itemName: input.name.trim() || input.templateId,
  });

  const itemId = created.create_item.id;
  const subjectCol = await resolveColumnId(boardId, emailTemplateMap.subject);
  const bodyCol = await resolveColumnId(boardId, emailTemplateMap.body);
  const templateIdCol = await resolveColumnId(
    boardId,
    emailTemplateMap.templateId,
  );

  await mondayGraphQL(mutations.updateColumnValue, {
    boardId,
    itemId,
    columnId: subjectCol.id,
    value: formatColumnValue(input.subject, subjectCol.type),
  });
  await mondayGraphQL(mutations.updateColumnValue, {
    boardId,
    itemId,
    columnId: bodyCol.id,
    value: formatColumnValue(input.body, bodyCol.type),
  });
  await mondayGraphQL(mutations.updateColumnValue, {
    boardId,
    itemId,
    columnId: templateIdCol.id,
    value: formatColumnValue(input.templateId, templateIdCol.type),
  });

  return {
    id: itemId,
    templateId: input.templateId,
    name: input.name.trim() || input.templateId,
    subject: input.subject,
    body: input.body,
  };
}

export async function updateEmailTemplate(
  template: EmailTemplate,
  input: EmailTemplateInput,
): Promise<EmailTemplate> {
  if (!canEditEmailTemplates()) {
    throw new Error('Email templates are read-only.');
  }

  const boardId = await resolveBoardId();

  if (input.name.trim() && input.name.trim() !== template.name) {
    await mondayGraphQL(mutations.updateItemName, {
      boardId,
      itemId: template.id,
      itemName: input.name.trim(),
    });
  }

  const subjectCol = await resolveColumnId(boardId, emailTemplateMap.subject);
  const bodyCol = await resolveColumnId(boardId, emailTemplateMap.body);
  const templateIdCol = await resolveColumnId(
    boardId,
    emailTemplateMap.templateId,
  );

  await mondayGraphQL(mutations.updateColumnValue, {
    boardId,
    itemId: template.id,
    columnId: subjectCol.id,
    value: formatColumnValue(input.subject, subjectCol.type),
  });
  await mondayGraphQL(mutations.updateColumnValue, {
    boardId,
    itemId: template.id,
    columnId: bodyCol.id,
    value: formatColumnValue(input.body, bodyCol.type),
  });
  await mondayGraphQL(mutations.updateColumnValue, {
    boardId,
    itemId: template.id,
    columnId: templateIdCol.id,
    value: formatColumnValue(input.templateId, templateIdCol.type),
  });

  return {
    id: template.id,
    templateId: input.templateId,
    name: input.name.trim() || input.templateId,
    subject: input.subject,
    body: input.body,
  };
}

export async function deleteEmailTemplate(templateId: string): Promise<void> {
  if (!canEditEmailTemplates()) {
    throw new Error('Email templates are read-only.');
  }

  await mondayGraphQL(mutations.deleteItem, { itemId: templateId });
}
