/**
 * crmRbacAcl.mjs — CRM mutation ACL stub (RBAC removed; always allow writes).
 */

function stripGraphqlComments(query) {
  return String(query || '')
    .replace(/#[^\n\r]*/g, ' ')
    .replace(/"""[\s\S]*?"""/g, ' ')
    .replace(/"([^"\\]|\\.)*"/g, ' ');
}

export function isGraphqlMutation(query) {
  return /\bmutation\b/i.test(stripGraphqlComments(query));
}

/**
 * No-op — CRM RBAC removed; local proxy does not block mutations.
 * @param {(query: string, variables?: Record<string, unknown>) => Promise<any>} _mondayGraphql
 * @param {string | undefined} _boardId
 * @param {string | undefined} _email
 */
export async function assertOperatorMayMutate(
  _mondayGraphql,
  _boardId,
  _email,
) {
  // open access
}

export function permissionDeniedBody() {
  return {
    error: 'Permission denied. Reach out to the developer.',
    code: 'CRM_PERMISSION_DENIED',
  };
}
