import { mondayGraphQL } from './mondayGraphQL';

interface MondayUserRow {
  id: string;
  name: string;
  email?: string;
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
  }
}`;

const USERS_QUERY = `query ($ids: [ID!]) {
  users(ids: $ids) {
    id
    name
    email
  }
}`;

export interface CurrentMondayUser {
  id: string;
  name: string;
  email?: string;
}

export async function fetchCurrentMondayUser(): Promise<CurrentMondayUser | null> {
  try {
    const data = await mondayGraphQL<MeQueryResult>(ME_QUERY);
    const me = data.me;
    if (!me?.id || !me.name) return null;
    return { id: String(me.id), name: me.name, email: me.email };
  } catch {
    return null;
  }
}

export async function resolveMondayUserNames(
  userIds: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(userIds.map((id) => id.trim()).filter(Boolean))];
  const map = new Map<string, string>();
  if (unique.length === 0) return map;

  const chunkSize = 50;
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    try {
      const data = await mondayGraphQL<UsersQueryResult>(USERS_QUERY, {
        ids: chunk,
      });
      for (const user of data.users ?? []) {
        if (user.id && user.name) {
          map.set(String(user.id), user.name);
        }
      }
    } catch {
      // Best-effort name resolution
    }
  }

  return map;
}
