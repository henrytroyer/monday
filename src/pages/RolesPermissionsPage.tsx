/**
 * RolesPermissionsPage.tsx — DEV role matrix + section visibility overrides.
 */

import { Fragment, useEffect, useMemo, useState } from 'react';
import CrmPageLoading from '../components/shared/CrmPageLoading';
import PermissionGate from '../components/shared/PermissionGate';
import { useCurrentUser } from '../context/useCurrentUser';
import { usePermissions } from '../context/usePermissions';
import { DEFAULT_ROLE_PERMISSIONS } from '../permissions/defaults';
import {
  PERMISSION_CATEGORIES,
  type PermissionKey,
} from '../permissions/permissionKeys';
import { showPermissionDenied } from '../permissions/PermissionDeniedToast';
import { CRM_ROLES, type CrmRole } from '../permissions/roles';
import {
  SECTION_AREAS,
  SECTION_BY_ID,
  SECTION_CATALOG,
  VISIBILITY_DOMAIN_META,
  VISIBILITY_DOMAINS,
  type SectionId,
  type SectionVisibilityOverrides,
  type VisibilityDomain,
} from '../permissions/sectionCatalog';
import type { RolePermissionsPayload } from '../permissions/types';
import {
  appendAuditEvent,
  loadRolePermissionsPayload,
  saveRolePermissionsPayload,
} from '../services/crmRbacBoard';

type TabId = 'roles' | 'visibility';

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
  const [tab, setTab] = useState<TabId>('roles');
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

  const sectionRows = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return SECTION_CATALOG.filter(
      (s) =>
        !q ||
        s.id.includes(q) ||
        s.label.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.area.includes(q) ||
        s.domain.includes(q) ||
        VISIBILITY_DOMAIN_META[s.domain].label.toLowerCase().includes(q),
    );
  }, [filter]);

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

  function setSectionDomain(sectionId: SectionId, domain: VisibilityDomain) {
    setPayload((prev) => {
      if (!prev) return prev;
      const defaults = SECTION_BY_ID[sectionId].domain;
      const nextOverrides: SectionVisibilityOverrides = {
        ...(prev.sectionVisibilityOverrides ?? {}),
      };
      if (domain === defaults) {
        delete nextOverrides[sectionId];
      } else {
        nextOverrides[sectionId] = domain;
      }
      return {
        ...prev,
        sectionVisibilityOverrides: nextOverrides,
      };
    });
  }

  function resetSection(sectionId: SectionId) {
    setSectionDomain(sectionId, SECTION_BY_ID[sectionId].domain);
  }

  async function handleSave() {
    if (!payload) return;
    const ok = window.confirm(
      tab === 'visibility'
        ? 'Save section visibility changes? This affects which CRM surfaces each permission unlocks.'
        : 'Save role permission changes? This affects all CRM operators.',
    );
    if (!ok) return;
    setSaving(true);
    setMessage(null);
    try {
      const before = await loadRolePermissionsPayload();
      await saveRolePermissionsPayload(payload);
      if (tab === 'visibility') {
        await appendAuditEvent({
          actorEmail: user?.email || 'unknown',
          actorName: user?.name,
          action: 'SECTION_VISIBILITY_UPDATED',
          targetType: 'section',
          before: before.sectionVisibilityOverrides ?? {},
          after: payload.sectionVisibilityOverrides ?? {},
        });
        setMessage('Section visibility saved.');
      } else {
        await appendAuditEvent({
          actorEmail: user?.email || 'unknown',
          actorName: user?.name,
          action: 'PERMISSION_UPDATED',
          targetType: 'role',
          before: before.rolePermissions,
          after: payload.rolePermissions,
        });
        setMessage('Permissions saved.');
      }
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
      <CrmPageLoading
        label="i58 Volunteer portal · Roles & permissions"
        className="min-h-[280px] py-10"
      />
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
            Roles decide who. Visibility assigns each CRM surface to a domain
            (HR, Finance, …). Domain view means full access.
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

      <div className="flex flex-wrap gap-2">
        <TabButton
          active={tab === 'roles'}
          onClick={() => setTab('roles')}
          label="Role matrix"
        />
        <TabButton
          active={tab === 'visibility'}
          onClick={() => setTab('visibility')}
          label="Section visibility"
        />
      </div>

      <input
        type="search"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder={
          tab === 'visibility' ? 'Filter sections' : 'Filter permissions'
        }
        className="w-full max-w-md rounded-xl border border-crm-taupe/30 bg-crm-white px-3 py-2 text-sm"
      />

      {message && (
        <p className="text-sm text-crm-heading">{message}</p>
      )}

      {tab === 'roles' ? (
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
      ) : (
        <VisibilityTable
          rows={sectionRows}
          overrides={payload.sectionVisibilityOverrides ?? {}}
          onChange={setSectionDomain}
          onReset={resetSection}
        />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
        active
          ? 'bg-crm-indigo text-white'
          : 'border border-crm-taupe/25 bg-crm-white text-crm-heading hover:bg-crm-taupe-50'
      }`}
    >
      {label}
    </button>
  );
}

function VisibilityTable({
  rows,
  overrides,
  onChange,
  onReset,
}: {
  rows: typeof SECTION_CATALOG;
  overrides: SectionVisibilityOverrides;
  onChange: (id: SectionId, domain: VisibilityDomain) => void;
  onReset: (id: SectionId) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-crm-slate">
        Assign each surface to a domain. Anyone who can view that domain has
        full access to it (no separate edit / upload / delete picks).
      </p>
      <div className="overflow-auto rounded-2xl border border-crm-taupe/20">
        <table className="min-w-full border-collapse text-left text-xs">
          <thead className="bg-crm-taupe-50 text-crm-slate">
            <tr>
              <th className="px-3 py-2 font-medium">Section</th>
              <th className="px-3 py-2 font-medium">Domain</th>
              <th className="px-3 py-2 font-medium">Default</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {SECTION_AREAS.map((area) => {
              const areaRows = rows.filter((r) => r.area === area);
              if (areaRows.length === 0) return null;
              return (
                <Fragment key={area}>
                  <tr className="bg-crm-white">
                    <td
                      colSpan={4}
                      className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-crm-slate"
                    >
                      {area}
                    </td>
                  </tr>
                  {areaRows.map((section) => {
                    const current = overrides[section.id] ?? section.domain;
                    const isOverride = Boolean(overrides[section.id]);
                    return (
                      <tr
                        key={section.id}
                        className="border-t border-crm-taupe/15"
                      >
                        <td className="px-3 py-2">
                          <div className="font-medium text-crm-heading">
                            {section.label}
                          </div>
                          <div className="text-[11px] text-crm-slate">
                            {section.description}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={current}
                            onChange={(e) =>
                              onChange(
                                section.id,
                                e.target.value as VisibilityDomain,
                              )
                            }
                            className="rounded-lg border border-crm-taupe/30 bg-crm-white px-2 py-1.5 text-xs"
                          >
                            {VISIBILITY_DOMAINS.map((domain) => (
                              <option key={domain} value={domain}>
                                {VISIBILITY_DOMAIN_META[domain].label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2 text-crm-slate">
                          {VISIBILITY_DOMAIN_META[section.domain].label}
                          {isOverride ? (
                            <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                              overridden
                            </span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2">
                          {isOverride ? (
                            <button
                              type="button"
                              onClick={() => onReset(section.id)}
                              className="text-xs font-medium text-crm-indigo hover:underline"
                            >
                              Reset
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </Fragment>
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
