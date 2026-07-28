/**
 * Build monday.com board / automations URLs for History deep-links.
 */
import { mondayGraphQL } from './mondayGraphQL';

interface AccountSlugResult {
  me?: { account?: { slug?: string | null } | null } | null;
}

const ACCOUNT_SLUG_QUERY = `query {
  me {
    account {
      slug
    }
  }
}`;

let cachedSlug: string | null | undefined;

async function resolveAccountSlug(): Promise<string | null> {
  if (cachedSlug !== undefined) return cachedSlug;
  try {
    const data = await mondayGraphQL<AccountSlugResult>(ACCOUNT_SLUG_QUERY);
    const slug = data.me?.account?.slug?.trim() || null;
    cachedSlug = slug;
    return slug;
  } catch {
    cachedSlug = null;
    return null;
  }
}

/** Open the board itself in monday.com. */
export async function getMondayBoardUrl(boardId: string): Promise<string | null> {
  const slug = await resolveAccountSlug();
  if (!slug || !boardId) return null;
  return `https://${slug}.monday.com/boards/${boardId}`;
}

/**
 * Best-effort link to the board Automations manage page.
 * monday.com may redirect if the path varies by product version.
 */
export async function getMondayBoardAutomationsUrl(
  boardId: string,
): Promise<string | null> {
  const boardUrl = await getMondayBoardUrl(boardId);
  if (!boardUrl) return null;
  return `${boardUrl}/automations`;
}
