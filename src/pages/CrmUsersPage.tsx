/**
 * CrmUsersPage.tsx — Manage / invite CRM operators (ADMIN / DEV).
 */

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import PermissionGate from '../components/shared/PermissionGate';
import { useCurrentUser } from '../context/CurrentUserContext';
import { usePermissions } from '../context/PermissionsContext';
import {
  assertCanAssignRoles,
  assertCanDeactivateOperator,
  rolesAssignableByActor,
} from '../permissions/devGuards';
import { showPermissionDenied } from '../permissions/PermissionDeniedToast';
import { CRM_ROLES, type CrmRole } from '../permissions/roles';
import type { CrmOperatorRecord } from '../permissions/types';
import {
  appendAuditEvent,
  inviteOperator,
  listActiveDevEmails,
  listOperators,
  upsertOperator,
} from '../services/crmRbacBoard';

export default function CrmUsersPage() {
  return (
    <PermissionGate permission="users.view">
      <CrmUsersPageInner />
    </PermissionGate>
  );
}

function CrmUsersPageInner() {
  const { user } = useCurrentUser();
  const { roles: actorRoles, hasPermission, refresh } = usePermissions();
  const [operators, setOperators] = useState<CrmOperatorRecord[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRoles, setInviteRoles] = useState<CrmRole[]>(['BASIC']);
  const [inviting, setInviting] = useState(false);

  const load = useCallback(async () => {
    setOperators(await listOperators());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const assignable = rolesAssignableByActor(actorRoles);

  const filtered = operators.filter((op) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      op.email.includes(q) ||
      op.displayName.toLowerCase().includes(q) ||
      op.roles.join(' ').toLowerCase().includes(q)
    );
  });

  async function saveOperator(
    before: CrmOperatorRecord,
    after: CrmOperatorRecord,
  ) {
    if (!hasPermission('users.edit') && !hasPermission('users.assign_roles')) {
      showPermissionDenied();
      return;
    }
    setSaving(after.email);
    setError(null);
    setMessage(null);
    try {
      const activeDevs = await listActiveDevEmails();
      assertCanAssignRoles({
        actorRoles,
        targetRolesBefore: before.roles,
        targetRolesAfter: after.roles,
        activeDevEmails: activeDevs,
        targetEmail: after.email,
        actorEmail: user?.email || '',
      });
      if (before.status !== after.status) {
        assertCanDeactivateOperator({
          actorRoles,
          targetRoles: before.roles,
          targetEmail: after.email,
          activeDevEmails: activeDevs,
        });
      }
      await upsertOperator(after);

      const added = after.roles.filter((r) => !before.roles.includes(r));
      const removed = before.roles.filter((r) => !after.roles.includes(r));
      for (const role of added) {
        await appendAuditEvent({
          actorEmail: user?.email || 'unknown',
          actorName: user?.name,
          action: role === 'DEV' ? 'DEV_GRANTED' : 'ROLE_ASSIGNED',
          targetType: 'operator',
          targetEmail: after.email,
          before: before.roles,
          after: after.roles,
        });
      }
      for (const role of removed) {
        await appendAuditEvent({
          actorEmail: user?.email || 'unknown',
          actorName: user?.name,
          action: role === 'DEV' ? 'DEV_REVOKED' : 'ROLE_REMOVED',
          targetType: 'operator',
          targetEmail: after.email,
          before: before.roles,
          after: after.roles,
        });
      }
      if (before.status !== after.status) {
        await appendAuditEvent({
          actorEmail: user?.email || 'unknown',
          actorName: user?.name,
          action:
            after.status === 'active' ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
          targetType: 'operator',
          targetEmail: after.email,
          before: before.status,
          after: after.status,
        });
      }
      // Optimistic local update so the tag click feels instant.
      setOperators((prev) =>
        prev.map((op) => (op.email === after.email ? after : op)),
      );
      await load();
      // Only reload own session permissions when editing yourself.
      const self = user?.email?.trim().toLowerCase();
      if (self && after.email === self) {
        await refresh();
      }
    } catch (err) {
      const text =
        err instanceof Error
          ? err.message
          : 'Permission denied. Reach out to the developer.';
      setError(text);
      showPermissionDenied(text);
      await load();
    } finally {
      setSaving(null);
    }
  }

  async function handleInvite(event: FormEvent) {
    event.preventDefault();
    if (!hasPermission('users.create')) {
      showPermissionDenied();
      return;
    }
    const email = inviteEmail.trim().toLowerCase();
    if (!email.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    setInviting(true);
    setError(null);
    setMessage(null);
    try {
      const roles = inviteRoles.length ? inviteRoles : (['BASIC'] as CrmRole[]);
      const activeDevs = await listActiveDevEmails();
      assertCanAssignRoles({
        actorRoles,
        targetRolesBefore: [],
        targetRolesAfter: roles,
        activeDevEmails: activeDevs,
        targetEmail: email,
        actorEmail: user?.email || '',
      });
      if (roles.includes('DEV')) {
        const ok = window.confirm(
          'Grant DEV to this new user? This is highly privileged.',
        );
        if (!ok) {
          setInviting(false);
          return;
        }
      }
      const created = await inviteOperator({
        email,
        displayName: inviteName.trim() || email.split('@')[0] || email,
        roles,
      });
      await appendAuditEvent({
        actorEmail: user?.email || 'unknown',
        actorName: user?.name,
        action: 'USER_CREATED',
        targetType: 'operator',
        targetEmail: created.email,
        after: created,
      });
      setMessage(
        `Added ${created.email}. They can use CRM once they are also on the Monday Project allowlist.`,
      );
      setInviteEmail('');
      setInviteName('');
      setInviteRoles(['BASIC']);
      setInviteOpen(false);
      await load();
    } catch (err) {
      const text =
        err instanceof Error
          ? err.message
          : 'Permission denied. Reach out to the developer.';
      setError(text);
      showPermissionDenied(text);
    } finally {
      setInviting(false);
    }
  }

  function toggleInviteRole(role: CrmRole) {
    if (!assignable.includes(role)) return;
    setInviteRoles((prev) => {
      if (prev.includes(role)) {
        const next = prev.filter((r) => r !== role);
        return next.length ? next : (['BASIC'] as CrmRole[]);
      }
      return [...prev, role];
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto pb-10">
        <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-crm-heading">Users</h2>
          <p className="mt-1 text-sm text-crm-slate">
            Invite operators and assign CRM role tags. Settings stay
            developer-only.
          </p>
        </div>
        {hasPermission('users.create') && (
          <button
            type="button"
            onClick={() => setInviteOpen((open) => !open)}
            className="rounded-xl bg-crm-indigo px-4 py-2 text-sm font-medium text-white hover:bg-crm-indigo-dark"
          >
            {inviteOpen ? 'Cancel' : 'Add / invite user'}
          </button>
        )}
      </header>

      {inviteOpen && hasPermission('users.create') && (
        <form
          onSubmit={(e) => void handleInvite(e)}
          className="space-y-4 rounded-2xl border border-crm-taupe/20 bg-crm-surface p-4"
        >
          <h3 className="text-sm font-semibold uppercase tracking-wide text-crm-slate">
            Invite operator
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm text-crm-heading">
              Email
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="name@i58global.org"
                className="mt-1 w-full rounded-xl border border-crm-taupe/30 bg-crm-white px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm text-crm-heading">
              Display name
              <input
                type="text"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Optional"
                className="mt-1 w-full rounded-xl border border-crm-taupe/30 bg-crm-white px-3 py-2 text-sm"
              />
            </label>
          </div>
          <div>
            <p className="text-sm text-crm-heading">Roles</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {CRM_ROLES.map((role) => {
                const checked = inviteRoles.includes(role);
                const canToggle = assignable.includes(role);
                return (
                  <label
                    key={role}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
                      canToggle
                        ? 'cursor-pointer border-crm-taupe/30 bg-crm-white'
                        : 'cursor-not-allowed border-crm-taupe/15 bg-crm-taupe-50 text-crm-slate'
                    } ${role === 'DEV' ? 'ring-1 ring-amber-300/80' : ''}`}
                  >
                    <input
                      type="checkbox"
                      disabled={!canToggle || inviting}
                      checked={checked}
                      onChange={() => toggleInviteRole(role)}
                    />
                    {role}
                  </label>
                );
              })}
            </div>
          </div>
          <p className="text-xs text-crm-slate">
            This creates their CRM roles on Portal Things. Opening Monday
            Project in production also requires the Monday Project email
            allowlist.
          </p>
          <button
            type="submit"
            disabled={inviting}
            className="rounded-xl bg-crm-indigo px-4 py-2 text-sm font-medium text-white hover:bg-crm-indigo-dark disabled:opacity-60"
          >
            {inviting ? 'Adding…' : 'Add user'}
          </button>
        </form>
      )}

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name, email, or role"
        className="w-full rounded-xl border border-crm-taupe/30 bg-crm-white px-3 py-2 text-sm"
      />

      {error && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {error}
        </p>
      )}
      {message && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
          {message}
        </p>
      )}

      <ul className="space-y-3">
        {filtered.map((op) => (
          <li
            key={op.email}
            className="rounded-2xl border border-crm-taupe/20 bg-crm-surface p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-crm-heading">{op.displayName}</p>
                <p className="text-sm text-crm-slate">{op.email}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-crm-slate">
                  {op.status}
                </p>
              </div>
              {hasPermission('users.deactivate') && (
                <button
                  type="button"
                  disabled={saving === op.email}
                  onClick={() =>
                    void saveOperator(op, {
                      ...op,
                      status: op.status === 'active' ? 'inactive' : 'active',
                    })
                  }
                  className="rounded-lg border border-crm-taupe/30 px-3 py-1.5 text-xs text-crm-heading hover:bg-crm-taupe-50"
                >
                  {op.status === 'active' ? 'Deactivate' : 'Activate'}
                </button>
              )}
            </div>

            {hasPermission('users.assign_roles') && (
              <div className="mt-3 flex flex-wrap gap-2">
                {CRM_ROLES.map((role) => {
                  const checked = op.roles.includes(role);
                  const canToggle = assignable.includes(role);
                  return (
                    <label
                      key={role}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
                        canToggle
                          ? 'cursor-pointer border-crm-taupe/30 bg-crm-white'
                          : 'cursor-not-allowed border-crm-taupe/15 bg-crm-taupe-50 text-crm-slate'
                      } ${role === 'DEV' ? 'ring-1 ring-amber-300/80' : ''}`}
                    >
                      <input
                        type="checkbox"
                        disabled={!canToggle || saving === op.email}
                        checked={checked}
                        onChange={(e) => {
                          if (role === 'DEV' && e.target.checked) {
                            const ok = window.confirm(
                              'Grant DEV? This is highly privileged and cannot be managed by ADMIN.',
                            );
                            if (!ok) return;
                          }
                          if (role === 'DEV' && !e.target.checked) {
                            const ok = window.confirm(
                              'Remove DEV from this operator?',
                            );
                            if (!ok) return;
                          }
                          const nextRoles = (
                            e.target.checked
                              ? [...op.roles, role]
                              : op.roles.filter((r) => r !== role)
                          ) as CrmRole[];
                          void saveOperator(op, { ...op, roles: nextRoles });
                        }}
                      />
                      {role}
                    </label>
                  );
                })}
              </div>
            )}
          </li>
        ))}
      </ul>
        </div>
      </div>
    </div>
  );
}
