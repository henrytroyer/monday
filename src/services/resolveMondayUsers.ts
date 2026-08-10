import { mondayGraphQL } from './mondayGraphQL';

interface MondayUserRow {
  id: string;
  name?: string | null;
  email?: string | null;
  photo_thumb?: string | null;
}

interface MeQueryResult {
  me?: MondayUserRow;
}

interface UsersQueryResult {
  users?: MondayUserRow[];
}

const ME_QUERY = `query {
  me {
    id
    name
    email
    photo_thumb
  }
}`;

/** Include guests / apps / inactive so activity actors still resolve. */
const USERS_BY_IDS_QUERY = `query ($ids: [ID!]) {
  users(ids: $ids, kind: all) {
    id
    name
    email
  }
}`;

/** Fallback if `kind` is unavailable on the account's API version. */
const USERS_BY_IDS_QUERY_PLAIN = `query ($ids: [ID!]) {
  users(ids: $ids) {
    id
    name
    email
  }
}`;

/**
 * monday.com uses negative / zero user ids for system / automation actors.
 * Passing them into `users(ids:)` fails the entire query — filter them out.
 */
function systemActorNameForId(userId: string): string | undefined {
  const trimmed = String(userId ?? '').trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  if (Number.isFinite(n) && n <= 0) return 'Automation';
  return undefined;
}

export interface CurrentMondayUser {
  id: string;
  name: string;
  email?: string;
  photoUrl?: string;
  /** i58finance Admin role (injected for hierarchical private notes). */
  role?: string;
}

/** Cross-request cache so History pagination reuses resolved names. */
const userNameCache = new Map<string, string>();

function displayNameFromUser(user: MondayUserRow): string | undefined {
  const name = user.name?.trim();
  if (name) return name;
  const email = user.email?.trim();
  if (!email) return undefined;
  const local = email.split('@')[0]?.trim();
  return local || email;
}

function rememberUser(user: MondayUserRow): void {
  if (!user.id) return;
  const label = displayNameFromUser(user);
  if (!label) return;
  userNameCache.set(String(user.id), label);
}

/** Positive numeric monday user ids only — negatives break the users query. */
export function isResolvableMondayUserId(userId: string): boolean {
  const trimmed = String(userId ?? '').trim();
  if (!trimmed) return false;
  if (systemActorNameForId(trimmed)) return false;
  const n = Number(trimmed);
  return Number.isFinite(n) && n > 0;
}

export function systemActorName(userId: string): string | undefined {
  return systemActorNameForId(userId);
}

export async function fetchCurrentMondayUser(): Promise<CurrentMondayUser | null> {
  try {
    const data = await mondayGraphQL<MeQueryResult>(ME_QUERY);
    const me = data.me;
    if (!me?.id) return null;
    const name = displayNameFromUser(me);
    if (!name) return null;
    rememberUser(me);
    return {
      id: String(me.id),
      name,
      email: me.email?.trim() || undefined,
      photoUrl: me.photo_thumb?.trim() || undefined,
    };
  } catch {
    return null;
  }
}

async function fetchUsersByIds(ids: string[]): Promise<MondayUserRow[]> {
  if (ids.length === 0) return [];
  try {
    const data = await mondayGraphQL<UsersQueryResult>(USERS_BY_IDS_QUERY, {
      ids,
    });
    return data.users ?? [];
  } catch {
    try {
      const data = await mondayGraphQL<UsersQueryResult>(USERS_BY_IDS_QUERY_PLAIN, {
        ids,
      });
      return data.users ?? [];
    } catch {
      return [];
    }
  }
}

/**
 * Resolve monday.com user IDs to display names for History / activity rows.
 * Prefers full name, then email local-part. Results are cached in-memory.
 * System / automation ids (e.g. `-4`) map to "Automation" and are never
 * sent to the users query (that would fail the whole batch).
 */
export async function resolveMondayUserNames(
  userIds: string[],
): Promise<Map<string, string>> {
  const unique = [
    ...new Set(userIds.map((id) => String(id ?? '').trim()).filter(Boolean)),
  ];
  const map = new Map<string, string>();
  if (unique.length === 0) return map;

  const missing: string[] = [];
  for (const id of unique) {
    const system = systemActorName(id);
    if (system) {
      map.set(id, system);
      userNameCache.set(id, system);
      continue;
    }

    const cached = userNameCache.get(id);
    if (cached) {
      map.set(id, cached);
      continue;
    }

    if (isResolvableMondayUserId(id)) {
      missing.push(id);
    }
  }

  const chunkSize = 50;
  for (let i = 0; i < missing.length; i += chunkSize) {
    const chunk = missing.slice(i, i + chunkSize);
    const users = await fetchUsersByIds(chunk);
    for (const user of users) {
      rememberUser(user);
      const label = displayNameFromUser(user);
      if (user.id && label) {
        map.set(String(user.id), label);
      }
    }
  }

  return map;
}

/** Test helper — clears the in-memory name cache. */
export function clearMondayUserNameCache(): void {
  userNameCache.clear();
}
