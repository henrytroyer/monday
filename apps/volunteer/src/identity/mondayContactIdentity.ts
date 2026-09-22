/**
 * mondayContactIdentity.ts — Find or create one Contacts-board item for a
 * verified email. Callers pass a GraphQL function so the Monday token stays
 * on the server.
 */

import { normalizeEmail, type VolunteerProfile } from './profile.ts';
import {
  contactMatchesPhoneAndLastName,
  decideContactIdentity,
  type ContactSnapshot,
  type DemographicKey,
  type IdentityDecision,
} from './resolveContactIdentity.ts';

export interface MondayColumn {
  id: string;
  title: string;
  type: string;
  settings_str?: string;
}

export interface MondayItem {
  id: string;
  name: string;
  column_values: Array<{ id: string; text?: string | null }>;
}

export type MondayGraphql = (
  query: string,
  variables?: Record<string, unknown>,
) => Promise<unknown>;

export interface IdentityRunResult {
  status: 'found' | 'created' | 'needs_staff' | 'confirm_match';
  name: string;
  email: string;
  reason?: 'duplicate_email' | 'phone_name_match';
  /** Existing contact, shown only so the person can confirm. Not a Monday id. */
  matchedName?: string;
  matchedEmail?: string;
}

const COLUMN_TITLES = {
  email: ['Email'],
  altEmail: ['Alt Email'],
  phone: ['Phone'],
  street: ['Street'],
  city: ['City'],
  state: ['State/Providence', 'State'],
  zip: ['Zip Code', 'Postal Code', 'Zip'],
  country: ['Country'],
  dateOfBirth: ['Date of birth', 'Birthdate'],
  tags: ['Tags'],
  /** Live Contacts board stores the role on dropdown "Type", not a Tags column. */
  type: ['Type', 'type'],
} as const;

const COLUMNS_QUERY = `query VolunteerIdentityColumns($boardId: [ID!]) {
  boards(ids: $boardId) {
    columns { id title type settings_str }
  }
}`;

const SEARCH_QUERY = `query VolunteerIdentitySearch($boardId: [ID!], $columnId: ID!, $value: CompareValue!) {
  boards(ids: $boardId) {
    items_page(limit: 25, query_params: {
      rules: [{ column_id: $columnId, compare_value: $value, operator: contains_text }]
    }) {
      items { id name column_values { id text } }
    }
  }
}`;

const CREATE_MUTATION = `mutation VolunteerIdentityCreate($boardId: ID!, $itemName: String!) {
  create_item(board_id: $boardId, item_name: $itemName) { id name }
}`;

const UPDATE_MUTATION = `mutation VolunteerIdentityUpdate(
  $boardId: ID!,
  $itemId: ID!,
  $columnValues: JSON!,
  $createLabelsIfMissing: Boolean
) {
  change_multiple_column_values(
    board_id: $boardId,
    item_id: $itemId,
    column_values: $columnValues,
    create_labels_if_missing: $createLabelsIfMissing
  ) { id }
}`;

const RENAME_MUTATION = `mutation VolunteerIdentityRename($boardId: ID!, $itemId: ID!, $itemName: String!) {
  change_simple_column_value(
    board_id: $boardId,
    item_id: $itemId,
    column_id: "name",
    value: $itemName
  ) { id }
}`;

const CREATE_COLUMN_MUTATION = `mutation VolunteerIdentityCreateColumn($boardId: ID!, $columnTitle: String!, $columnType: ColumnType!) {
  create_column(board_id: $boardId, title: $columnTitle, type: $columnType) {
    id
    title
    type
  }
}`;

export async function runContactIdentity(input: {
  graphql: MondayGraphql;
  boardId: string;
  email: string;
  profile: VolunteerProfile;
  tagLabel?: string;
  /** Person confirmed the phone-and-last-name contact is theirs. */
  confirmMatch?: boolean;
}): Promise<IdentityRunResult> {
  const email = normalizeEmail(input.email);
  if (!email) {
    throw new Error('A verified email is required.');
  }
  const tagLabel = input.tagLabel?.trim() || 'Volunteer';
  const columns = await fetchColumns(input.graphql, input.boardId);
  const emailColumn = requireColumn(columns, COLUMN_TITLES.email, 'Email');
  const altEmailColumn = findColumn(columns, COLUMN_TITLES.altEmail);
  const phoneColumn = findColumn(columns, COLUMN_TITLES.phone);

  const emailItems = await searchItems(input.graphql, input.boardId, emailColumn.id, email);
  // The live Contacts board has no Alt Email column. When it exists, a
  // verified address stored there still counts as the same person.
  const altItems = altEmailColumn
    ? await searchItems(input.graphql, input.boardId, altEmailColumn.id, email)
    : [];
  const emailMatches = uniqueSnapshots(
    [...emailItems, ...altItems]
      .map((item) => snapshotFromItem(item, columns))
      .filter((contact) => snapshotHasEmail(contact, email)),
  );

  let phoneNameMatches: ContactSnapshot[] = [];
  if (emailMatches.length === 0 && phoneColumn) {
    const digits = input.profile.phone.replace(/\D/g, '');
    const probe = digits.length >= 7 ? digits.slice(-7) : '';
    if (probe) {
      const phoneItems = await searchItems(
        input.graphql,
        input.boardId,
        phoneColumn.id,
        probe,
      );
      phoneNameMatches = uniqueSnapshots(
        phoneItems
          .map((item) => snapshotFromItem(item, columns))
          .filter((contact) => contactMatchesPhoneAndLastName(contact, input.profile)),
      );
    }
  }

  const decision = decideContactIdentity({
    profile: input.profile,
    emailMatches,
    phoneNameMatches,
  });

  if (decision.status === 'confirm_match') {
    const matched = phoneNameMatches.find((contact) => contact.id === decision.contactId);
    if (!input.confirmMatch) {
      return {
        status: 'confirm_match',
        name: input.profile.fullName,
        email,
        matchedName: matched?.name.trim() || input.profile.fullName,
        matchedEmail: matched?.email.trim() || '',
      };
    }
    if (!matched) {
      return {
        status: 'needs_staff',
        name: input.profile.fullName,
        email,
        reason: 'phone_name_match',
      };
    }
    const withAlt = await ensureAltEmailColumn(input.graphql, input.boardId, columns);
    const asExisting = decideContactIdentity({
      profile: input.profile,
      emailMatches: [matched],
      phoneNameMatches: [],
    });
    if (asExisting.status === 'found') {
      await applyFills(input.graphql, input.boardId, withAlt, asExisting);
    }
    await writeAltEmail(input.graphql, input.boardId, withAlt, matched, email);
    return { status: 'found', name: displayName(matched, input.profile.fullName), email };
  }

  if (input.confirmMatch && decision.status !== 'found') {
    return {
      status: 'needs_staff',
      name: input.profile.fullName,
      email,
      reason: 'phone_name_match',
    };
  }

  if (decision.status === 'needs_staff') {
    return {
      status: 'needs_staff',
      name: input.profile.fullName,
      email,
      reason: decision.reason,
    };
  }

  if (decision.status === 'found') {
    await applyFills(input.graphql, input.boardId, columns, decision);
    const existing = emailMatches.find((contact) => contact.id === decision.contactId);
    const name =
      existing && existing.name.trim() && existing.name.trim() !== '—'
        ? existing.name.trim()
        : input.profile.fullName;
    return { status: 'found', name, email };
  }

  await createContact(input.graphql, input.boardId, columns, input.profile, email, tagLabel);
  return { status: 'created', name: input.profile.fullName, email };
}

function displayName(contact: ContactSnapshot, fallback: string): string {
  const name = contact.name.trim();
  if (!name || name === '—') return fallback;
  return name;
}

async function ensureAltEmailColumn(
  graphql: MondayGraphql,
  boardId: string,
  columns: MondayColumn[],
): Promise<MondayColumn[]> {
  const existing = findColumn(columns, COLUMN_TITLES.altEmail);
  if (existing) return columns;
  const created = (await graphql(CREATE_COLUMN_MUTATION, {
    boardId,
    columnTitle: 'Alt Email',
    columnType: 'text',
  })) as { create_column?: { id?: string; title?: string; type?: string } };
  const column = created.create_column;
  if (!column?.id) throw new Error('Monday did not create an Alt Email column.');
  return [
    ...columns,
    {
      id: column.id,
      title: column.title || 'Alt Email',
      type: column.type || 'text',
    },
  ];
}

async function writeAltEmail(
  graphql: MondayGraphql,
  boardId: string,
  columns: MondayColumn[],
  contact: ContactSnapshot,
  googleEmail: string,
): Promise<void> {
  const column = findColumn(columns, COLUMN_TITLES.altEmail);
  if (!column) throw new Error('Contacts board is missing an Alt Email column.');
  const next = mergedAltEmail(contact.altEmail, googleEmail);
  if (!next) return;
  await graphql(UPDATE_MUTATION, {
    boardId,
    itemId: contact.id,
    columnValues: JSON.stringify({ [column.id]: next }),
    createLabelsIfMissing: false,
  });
}

/** Keep the primary email untouched. Add the Google address to Alt Email. */
export function mergedAltEmail(existing: string, googleEmail: string): string | null {
  const target = normalizeEmail(googleEmail);
  if (!target) return null;
  const parts = existing
    .split(/[,;]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  if (parts.some((part) => normalizeEmail(part) === target)) return null;
  if (parts.length === 0) return googleEmail;
  return `${parts.join(', ')}, ${googleEmail}`;
}

async function fetchColumns(graphql: MondayGraphql, boardId: string): Promise<MondayColumn[]> {
  const data = (await graphql(COLUMNS_QUERY, { boardId: [boardId] })) as {
    boards?: Array<{ columns?: MondayColumn[] }>;
  };
  return data.boards?.[0]?.columns ?? [];
}

async function searchItems(
  graphql: MondayGraphql,
  boardId: string,
  columnId: string,
  value: string,
): Promise<MondayItem[]> {
  const data = (await graphql(SEARCH_QUERY, {
    boardId: [boardId],
    columnId,
    value: [value],
  })) as {
    boards?: Array<{ items_page?: { items?: MondayItem[] } }>;
  };
  return data.boards?.[0]?.items_page?.items ?? [];
}

async function applyFills(
  graphql: MondayGraphql,
  boardId: string,
  columns: MondayColumn[],
  decision: Extract<IdentityDecision, { status: 'found' }>,
): Promise<void> {
  const { name, ...rest } = decision.fills;
  const columnValues = columnValueMap(columns, rest, null, null);
  if (Object.keys(columnValues).length > 0) {
    await graphql(UPDATE_MUTATION, {
      boardId,
      itemId: decision.contactId,
      columnValues: JSON.stringify(columnValues),
      createLabelsIfMissing: false,
    });
  }
  if (name) {
    await graphql(RENAME_MUTATION, {
      boardId,
      itemId: decision.contactId,
      itemName: name,
    });
  }
}

async function createContact(
  graphql: MondayGraphql,
  boardId: string,
  columns: MondayColumn[],
  profile: VolunteerProfile,
  email: string,
  tagLabel: string,
): Promise<void> {
  const created = (await graphql(CREATE_MUTATION, {
    boardId,
    itemName: profile.fullName,
  })) as { create_item?: { id?: string } };
  const itemId = created.create_item?.id;
  if (!itemId) {
    throw new Error('Monday did not return a new contact id.');
  }
  const columnValues = columnValueMap(
    columns,
    {
      phone: profile.phone,
      street: profile.street,
      city: profile.city,
      state: profile.state,
      zip: profile.zip,
      country: profile.country,
      dateOfBirth: profile.dateOfBirth,
    },
    email,
    tagLabel,
  );
  if (Object.keys(columnValues).length === 0) {
    throw new Error('Contacts board is missing an Email column.');
  }
  await graphql(UPDATE_MUTATION, {
    boardId,
    itemId,
    columnValues: JSON.stringify(columnValues),
    createLabelsIfMissing: true,
  });
}

function columnValueMap(
  columns: MondayColumn[],
  fills: Partial<Record<DemographicKey, string>>,
  email: string | null,
  tagLabel: string | null,
): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  const assign = (titles: readonly string[], value: unknown) => {
    const column = findColumn(columns, titles);
    if (!column || value == null) return;
    values[column.id] = value;
  };
  if (email) {
    const column = requireColumn(columns, COLUMN_TITLES.email, 'Email');
    values[column.id] = emailColumnValue(column, email);
  }
  if (fills.phone) assign(COLUMN_TITLES.phone, phoneColumnValue(findColumn(columns, COLUMN_TITLES.phone), fills.phone));
  if (fills.street) assign(COLUMN_TITLES.street, textColumnValue(findColumn(columns, COLUMN_TITLES.street), fills.street));
  if (fills.city) assign(COLUMN_TITLES.city, textColumnValue(findColumn(columns, COLUMN_TITLES.city), fills.city));
  if (fills.state) assign(COLUMN_TITLES.state, textColumnValue(findColumn(columns, COLUMN_TITLES.state), fills.state));
  if (fills.zip) assign(COLUMN_TITLES.zip, textColumnValue(findColumn(columns, COLUMN_TITLES.zip), fills.zip));
  if (fills.country) assign(COLUMN_TITLES.country, textColumnValue(findColumn(columns, COLUMN_TITLES.country), fills.country));
  if (fills.dateOfBirth) {
    assign(
      COLUMN_TITLES.dateOfBirth,
      dateColumnValue(findColumn(columns, COLUMN_TITLES.dateOfBirth), fills.dateOfBirth),
    );
  }
  if (tagLabel) {
    const tags = findTagColumn(columns);
    const formatted = tags ? tagColumnValue(tags, tagLabel) : null;
    if (tags && formatted != null) values[tags.id] = formatted;
  }
  return values;
}

export function snapshotFromItem(item: MondayItem, columns: MondayColumn[]): ContactSnapshot {
  const text = (titles: readonly string[]) => {
    const column = findColumn(columns, titles);
    if (!column) return '';
    return item.column_values.find((value) => value.id === column.id)?.text?.trim() ?? '';
  };
  return {
    id: item.id,
    name: item.name ?? '',
    email: text(COLUMN_TITLES.email),
    altEmail: text(COLUMN_TITLES.altEmail),
    phone: text(COLUMN_TITLES.phone),
    street: text(COLUMN_TITLES.street),
    city: text(COLUMN_TITLES.city),
    state: text(COLUMN_TITLES.state),
    zip: text(COLUMN_TITLES.zip),
    country: text(COLUMN_TITLES.country),
    dateOfBirth: text(COLUMN_TITLES.dateOfBirth),
  };
}

function snapshotHasEmail(contact: ContactSnapshot, email: string): boolean {
  const target = normalizeEmail(email);
  if (!target) return false;
  const candidates = [contact.email, ...contact.altEmail.split(/[,;]/)];
  return candidates.some((candidate) => normalizeEmail(candidate) === target);
}

function findTagColumn(columns: MondayColumn[]): MondayColumn | undefined {
  return findColumn(columns, COLUMN_TITLES.tags) ?? findColumn(columns, COLUMN_TITLES.type);
}

function findColumn(columns: MondayColumn[], titles: readonly string[]): MondayColumn | undefined {
  const wanted = new Set(titles.map((title) => title.trim().toLowerCase()));
  return columns.find((column) => wanted.has(column.title.trim().toLowerCase()));
}

function requireColumn(columns: MondayColumn[], titles: readonly string[], label: string): MondayColumn {
  const column = findColumn(columns, titles);
  if (!column) throw new Error(`Contacts board is missing a ${label} column.`);
  return column;
}

function emailColumnValue(column: MondayColumn, email: string): unknown {
  if (column.type === 'email') return { email, text: email };
  return email;
}

function phoneColumnValue(column: MondayColumn | undefined, phone: string): unknown {
  if (!column) return null;
  if (column.type === 'phone') return { phone, countryShortName: '' };
  return phone;
}

function textColumnValue(column: MondayColumn | undefined, value: string): unknown {
  if (!column) return null;
  if (column.type === 'long_text') return { text: value };
  return value;
}

function dateColumnValue(column: MondayColumn | undefined, value: string): unknown {
  if (!column) return null;
  if (column.type === 'date') return { date: value };
  return value;
}

function tagColumnValue(column: MondayColumn, label: string): unknown {
  if (column.type === 'status') {
    if (statusAllowsMultiple(column.settings_str)) return { labels: [label] };
    return { label };
  }
  if (column.type === 'dropdown') return { labels: [label] };
  if (column.type === 'text' || column.type === 'long_text') return label;
  return null;
}

function statusAllowsMultiple(settingsStr: string | undefined): boolean {
  if (!settingsStr?.trim()) return false;
  try {
    const settings = JSON.parse(settingsStr) as { limit_select?: number };
    return settings.limit_select === 0 || (settings.limit_select ?? 1) > 1;
  } catch {
    return false;
  }
}

function uniqueSnapshots(contacts: ContactSnapshot[]): ContactSnapshot[] {
  const seen = new Set<string>();
  const unique: ContactSnapshot[] = [];
  for (const contact of contacts) {
    if (seen.has(contact.id)) continue;
    seen.add(contact.id);
    unique.push(contact);
  }
  return unique;
}
