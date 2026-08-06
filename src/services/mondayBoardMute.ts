/**
 * mondayBoardMute.ts — Temporarily mute board notifications around bulk writes.
 *
 * Monday GraphQL (2025-01) has no create_notifications:false / silent flag on
 * change_column_value, change_multiple_column_values, or archive_item. Archives
 * notify item subscribers; column churn can also fire automations / board alerts.
 *
 * Best API quiet path: update_mute_board_settings(MUTE_ALL) for the Contacts
 * board while merge runs (API-Version 2025-10+, admin token), then restore.
 *
 * If the token is not an admin (or mute APIs fail), merge still proceeds with
 * batched change_multiple_column_values. For full silence without admin mute:
 * Contacts board → ⋯ → Notifications → "Mute for everyone", and disable
 * Automations that notify on archive / column change for that board.
 */

import { mondayGraphQL } from './mondayGraphQL';
import { mutations, queries } from '../utils/mondayQueries';

/** Mute board APIs landed in monday API 2025-10. */
const MUTE_API_VERSION = '2025-10';

type BoardMuteState =
  | 'CURRENT_USER_MUTE_ALL'
  | 'CUSTOM_SETTINGS'
  | 'MENTIONS_AND_ASSIGNS_ONLY'
  | 'MUTE_ALL'
  | 'NOT_MUTED'
  | string;

type MuteBoardSettings = {
  board_id?: string | null;
  mute_state?: BoardMuteState | null;
  enabled?: string[] | null;
};

type MuteSession = {
  depth: number;
  previousMuteState: BoardMuteState;
  previousEnabled: string[] | null;
  muteApplied: boolean;
};

const sessions = new Map<string, MuteSession>();

async function readMuteSettings(
  boardId: string,
): Promise<MuteBoardSettings | null> {
  try {
    const data = await mondayGraphQL<{
      mute_board_settings: MuteBoardSettings[];
    }>(
      queries.getMuteBoardSettings,
      { boardIds: [boardId] },
      { apiVersion: MUTE_API_VERSION },
    );
    return data.mute_board_settings?.[0] ?? null;
  } catch {
    return null;
  }
}

async function setMuteState(
  boardId: string,
  muteState: BoardMuteState,
  enabled?: string[] | null,
): Promise<void> {
  const variables: Record<string, unknown> = {
    boardId: String(boardId),
    muteState,
  };
  if (muteState === 'CUSTOM_SETTINGS' && enabled?.length) {
    variables.enabled = enabled;
  }
  await mondayGraphQL(
    mutations.updateMuteBoardSettings,
    variables,
    { apiVersion: MUTE_API_VERSION },
  );
}

async function beginBoardMute(boardId: string): Promise<void> {
  const key = String(boardId);
  const existing = sessions.get(key);
  if (existing) {
    existing.depth += 1;
    console.log(
      `[board-mute] board ${boardId}: nested enter (depth ${existing.depth})`,
    );
    return;
  }

  const previous = await readMuteSettings(boardId);
  const previousMuteState = previous?.mute_state ?? 'NOT_MUTED';
  const previousEnabled = previous?.enabled ?? null;
  let muteApplied = false;

  // Skip if already muted for everyone, or CUSTOM_SETTINGS (can't restore enabled safely).
  if (previousMuteState === 'MUTE_ALL') {
    console.log(
      `[board-mute] board ${boardId}: already MUTE_ALL — holding for run (no restore)`,
    );
  } else if (previousMuteState === 'CUSTOM_SETTINGS') {
    console.log(
      `[board-mute] board ${boardId}: CUSTOM_SETTINGS present — not overriding`,
    );
  } else {
    try {
      await setMuteState(boardId, 'MUTE_ALL');
      muteApplied = true;
      console.log(
        `[board-mute] board ${boardId}: MUTE_ALL applied (was ${previousMuteState})`,
      );
    } catch (err) {
      // Non-admin token / older API — continue without mute.
      muteApplied = false;
      console.warn(
        `[board-mute] board ${boardId}: MUTE_ALL failed — continuing without API mute:`,
        err instanceof Error ? err.message : err,
      );
      console.warn(
        '[board-mute] Manual path: Contacts board → ⋯ → Notifications → Mute for everyone; disable archive notify automations.',
      );
    }
  }

  sessions.set(key, {
    depth: 1,
    previousMuteState,
    previousEnabled,
    muteApplied,
  });
}

async function endBoardMute(boardId: string): Promise<void> {
  const key = String(boardId);
  const session = sessions.get(key);
  if (!session) return;

  session.depth -= 1;
  if (session.depth > 0) {
    console.log(
      `[board-mute] board ${boardId}: nested exit (depth ${session.depth})`,
    );
    return;
  }

  sessions.delete(key);

  if (!session.muteApplied) {
    console.log(
      `[board-mute] board ${boardId}: session end — leave mute as-is (restore skipped)`,
    );
    return;
  }

  try {
    if (session.previousMuteState === 'CUSTOM_SETTINGS') {
      if (session.previousEnabled?.length) {
        await setMuteState(
          boardId,
          'CUSTOM_SETTINGS',
          session.previousEnabled,
        );
      } else {
        await setMuteState(boardId, 'NOT_MUTED');
      }
    } else {
      await setMuteState(boardId, session.previousMuteState);
    }
    console.log(
      `[board-mute] board ${boardId}: restored mute_state=${session.previousMuteState}`,
    );
  } catch (err) {
    // Best-effort restore; leave MUTE_ALL rather than throw after a successful merge.
    console.warn(
      `[board-mute] board ${boardId}: restore failed — leaving MUTE_ALL:`,
      err instanceof Error ? err.message : err,
    );
  }
}

/**
 * Run `fn` with Contacts-board notifications muted when the API token allows.
 * Nested / sequential merges on the same board share one mute window (refcount).
 */
export async function withBoardNotificationsMuted<T>(
  boardId: string,
  fn: () => Promise<T>,
): Promise<T> {
  await beginBoardMute(boardId);
  try {
    return await fn();
  } finally {
    await endBoardMute(boardId);
  }
}
