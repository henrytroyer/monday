/**
 * RolesPermissionsPage.tsx — DEV-only role permission matrix.
 */

import { useEffect, useMemo, useState } from 'react';
import PermissionGate from '../components/shared/PermissionGate';
import { useCurrentUser } from '../context/CurrentUserContext';
import { usePermissions } from '../context/PermissionsContext';
import { DEFAULT_ROLE_PERMISSIONS } from '../permissions/defaults';
import {
  PERMISSION_CATEGORIES,
  type PermissionKey,
} from '../permissions/permissionKeys';
import { showPermissionDenied } from '../permissions/PermissionDeniedToast';
import { CRM_ROLES, type CrmRole } from '../permissions/roles';
import type { RolePermissionsPayload } from '../permissions/types';
import {
  appendAuditEvent,
  loadRolePermissionsPayload,
  saveRolePermissionsPayload,
} from '../services/crmRbacBoard';

export default function RolesPermissionsPage() {
  return (
    <PermissionGate permission="settings.permissions.manage">
      <RolesPermissionsInner />
    </PermissionGate>
  );
}

function RolesPermissionsInner() {
  const { user } = useCurrentUser();
  const { refresh } = usePermissions();
  const [payload, setPayload] = useState<RolePermissionsPayload | null>(null);
  const [filter, setFilter] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void loadRolePermissionsPayload().then(setPayload);
  }, []);

  const rows = useMemo(() => {
    if (!payload) return [];
    const q = filter.trim().toLowerCase();
    return payload.permissions.filter(
      (p) =>
        !q ||
        p.key.includes(q) ||
        p.displayName.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.includes(q),
    );
  }, [payload, filter]);

  function toggle(role: CrmRole, key: PermissionKey) {
    if (!payload || role === 'DEV') return;
    setPayload((prev) => {
      if (!prev) return prev;
      const current = new Set(prev.rolePermissions[role] ?? []);
      if (current.has(key)) current.delete(key);
      else current.add(key);
      return {
        ...prev,
        rolePermissions: {
          ...prev.rolePermissions,
          [role]: [...current] as PermissionKey[],
          DEV: [...DEFAULT_ROLE_PERMISSIONS.DEV],
        },
      };
    });
  }

  async function handleSave() {
    if (!payload) return;
    const ok = window.confirm(
      'Save role permission changes? This affects all CRM operators.',
    );
    if (!ok) return;
    setSaving(true);
    setMessage(null);
    try {
      const before = await loadRolePermissionsPayload();
      await saveRolePermissionsPayload(payload);
      await appendAuditEvent({
        actorEmail: user?.email || 'unknown',
        actorName: user?.name,
        action: 'PERMISSION_UPDATED',
        targetType: 'role',
        before: before.rolePermissions,
        after: payload.rolePermissions,
      });
      setMessage('Permissions saved.');
      await refresh();
    } catch (err) {
      const text =
        err instanceof Error
          ? err.message
          : 'Permission denied. Reach out to the developer.';
      setMessage(text);
      showPermissionDenied(text);
    } finally {
      setSaving(false);
    }
  }

  if (!payload) {
    return (
      <div className="p-8 text-sm text-crm-slate">Loading permissions…</div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-crm-heading">
            Roles & permissions
          </h2>
          <p className="mt-1 text-sm text-crm-slate">
            DEV always retains every permission. ADMIN cannot access this page.
          </p>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSave()}
          className="rounded-xl bg-crm-indigo px-4 py-2 text-sm font-medium text-white hover:bg-crm-indigo-dark disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </header>

      <input
        type="search"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter permissions"
        className="w-full max-w-md rounded-xl border border-crm-taupe/30 bg-crm-white px-3 py-2 text-sm"
      />

      {message && (
        <p className="text-sm text-crm-heading">{message}</p>
      )}

      <div className="overflow-auto rounded-2xl border border-crm-taupe/20">
        <table className="min-w-full border-collapse text-left text-xs">
          <thead className="bg-crm-taupe-50 text-crm-slate">
            <tr>
              <th className="sticky left-0 bg-crm-taupe-50 px-3 py-2 font-medium">
                Permission
              </th>
              {CRM_ROLES.map((role) => (
                <th key={role} className="px-2 py-2 text-center font-medium">
                  {role}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_CATEGORIES.map((category) => {
              const catRows = rows.filter((r) => r.category === category);
              if (catRows.length === 0) return null;
              return (
                <FragmentCategory
                  key={category}
                  category={category}
                  rows={catRows}
                  payload={payload}
                  onToggle={toggle}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FragmentCategory({
  category,
  rows,
  payload,
  onToggle,
}: {
  category: string;
  rows: RolePermissionsPayload['permissions'];
  payload: RolePermissionsPayload;
  onToggle: (role: CrmRole, key: PermissionKey) => void;
}) {
  return (
    <>
      <tr className="bg-crm-white">
        <td
          colSpan={CRM_ROLES.length + 1}
          className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-crm-slate"
        >
          {category}
        </td>
      </tr>
      {rows.map((perm) => (
        <tr key={perm.key} className="border-t border-crm-taupe/15">
          <td className="sticky left-0 bg-crm-surface px-3 py-2">
            <div className="font-medium text-crm-heading">{perm.displayName}</div>
            <div className="text-[11px] text-crm-slate">{perm.key}</div>
            <div className="text-[11px] text-crm-slate">{perm.description}</div>
          </td>
          {CRM_ROLES.map((role) => {
            const checked =
              role === 'DEV' ||
              (payload.rolePermissions[role] ?? []).includes(perm.key);
            return (
              <td key={role} className="px-2 py-2 text-center">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={role === 'DEV'}
                  onChange={() => onToggle(role, perm.key)}
                />
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
